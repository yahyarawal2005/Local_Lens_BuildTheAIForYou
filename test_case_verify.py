import sys
import os
sys.path.insert(0, os.path.abspath("."))
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

print("=== 1. Testing POST /api/recommendations ===")
rec_req = {
    "budget_inr": 4000,
    "available_time_hours": 5,
    "traveler_count": 3,
    "group_type": "Friends",
    "interests": ["Food", "Culture"],
    "user_lat": 18.9904,
    "user_lon": 73.1281,
    "radius_km": 25,
    "top_n": 10
}

resp = client.post("/api/recommendations", json=rec_req)
print("Status Code:", resp.status_code)
data = resp.json()
print("Success:", data.get("success"))
print("Count:", data.get("count"))
print("\nTop 10 Recommendations:")
for i, r in enumerate(data.get("recommendations", []), 1):
    print(f"{i}. [{r['experience_id']}] {r['experience_name']} ({r['category']} - {r['location']}) | Rs.{r['price_inr']} | {r['duration_hours']}h | {r['distance_km']}km away | ML Score: {r['recommendation_score']} | img: {r['image_url'][:45]}...")

print("\n=== 2. Testing POST /api/itinerary/generate ===")
selected_ids = [r["experience_id"] for r in data.get("recommendations", [])[:3]]
itin_req = {
    "budget_inr": 4000,
    "available_time_hours": 5,
    "traveler_count": 3,
    "group_type": "Friends",
    "user_lat": 18.9904,
    "user_lon": 73.1281,
    "trip_date": "2026-09-26",
    "start_time": "10:30",
    "selected_experience_ids": selected_ids
}

resp2 = client.post("/api/itinerary/generate", json=itin_req)
print("Status Code:", resp2.status_code)
data2 = resp2.json()
print("Success:", data2.get("success"))
print("Start Time:", data2.get("start_time"))
print("End Time:", data2.get("end_time"))
print("Duration:", data2.get("total_duration_formatted"))
print("Total Cost:", data2.get("total_cost"))
print("Scheduled Stops:")
for s in data2.get("scheduled_experiences", []):
    print(f"  Stop {s['sequence']}: [{s['experience_id']}] {s['experience_name']} ({s['start_time']} - {s['end_time']}) Rs.{s['price_inr']} | img: {s['image_url'][:40]}... | travel to next: {s['travel_to_next_minutes']}m ({s['travel_to_next_distance_km']}km)")
