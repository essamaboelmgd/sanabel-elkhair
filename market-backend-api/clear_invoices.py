import asyncio
from app.database.connection import get_database

async def clear_invoices():
    try:
        db = await get_database()
        result = await db.invoices.delete_many({})
        print(f'Successfully cleared {result.deleted_count} invoices from database')
    except Exception as e:
        print(f'Error clearing invoices: {e}')

if __name__ == "__main__":
    asyncio.run(clear_invoices())
