"""
Authentication related Pydantic schemas.
"""

from pydantic import BaseModel, validator
from typing import Optional
from app.auth.models import UserRole
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema."""
    name: str
    phone: str
    role: UserRole = UserRole.CUSTOMER


class UserCreate(UserBase):
    """User creation schema."""
    password: str
    
    @validator('phone')
    def validate_phone(cls, v):
        # Basic phone validation
        if not v.isdigit() or len(v) < 11 or len(v) > 11:
            raise ValueError('Phone number must be at least 11 digits')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Allow passwords of any size (handled by the AuthService)
        return v


class UserLogin(BaseModel):
    """User login schema."""
    phone: str
    password: str
    role: UserRole
    
    @validator('password')
    def validate_password_length(cls, v):
        # No length restrictions for login (will be handled by AuthService)
        return v


class UserResponse(UserBase):
    """User response schema."""
    id: Optional[str] = None
    is_active: bool
    first_login: bool = True
    created_at: datetime



class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    """Token data schema."""
    phone: Optional[str] = None
    role: Optional[UserRole] = None


class PasswordChange(BaseModel):
    """Password change schema."""
    phone: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Allow passwords of any size (handled by the AuthService)
        return v


class CustomerCheck(BaseModel):
    """Customer check schema."""
    phone: str


class CustomerPasswordSet(BaseModel):
    """Customer password set schema."""
    phone: str
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Allow passwords of any size (handled by the AuthService)
        return v


class CustomerPasswordSetById(BaseModel):
    """Customer password set by ID schema."""
    customer_id: str
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Allow passwords of any size (handled by the AuthService)
        return v
