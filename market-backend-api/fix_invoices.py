import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def clear_invoices():
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DB_NAME]
        
        # Clear all invoices
        result = await db.invoices.delete_many({})
        print(f'Successfully cleared {result.deleted_count} invoices from database')
        
        # Close connection
        client.close()
        
    except Exception as e:
        print(f'Error clearing invoices: {e}')

if __name__ == "__main__":
    asyncio.run(clear_invoices())
