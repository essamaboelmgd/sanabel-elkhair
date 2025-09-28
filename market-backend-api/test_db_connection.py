import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database configuration
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "sanabel-elkhair")

print(f"Mongo URL: {MONGO_URL}")
print(f"Database Name: {DB_NAME}")

async def test_connection():
    """Test MongoDB connection."""
    try:
        import ssl
        
        # SSL context configuration for Windows compatibility
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        print("Attempting to connect to MongoDB...")
        client = AsyncIOMotorClient(
            MONGO_URL,
            tlsAllowInvalidCertificates=True,
            tlsAllowInvalidHostnames=True,
            ssl_context=ssl_context,
            serverSelectionTimeoutMS=5000  # 5 second timeout
        )
        
        # Try to get database names to test connection
        db_names = await client.list_database_names()
        print(f"✅ Successfully connected to MongoDB!")
        print(f"Available databases: {db_names}")
        
        # Try to access the specific database
        db = client[DB_NAME]
        collection_names = await db.list_collection_names()
        print(f"✅ Successfully accessed database '{DB_NAME}'")
        print(f"Available collections: {collection_names}")
        
        # Close connection
        client.close()
        print("✅ Connection test completed successfully!")
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        print(f"Error type: {type(e).__name__}")

if __name__ == "__main__":
    asyncio.run(test_connection())