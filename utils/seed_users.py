"""
Seed script — populates the 'users' collection with sample investors.
Run:  python -m utils.seed_users
"""
from datetime import datetime
from utils.db import get_users_collection


def seed():
    users = get_users_collection()

    # Create unique index on email
    users.create_index("email", unique=True)

    sample_investors = [
        {
            "email": "arjun.kapoor@vcindia.com",
            "password": "password123",
            "name": "Arjun Kapoor",
            "role": "investor",
            "investor_type": "EARLY_VC",
            "sectors": ["fintech", "saas", "healthtech"],
            "stages": ["seed", "Series A"],
            "geographies": ["India", "Southeast Asia"],
            "check_size_range_usd": [100000, 1000000],
            "total_investments": 18,
            "max_sector_concentration_pct": 35.0,
            "created_at": datetime.utcnow(),
        },
        {
            "email": "priya.sharma@angelnetwork.in",
            "password": "password123",
            "name": "Priya Sharma",
            "role": "investor",
            "investor_type": "ANGEL",
            "sectors": ["edtech", "d2c", "agritech"],
            "stages": ["pre-seed", "seed"],
            "geographies": ["India"],
            "check_size_range_usd": [25000, 250000],
            "total_investments": 7,
            "max_sector_concentration_pct": 40.0,
            "created_at": datetime.utcnow(),
        },
        {
            "email": "david.chen@svpartners.com",
            "password": "password123",
            "name": "David Chen",
            "role": "investor",
            "investor_type": "EARLY_VC",
            "sectors": ["ai", "saas", "deeptech", "fintech"],
            "stages": ["seed", "Series A", "Series B"],
            "geographies": ["US", "Europe"],
            "check_size_range_usd": [500000, 5000000],
            "total_investments": 34,
            "max_sector_concentration_pct": 25.0,
            "created_at": datetime.utcnow(),
        },
        {
            "email": "mei.tanaka@acceleratejp.co",
            "password": "password123",
            "name": "Mei Tanaka",
            "role": "investor",
            "investor_type": "ACCELERATOR",
            "sectors": ["healthtech", "biotech", "ai"],
            "stages": ["pre-seed", "seed"],
            "geographies": ["Japan", "US", "Southeast Asia"],
            "check_size_range_usd": [50000, 500000],
            "total_investments": 22,
            "max_sector_concentration_pct": 30.0,
            "created_at": datetime.utcnow(),
        },
    ]

    inserted = 0
    for inv in sample_investors:
        try:
            users.insert_one(inv)
            inserted += 1
            print(f"  ✓ Inserted investor: {inv['name']}")
        except Exception:
            print(f"  ⊘ Skipped (already exists): {inv['name']}")

    print(f"\n✅ Seeded {inserted} investors into MongoDB.")


if __name__ == "__main__":
    seed()
