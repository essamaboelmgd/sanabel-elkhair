from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.service import AuthService
from app.auth.models import UserCreate, UserLogin
from app.auth.schemas import CustomerPasswordSet, CustomerPasswordSetById
from app.auth.dependencies import get_current_user, get_current_admin, get_current_customer
from app.auth.session_service import SessionService

router = APIRouter(tags=["authentication"])

security = HTTPBearer()

@router.post("/register")
async def register(user: UserCreate):
    """Register a new user."""
    try:
        print(f"=== Register Request ===")
        print(f"User data: {user}")
        print(f"User role: {user.role}")
        print(f"User role type: {type(user.role)}")
        print(f"=========================")
        
        created_user = await AuthService.create_user(user)
        print(f"=== Register Success ===")
        print(f"Created user: {created_user}")
        print(f"=========================")
        
        return {"message": "User registered successfully", "user": created_user}
    except HTTPException as e:
        print(f"=== Register HTTP Error ===")
        print(f"Error: {e}")
        print(f"=========================")
        raise e
    except Exception as e:
        print(f"=== Register Exception ===")
        print(f"Error: {e}")
        print(f"Error type: {type(e)}")
        print(f"=========================")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(user_login: UserLogin):
    """Login user and create session."""
    try:
        result = await AuthService.login_user(user_login)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout user by deactivating their session."""
    try:
        # Extract session ID from token (you might need to modify this based on your token structure)
        # For now, we'll use the token itself as session identifier
        token = credentials.credentials
        
        # Find session by token and deactivate it
        session = await SessionService.get_session_by_token(token)
        if session:
            await SessionService.deactivate_session(session.id)
            return {"message": "Logged out successfully"}
        else:
            return {"message": "Session not found or already inactive"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh")
async def refresh_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Refresh user session."""
    try:
        token = credentials.credentials
        session = await SessionService.get_session_by_token(token)
        
        if not session:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        refreshed_session = await AuthService.refresh_user_session(session.id)
        if not refreshed_session:
            raise HTTPException(status_code=401, detail="Failed to refresh session")
        
        return refreshed_session
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/validate")
async def validate_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate if current session is still active."""
    try:
        token = credentials.credentials
        session = await SessionService.get_session_by_token(token)
        
        if not session:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        validated_session = await AuthService.validate_session(session.id)
        if not validated_session:
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        
        return validated_session
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me")
async def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current user information."""
    return current_user

@router.get("/sessions/active")
async def get_active_sessions(current_user=Depends(get_current_user)):
    """Get active sessions for current user."""
    try:
        from app.auth.session_service import SessionService
        sessions = await SessionService.get_user_active_sessions(current_user["id"])
        return {
            "user_id": current_user["id"],
            "role": current_user["role"],
            "active_sessions_count": len(sessions),
            "sessions": [
                {
                    "id": session.id,
                    "created_at": session.created_at.isoformat(),
                    "last_used": session.last_used.isoformat(),
                    "expires_at": session.expires_at.isoformat(),
                    "is_active": session.is_active
                }
                for session in sessions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def deactivate_session(session_id: str, current_user=Depends(get_current_user)):
    """Deactivate a specific session for current user."""
    try:
        from app.auth.session_service import SessionService
        
        # Get the session to verify it belongs to current user
        session = await SessionService.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session.user_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to deactivate this session")
        
        # Deactivate the session
        success = await SessionService.deactivate_session(session_id)
        if success:
            return {"message": "Session deactivated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to deactivate session")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-customer")
async def check_customer_exists(phone: str):
    """Check if customer exists."""
    try:
        result = await AuthService.check_customer_exists(phone)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/set-customer-password")
async def set_customer_password(customer_data: CustomerPasswordSet):
    """Set password for customer."""
    try:
        result = await AuthService.set_customer_password(customer_data.phone, customer_data.password)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/set-customer-password-by-id")
async def set_customer_password_by_id(customer_data: CustomerPasswordSetById, current_admin=Depends(get_current_admin)):
    """Set password for customer by ID (Admin only)."""
    try:
        result = await AuthService.set_customer_password_by_id(customer_data.customer_id, customer_data.password)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-password")
async def update_password(phone: str, new_password: str, current_user=Depends(get_current_user)):
    """Update user password."""
    try:
        # Ensure user can only update their own password
        if current_user["phone"] != phone:
            raise HTTPException(status_code=403, detail="Can only update own password")
        
        result = await AuthService.update_password(phone, new_password)
        if result:
            return {"message": "Password updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to update password")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_user_sessions(current_user=Depends(get_current_user)):
    """Get all sessions for current user."""
    try:
        sessions = await SessionService.get_user_sessions(current_user["id"])
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def deactivate_session(session_id: str, current_user=Depends(get_current_user)):
    """Deactivate a specific session for current user."""
    try:
        # Ensure user can only deactivate their own sessions
        session = await SessionService.get_session_by_id(session_id)
        if not session or session.user_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Can only deactivate own sessions")
        
        result = await SessionService.deactivate_session(session_id)
        if result:
            return {"message": "Session deactivated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to deactivate session")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
