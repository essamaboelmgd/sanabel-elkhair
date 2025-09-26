from datetime import datetime, timedelta
from typing import Optional, List
from bson import ObjectId
from fastapi import HTTPException, status

from app.database.connection import db
from app.auth.models import Session, SessionCreate, User, UserRole
from app.config import JWT_SECRET, ALGORITHM


class SessionService:
    """Service for managing user sessions."""

    @staticmethod
    async def create_session(user: User, token: str, expires_in_minutes: int = 720) -> Session:
        """Create a new session for a user."""
        # Only deactivate existing sessions for customers (not for admin/cashier)
        if user.role == UserRole.CUSTOMER:
            await SessionService.deactivate_customer_sessions(user.id)
        
        expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        
        session_data = SessionCreate(
            user_id=user.id,
            token=token,
            role=user.role,
            expires_at=expires_at
        )
        
        session_dict = session_data.dict()
        session_dict["created_at"] = datetime.utcnow()
        session_dict["last_used"] = datetime.utcnow()
        session_dict["is_active"] = True
        
        result = await db.sessions.insert_one(session_dict)
        session_dict["_id"] = str(result.inserted_id)
        
        return Session(**session_dict)

    @staticmethod
    async def get_session_by_token(token: str) -> Optional[Session]:
        """Get session by token."""
        session_data = await db.sessions.find_one({
            "token": token,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if session_data:
            session_data["_id"] = str(session_data["_id"])
            return Session(**session_data)
        return None

    @staticmethod
    async def get_session_by_user_id(user_id: str) -> Optional[Session]:
        """Get active session for a user."""
        session_data = await db.sessions.find_one({
            "user_id": user_id,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if session_data:
            session_data["_id"] = str(session_data["_id"])
            return Session(**session_data)
        return None

    @staticmethod
    async def update_session_last_used(session_id: str) -> bool:
        """Update session last used timestamp."""
        result = await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"last_used": datetime.utcnow()}}
        )
        return result.modified_count == 1

    @staticmethod
    async def deactivate_session(session_id: str) -> bool:
        """Deactivate a specific session."""
        result = await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"is_active": False}}
        )
        return result.modified_count == 1

    @staticmethod
    async def deactivate_user_sessions(user_id: str) -> bool:
        """Deactivate all sessions for a user."""
        result = await db.sessions.update_many(
            {"user_id": user_id, "is_active": True},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0

    @staticmethod
    async def deactivate_customer_sessions(user_id: str) -> bool:
        """Deactivate all sessions for a customer only."""
        result = await db.sessions.update_many(
            {
                "user_id": user_id, 
                "is_active": True,
                "role": UserRole.CUSTOMER
            },
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0

    @staticmethod
    async def deactivate_expired_sessions() -> int:
        """Deactivate all expired sessions."""
        result = await db.sessions.update_many(
            {"expires_at": {"$lt": datetime.utcnow()}, "is_active": True},
            {"$set": {"is_active": False}}
        )
        return result.modified_count

    @staticmethod
    async def refresh_session(session_id: str, new_expires_in_minutes: int = 720) -> Optional[Session]:
        """Refresh a session with new expiration time."""
        new_expires_at = datetime.utcnow() + timedelta(minutes=new_expires_in_minutes)
        
        result = await db.sessions.update_one(
            {"_id": ObjectId(session_id), "is_active": True},
            {
                "$set": {
                    "expires_at": new_expires_at,
                    "last_used": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 1:
            return await SessionService.get_session_by_id(session_id)
        return None

    @staticmethod
    async def get_session_by_id(session_id: str) -> Optional[Session]:
        """Get session by ID."""
        session_data = await db.sessions.find_one({"_id": ObjectId(session_id)})
        
        if session_data:
            session_data["_id"] = str(session_data["_id"])
            return Session(**session_data)
        return None

    @staticmethod
    async def get_user_sessions(user_id: str) -> List[Session]:
        """Get all sessions for a user."""
        sessions = []
        cursor = db.sessions.find({"user_id": user_id}).sort("created_at", -1)
        
        async for session_data in cursor:
            session_data["_id"] = str(session_data["_id"])
            sessions.append(Session(**session_data))
        
        return sessions

    @staticmethod
    async def cleanup_old_sessions(days_old: int = 30) -> int:
        """Remove old inactive sessions."""
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        result = await db.sessions.delete_many({
            "is_active": False,
            "updated_at": {"$lt": cutoff_date}
        })
        return result.deleted_count

    @staticmethod
    async def get_active_sessions_count(user_id: str) -> int:
        """Get count of active sessions for a user."""
        count = await db.sessions.count_documents({
            "user_id": user_id,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        return count

    @staticmethod
    async def get_user_active_sessions(user_id: str) -> List[Session]:
        """Get all active sessions for a user."""
        sessions = []
        cursor = db.sessions.find({
            "user_id": user_id,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        }).sort("created_at", -1)
        
        async for session_data in cursor:
            session_data["_id"] = str(session_data["_id"])
            sessions.append(Session(**session_data))
        
        return sessions


