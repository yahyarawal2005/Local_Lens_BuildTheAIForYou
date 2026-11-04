"""
Seeder script to import 757 experiences from ml/datasets/all_experiences_cleaned.csv into Supabase / PostgreSQL.
"""
import os
import sys
from pathlib import Path
import pandas as pd

try:
    from supabase import create_client, Client
except ImportError:
    print("supabase package not installed. Installing supabase...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "supabase"])
    from supabase import create_client, Client


def seed_experiences():
    # 1. Credentials from Environment or placeholders
    supabase_url = os.getenv("SUPABASE_URL") or input("Enter Supabase Project URL (e.g., https://xyz.supabase.co): ").strip()
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or input("Enter Supabase Key (anon or service_role): ").strip()

    if not supabase_url or not supabase_key:
        print("Error: Supabase URL and Key are required.")
        return

    supabase: Client = create_client(supabase_url, supabase_key)

    # 2. Load dataset
    base_dir = Path(__file__).resolve().parent.parent.parent
    csv_path = base_dir / "ml" / "datasets" / "all_experiences_cleaned.csv"

    if not csv_path.exists():
        print(f"Dataset not found at {csv_path}")
        return

    print(f"Reading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Found {len(df)} rows.")

    # 3. Transform & Clean Records
    records = []
    for _, row in df.iterrows():
        # Clean price
        price = row.get("price_inr_clean", row.get("price_inr", 0))
        try:
            price_val = float(price) if pd.notna(price) else 0.0
        except Exception:
            price_val = 0.0

        # Clean duration
        duration = row.get("duration_hours_clean", row.get("duration_hours", 1.0))
        try:
            dur_val = float(duration) if pd.notna(duration) else 1.0
        except Exception:
            dur_val = 1.0

        # Clean rating & review count
        try:
            rating_val = float(row.get("rating", 4.0)) if pd.notna(row.get("rating")) else 4.0
        except Exception:
            rating_val = 4.0

        try:
            review_count_val = int(float(row.get("review_count", 0))) if pd.notna(row.get("review_count")) else 0
        except Exception:
            review_count_val = 0

        # Latitude & Longitude
        try:
            lat = float(row.get("latitude"))
            lon = float(row.get("longitude"))
        except Exception:
            continue  # Skip row without valid coordinates

        rec = {
            "experience_id": str(row.get("experience_id", "")).strip(),
            "experience_name": str(row.get("experience_name", "")).strip(),
            "city": str(row.get("city", "")).strip() if pd.notna(row.get("city")) else "",
            "district": str(row.get("district", "")).strip() if pd.notna(row.get("district")) else "",
            "state": str(row.get("state", "")).strip() if pd.notna(row.get("state")) else "",
            "region": str(row.get("region", "")).strip() if pd.notna(row.get("region")) else "",
            "latitude": lat,
            "longitude": lon,
            "category": str(row.get("category", "General")).strip() if pd.notna(row.get("category")) else "General",
            "sub_category": str(row.get("sub_category", "")).strip() if pd.notna(row.get("sub_category")) else "",
            "description": str(row.get("description", "")).strip() if pd.notna(row.get("description")) else "",
            "tags": str(row.get("tags", "")).strip() if pd.notna(row.get("tags")) else "",
            "price_inr": price_val,
            "duration_hours": dur_val,
            "best_for": str(row.get("best_for", "")).strip() if pd.notna(row.get("best_for")) else "",
            "rating": rating_val,
            "review_count": review_count_val,
            "source_name": str(row.get("source_name", "dataset")).strip() if pd.notna(row.get("source_name")) else "dataset",
        }
        records.append(rec)

    # 4. Upsert in batches of 100
    batch_size = 100
    total_upserted = 0
    print(f"Uploading {len(records)} cleaned records to Supabase...")

    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        response = supabase.table("experiences").upsert(batch, on_conflict="experience_id").execute()
        total_upserted += len(batch)
        print(f"  -> Uploaded {total_upserted}/{len(records)} experiences")

    print(f"\n[SUCCESS] Successfully seeded {total_upserted} experiences into Supabase!")


if __name__ == "__main__":
    seed_experiences()
