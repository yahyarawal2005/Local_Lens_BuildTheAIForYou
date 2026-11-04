"""
Database Migration Application Utility.
Reads master schema migrations and applies them or generates executable SQL scripts.
"""
from pathlib import Path
import os
import sys

MIGRATION_PATH = Path(__file__).resolve().parent.parent / "supabase" / "migrations" / "20261024_traveler_backend_master_schema.sql"


def load_sql_migration() -> str:
    if not MIGRATION_PATH.exists():
        raise FileNotFoundError(f"Migration file not found at {MIGRATION_PATH}")
    with open(MIGRATION_PATH, "r", encoding="utf-8") as f:
        return f.read()


def print_migration_summary():
    sql = load_sql_migration()
    print("=" * 70)
    print("TRAVELER WEB MASTER BACKEND DATABASE MIGRATION")
    print(f"Source: {MIGRATION_PATH}")
    print(f"Total SQL Lines: {len(sql.splitlines())}")
    print("=" * 70)
    print("\nTables included in this migration:")
    for line in sql.splitlines():
        if line.strip().upper().startswith("CREATE TABLE IF NOT EXISTS"):
            tbl = line.strip().split()[5]
            print(f"  - {tbl}")

    print("\nTo apply this migration to your Supabase project:")
    print("  1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/mvokdnefwukzouuttsvz")
    print("  2. Navigate to 'SQL Editor'")
    print(f"  3. Paste the contents of: {MIGRATION_PATH}")
    print("  4. Click 'Run' to execute the DDL and establish all RLS policies.")
    print("=" * 70)


if __name__ == "__main__":
    print_migration_summary()
