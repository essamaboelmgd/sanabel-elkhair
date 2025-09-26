from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from app.config import MONGODB_URL
from app.auth.models import UserRole

async def init_database():
    """Initialize database with required collections and indexes."""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client.get_default_database()
    
    print("🔧 Initializing database...")
    
    # Create sessions collection if it doesn't exist
    if "sessions" not in await db.list_collection_names():
        await db.create_collection("sessions")
        print("✅ Created sessions collection")
    
    # Create indexes for sessions collection
    sessions_collection = db.sessions
    
    # Index on token for fast lookups
    await sessions_collection.create_index("token", unique=True)
    print("✅ Created unique index on sessions.token")
    
    # Index on user_id for user session lookups
    await sessions_collection.create_index("user_id")
    print("✅ Created index on sessions.user_id")
    
    # Index on expires_at for cleanup operations
    await sessions_collection.create_index("expires_at")
    print("✅ Created index on sessions.expires_at")
    
    # Index on is_active for active session queries
    await sessions_collection.create_index("is_active")
    print("✅ Created index on sessions.is_active")
    
    # Compound index for active sessions by user
    await sessions_collection.create_index([
        ("user_id", 1),
        ("is_active", 1),
        ("expires_at", 1)
    ])
    print("✅ Created compound index on sessions (user_id, is_active, expires_at)")
    
    # Create indexes for users collection if they don't exist
    users_collection = db.users
    
    # Index on phone for fast lookups
    if "phone_1" not in await users_collection.list_indexes():
        await users_collection.create_index("phone", unique=True)
        print("✅ Created unique index on users.phone")
    
    # Index on role for role-based queries
    if "role_1" not in await users_collection.list_indexes():
        await users_collection.create_index("role")
        print("✅ Created index on users.role")
    
    # Index on is_active for active user queries
    if "is_active_1" not in await users_collection.list_indexes():
        await users_collection.create_index("is_active")
        print("✅ Created index on users.is_active")
    
    print("🎉 Database initialization completed!")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_database())


