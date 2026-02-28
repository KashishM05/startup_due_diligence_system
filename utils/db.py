"""
MongoDB connection singleton.
Uses MONGO_URI from .env to connect. Provides get_db() accessor.
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

_client = None
_db = None

DB_NAME = "due_diligence"


def get_db():
    """Return the MongoDB database instance (lazy singleton)."""
    global _client, _db
    if _db is None:
        uri = os.getenv("MONGO_URI")
        if not uri:
            raise RuntimeError("MONGO_URI not set in environment")
        _client = MongoClient(uri)
        _db = _client[DB_NAME]
    return _db


def get_users_collection():
    return get_db()["users"]


def get_applications_collection():
    return get_db()["applications"]
