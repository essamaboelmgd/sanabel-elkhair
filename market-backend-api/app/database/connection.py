"""
MongoDB database configuration using Motor.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from fastapi import Request
from pydantic_core import core_schema
from pydantic import GetCoreSchemaHandler
from typing import Any
from typing import Annotated
from pydantic.functional_validators import BeforeValidator
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PyObjectId(ObjectId):

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {
            "type": "string",
            "pattern": "^[a-fA-F0-9]{24}$"
        }

# Database connection settings
MONGODB_URI = os.getenv("MONGO_URL")
MONGO_DB_NAME = os.getenv("DB_NAME", "sanabel_elkhair")

try:
    import ssl
    
    # SSL context configuration for Windows compatibility
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    client = AsyncIOMotorClient(
        MONGODB_URI,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True,
        ssl_context=ssl_context
    )
    db = client[MONGO_DB_NAME]
    print(f"✅ Database connection initialized: {MONGO_DB_NAME}")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    client = None
    db = None

# Helper for FastAPI dependency injection
async def get_db(request: Request):
    return request.app.state.db

# Optional: To initialize on startup in main.py
async def connect_to_mongo():
    """Connect to MongoDB."""
    print("✅ Connected to MongoDB!")

async def close_mongo_connection():
    """Close MongoDB connection."""
    client.close()
    print("❌ Disconnected from MongoDB!")

def get_motor_client():
    return db