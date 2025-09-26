from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from bson import ObjectId

from app.database.connection import db
from app.auth.models import User, UserRole, UserCreate, UserLogin, TokenData
from app.auth.session_service import SessionService
from app.config import JWT_SECRET, ALGORITHM

SECRET_KEY = JWT_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES = 720

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication service class."""

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def verify_token(token: str) -> TokenData:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            phone: str = payload.get("sub")
            role: str = payload.get("role")
            if phone is None:
                raise HTTPException(status_code=401, detail="Could not validate credentials")
            return TokenData(phone=phone, role=role)
        except JWTError:
            raise HTTPException(status_code=401, detail="Could not validate credentials")

    @staticmethod
    async def get_user_by_phone(phone: str) -> Optional[User]:
        user_data = await db.users.find_one({"phone": phone})
        if user_data:
            # Ensure _id is converted to string for the User model
            user_data["_id"] = str(user_data["_id"])
            # Ensure first_login field exists
            if "first_login" not in user_data:
                user_data["first_login"] = True
            return User(**user_data)
        return None

    @staticmethod
    async def create_user(user: UserCreate) -> User:
        print(f"=== Create User Service ===")
        print(f"Input user: {user}")
        print(f"User role: {user.role}")
        print(f"User role type: {type(user.role)}")
        print(f"===========================")
        
        existing_user = await AuthService.get_user_by_phone(user.phone)
        if existing_user:
            raise HTTPException(status_code=400, detail="Phone number already registered")

        hashed_password = AuthService.get_password_hash(user.password)
        user_dict = {
            "name": user.name,
            "phone": user.phone,
            "password_hash": hashed_password,
            "role": user.role,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        print(f"=== User Dict ===")
        print(f"User dict: {user_dict}")
        print(f"===========================")

        result = await db.users.insert_one(user_dict)
        user_dict["_id"] = str(result.inserted_id)
        return User(**user_dict)

    @staticmethod
    async def authenticate_user(phone: str, password: str, role: UserRole) -> Optional[User]:
        if role == UserRole.CUSTOMER:
            # For customers, check in customers collection
            customer = await db.customers.find_one({"phone": phone, "is_active": True})
            if not customer:
                return None
            
            # Verify password if customer has one
            if customer.get("password_hash"):
                if not AuthService.verify_password(password, customer["password_hash"]):
                    return None
            
            # Create a User object from customer data for compatibility
            user_data = {
                "_id": str(customer["_id"]),
                "name": customer["name"],
                "phone": customer["phone"],
                "password_hash": customer.get("password_hash"),
                "role": UserRole.CUSTOMER,
                "is_active": customer.get("is_active", True),
                "first_login": customer.get("first_login", True),
                "created_at": customer.get("created_at"),
                "updated_at": customer.get("updated_at")
            }
            return User(**user_data)
        else:
            # For admin users, use the original logic
            user = await AuthService.get_user_by_phone(phone)
            if not user:
                return None
            if not AuthService.verify_password(password, user.password_hash):
                return None
            if user.role != role:
                return None
            if not user.is_active:
                return None
            return user

    @staticmethod
    async def login_user(user_login: UserLogin) -> dict:
        user = await AuthService.authenticate_user(user_login.phone, user_login.password, user_login.role)
        if not user:
            raise HTTPException(status_code=401, detail="Incorrect phone number, password, or role")

        # Create JWT token
        access_token = AuthService.create_access_token(
            data={"sub": user.phone, "role": user.role.value}
        )
        
        # Create session in database
        session = await SessionService.create_session(user, access_token)
        
        # Ensure user object has id field for frontend
        user_dict = user.dict()
        user_dict["id"] = str(user.id) if user.id else None
        user_dict["first_login"] = user.first_login if hasattr(user, 'first_login') else True
        
        # Remove password_hash from response
        if "password_hash" in user_dict:
            del user_dict["password_hash"]
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "session_id": session.id,
            "user": user_dict,
            "expires_at": session.expires_at.isoformat()
        }

    @staticmethod
    async def logout_user(session_id: str) -> bool:
        """Logout user by deactivating their session."""
        return await SessionService.deactivate_session(session_id)

    @staticmethod
    async def refresh_user_session(session_id: str) -> Optional[dict]:
        """Refresh user session."""
        session = await SessionService.refresh_session(session_id)
        if not session:
            return None
        
        # Get updated user data
        user_data = await db.users.find_one({"_id": ObjectId(session.user_id)})
        if not user_data:
            return None
        
        user_data["_id"] = str(user_data["_id"])
        user_data["id"] = user_data["_id"]
        
        return {
            "session_id": session.id,
            "user": user_data,
            "expires_at": session.expires_at.isoformat(),
            "token": session.token
        }

    @staticmethod
    async def validate_session(session_id: str) -> Optional[dict]:
        """Validate if a session is still active and valid."""
        session = await SessionService.get_session_by_id(session_id)
        if not session or not session.is_active or session.expires_at < datetime.utcnow():
            return None
        
        # Update last used timestamp
        await SessionService.update_session_last_used(session_id)
        
        # Get user data
        user_data = await db.users.find_one({"_id": ObjectId(session.user_id)})
        if not user_data:
            return None
        
        user_data["_id"] = str(user_data["_id"])
        user_data["id"] = user_data["_id"]
        
        return {
            "session_id": session.id,
            "user": user_data,
            "expires_at": session.expires_at.isoformat(),
            "token": session.token
        }

    @staticmethod
    async def update_password(phone: str, new_password: str) -> bool:
        user = await AuthService.get_user_by_phone(phone)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        hashed_password = AuthService.get_password_hash(new_password)
        result = await db.users.update_one(
            {"phone": phone},
            {"$set": {"password_hash": hashed_password, "first_login": False, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count == 1

    @staticmethod
    async def create_admin_user() -> User:
        admin_phone = "1234567890"
        existing_admin = await AuthService.get_user_by_phone(admin_phone)

        if not existing_admin:
            admin_user = UserCreate(
                name="المدير",
                phone=admin_phone,
                password="admin123",
                role=UserRole.ADMIN
            )
            return await AuthService.create_user(admin_user)

        return existing_admin

    @staticmethod
    async def check_customer_exists(phone: str) -> dict:
        """Check if customer exists and return customer info."""
        # Search in customers collection instead of users
        customer = await db.customers.find_one({"phone": phone, "is_active": True})
        if customer:
            return {
                "exists": True,
                "customer_name": customer["name"],
                "phone": customer["phone"],
                "has_password": bool(customer.get("password_hash")),
                "first_login": customer.get("first_login", True)
            }
        return {
            "exists": False,
            "customer_name": None,
            "phone": phone,
            "has_password": False,
            "first_login": True
        }

    @staticmethod
    async def set_customer_password(phone: str, password: str) -> dict:
        """Set password for existing customer or create new customer."""
        # Check if customer exists in customers collection
        customer = await db.customers.find_one({"phone": phone, "is_active": True})
        
        if customer:
            # Hash the password and update customer
            hashed_password = AuthService.get_password_hash(password)
            result = await db.customers.update_one(
                {"phone": phone},
                {"$set": {
                    "password_hash": hashed_password,
                    "first_login": False, 
                    "updated_at": datetime.utcnow()
                }}
            )
            if result.modified_count == 1:
                return {
                    "success": True,
                    "customer_name": customer["name"],
                    "first_login": False
                }
            return {"success": False}
        else:
            # Customer doesn't exist - this shouldn't happen if check_customer_exists works correctly
            return {
                "success": False,
                "error": "Customer not found in customers collection"
            }

    @staticmethod
    async def set_customer_password_by_id(customer_id: str, password: str) -> dict:
        """Set password for customer by ID."""
        try:
            # Check if customer exists in customers collection
            customer = await db.customers.find_one({"_id": ObjectId(customer_id), "is_active": True})
            
            if customer:
                # Hash the password and update customer
                hashed_password = AuthService.get_password_hash(password)
                result = await db.customers.update_one(
                    {"_id": ObjectId(customer_id)},
                    {"$set": {
                        "password_hash": hashed_password,
                        "first_login": False, 
                        "updated_at": datetime.utcnow()
                    }}
                )
                if result.modified_count == 1:
                    return {
                        "success": True,
                        "customer_name": customer["name"],
                        "first_login": False
                    }
                return {"success": False, "error": "Failed to update password"}
            else:
                return {
                    "success": False,
                    "error": "Customer not found"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
