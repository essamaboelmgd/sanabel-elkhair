from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.service import AuthService
from app.auth.models import UserRole
from app.auth.session_service import SessionService
from app.database.connection import db
from datetime import datetime
from bson import ObjectId

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get current user from session token."""
    token = credentials.credentials
    
    # Get session from database
    session = await SessionService.get_session_by_token(token)
    if not session or not session.is_active or session.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last used timestamp
    await SessionService.update_session_last_used(session.id)
    
    # Get user data from database - check both collections based on role
    print(f"Debug - get_current_user: session.role = {session.role}")
    print(f"Debug - get_current_user: session.user_id = {session.user_id}")
    
    user_data = None
    if session.role == UserRole.CUSTOMER:
        # For customers, get data from customers collection
        print(f"Debug - Searching in customers collection")
        user_data = await db.customers.find_one({"_id": ObjectId(session.user_id), "is_active": True})
        print(f"Debug - Customer data found: {user_data}")
        if user_data:
            # Add role field for customers
            user_data["role"] = UserRole.CUSTOMER.value
            print(f"Debug - Added role to customer data: {user_data['role']}")
    else:
        # For admin users, get data from users collection
        print(f"Debug - Searching in users collection")
        user_data = await db.users.find_one({"_id": ObjectId(session.user_id), "is_active": True})
        print(f"Debug - User data found: {user_data}")
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Ensure id field exists for frontend compatibility
    user_data["_id"] = str(user_data["_id"])
    user_data["id"] = user_data["_id"]
    
    return user_data

async def get_current_admin(current_user=Depends(get_current_user)):
    """Get current admin user."""
    role_value = current_user.get("role")
    if not role_value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No role found"
        )
    
    # Check if role is already a UserRole enum
    if isinstance(role_value, UserRole):
        user_role = role_value
    # Check if role is a string
    elif isinstance(role_value, str):
        try:
            user_role = UserRole(role_value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role format: {role_value}"
            )
    # Check if role has a 'value' attribute
    elif hasattr(role_value, 'value'):
        try:
            user_role = UserRole(role_value.value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role value: {role_value.value}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role format: {role_value}"
        )
    
    if user_role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return current_user

async def get_current_customer(current_user=Depends(get_current_user)):
    """Get current customer user."""
    print(f"Debug - get_current_customer called")
    print(f"Debug - current_user: {current_user}")
    print(f"Debug - current_user type: {type(current_user)}")
    
    role_value = current_user.get("role")
    print(f"Debug - role_value: {role_value}")
    print(f"Debug - role_value type: {type(role_value)}")
    
    if not role_value:
        print(f"Debug - No role found in current_user")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No role found"
        )
    
    # Check if role is already a UserRole enum
    if isinstance(role_value, UserRole):
        user_role = role_value
    # Check if role is a string
    elif isinstance(role_value, str):
        try:
            user_role = UserRole(role_value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role format: {role_value}"
            )
    # Check if role has a 'value' attribute
    elif hasattr(role_value, 'value'):
        try:
            user_role = UserRole(role_value.value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role value: {role_value.value}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role format: {role_value}"
        )
    
    if user_role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return current_user


async def get_current_staff(current_user=Depends(get_current_user)):
    """Allow admin or cashier roles."""
    role_value = current_user.get("role")
    if not role_value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No role found"
        )

    # Normalize role to UserRole
    if isinstance(role_value, UserRole):
        user_role = role_value
    elif isinstance(role_value, str):
        try:
            user_role = UserRole(role_value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role format: {role_value}"
            )
    elif hasattr(role_value, 'value'):
        try:
            user_role = UserRole(role_value.value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role value: {role_value.value}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role format: {role_value}"
        )

    if user_role not in (UserRole.ADMIN, UserRole.CASHIER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return current_user
