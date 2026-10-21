"""MongoDB connection management using Motor async driver."""

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """Establish connection to MongoDB."""
    global _client, _database
    logger.info(f"Connecting to MongoDB at {settings.MONGO_URL}...")
    _client = AsyncIOMotorClient(
        settings.MONGO_URL,
        maxPoolSize=50,
        minPoolSize=5,
        serverSelectionTimeoutMS=5000,
    )
    _database = _client[settings.MONGO_DB_NAME]
    # Verify connection
    await _client.admin.command("ping")
    logger.info("Connected to MongoDB successfully.")

    # Create indexes
    await _database.tasks.create_index("task_id", unique=True)
    await _database.tasks.create_index("batch_id")
    await _database.tasks.create_index("status")
    await _database.tasks.create_index("created_at")
    await _database.batches.create_index("batch_id", unique=True)
    await _database.benchmarks.create_index("benchmark_id", unique=True)
    logger.info("MongoDB indexes ensured.")


async def close_mongo_connection() -> None:
    """Close the MongoDB connection."""
    global _client, _database
    if _client:
        _client.close()
        _client = None
        _database = None
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    """Get the active async database instance for FastAPI."""
    if _database is None:
        raise RuntimeError("MongoDB is not connected. Call connect_to_mongo() first.")
    return _database


_sync_client = None


def get_sync_database():
    """Get a synchronous database connection for Celery workers."""
    global _sync_client
    if _sync_client is None:
        from pymongo import MongoClient
        _sync_client = MongoClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
    return _sync_client[settings.MONGO_DB_NAME]

