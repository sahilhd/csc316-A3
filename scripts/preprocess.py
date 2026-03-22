import csv
import os
import random
from datetime import datetime, timedelta


NORTH_AMERICA_REGIONS = [
    {"name": "US_WEST", "lat": (32.0, 49.0), "lng": (-124.8, -112.0), "weight": 0.14},
    {"name": "US_MOUNTAIN", "lat": (31.0, 49.0), "lng": (-112.0, -102.0), "weight": 0.09},
    {"name": "US_MIDWEST", "lat": (36.0, 49.5), "lng": (-102.0, -84.0), "weight": 0.14},
    {"name": "US_NORTHEAST", "lat": (37.0, 47.5), "lng": (-84.0, -66.0), "weight": 0.18},
    {"name": "US_SOUTHEAST", "lat": (25.0, 37.5), "lng": (-91.0, -75.0), "weight": 0.13},
    {"name": "US_SOUTH", "lat": (25.0, 36.5), "lng": (-106.0, -91.0), "weight": 0.08},
    {"name": "CANADA_SOUTH", "lat": (43.0, 56.0), "lng": (-128.0, -60.0), "weight": 0.12},
    {"name": "MEXICO", "lat": (14.0, 32.0), "lng": (-117.0, -86.0), "weight": 0.09},
    {"name": "CARIBBEAN", "lat": (10.0, 25.8), "lng": (-86.0, -58.0), "weight": 0.08},
]

CITY_CLUSTERS = [
    {"name": "VANCOUVER", "lat": 49.2827, "lng": -123.1207, "weight": 0.05},
    {"name": "SEATTLE", "lat": 47.6062, "lng": -122.3321, "weight": 0.05},
    {"name": "SAN FRANCISCO", "lat": 37.7749, "lng": -122.4194, "weight": 0.05},
    {"name": "LOS ANGELES", "lat": 34.0522, "lng": -118.2437, "weight": 0.06},
    {"name": "PHOENIX", "lat": 33.4484, "lng": -112.0740, "weight": 0.04},
    {"name": "DENVER", "lat": 39.7392, "lng": -104.9903, "weight": 0.04},
    {"name": "DALLAS", "lat": 32.7767, "lng": -96.7970, "weight": 0.05},
    {"name": "HOUSTON", "lat": 29.7604, "lng": -95.3698, "weight": 0.05},
    {"name": "CHICAGO", "lat": 41.8781, "lng": -87.6298, "weight": 0.06},
    {"name": "TORONTO", "lat": 43.6532, "lng": -79.3832, "weight": 0.05},
    {"name": "MONTREAL", "lat": 45.5017, "lng": -73.5673, "weight": 0.04},
    {"name": "ATLANTA", "lat": 33.7490, "lng": -84.3880, "weight": 0.04},
    {"name": "MIAMI", "lat": 25.7617, "lng": -80.1918, "weight": 0.04},
    {"name": "WASHINGTON DC", "lat": 38.9072, "lng": -77.0369, "weight": 0.05},
    {"name": "NEW YORK", "lat": 40.7128, "lng": -74.0060, "weight": 0.07},
    {"name": "BOSTON", "lat": 42.3601, "lng": -71.0589, "weight": 0.04},
    {"name": "MEXICO CITY", "lat": 19.4326, "lng": -99.1332, "weight": 0.06},
    {"name": "MONTERREY", "lat": 25.6866, "lng": -100.3161, "weight": 0.03},
    {"name": "HAVANA", "lat": 23.1136, "lng": -82.3666, "weight": 0.03},
    {"name": "SAN JUAN", "lat": 18.4655, "lng": -66.1057, "weight": 0.03},
    {"name": "SANTO DOMINGO", "lat": 18.4861, "lng": -69.9312, "weight": 0.03},
    {"name": "KINGSTON", "lat": 17.9712, "lng": -76.7936, "weight": 0.02},
    {"name": "NASSAU", "lat": 25.0478, "lng": -77.3554, "weight": 0.02},
    {"name": "PORT OF SPAIN", "lat": 10.6549, "lng": -61.5019, "weight": 0.02},
]

TITLES = {
    "EMS": [
        "EMS: MEDICAL EMERGENCY",
        "EMS: CARDIAC EMERGENCY",
        "EMS: RESPIRATORY DISTRESS",
        "EMS: UNCONSCIOUS SUBJECT",
        "EMS: FALL INJURY",
    ],
    "Traffic": [
        "Traffic: VEHICLE ACCIDENT",
        "Traffic: DISABLED VEHICLE",
        "Traffic: ROAD OBSTRUCTION",
        "Traffic: HIT AND RUN",
        "Traffic: INTERSECTION COLLISION",
    ],
    "Fire": [
        "Fire: FIRE ALARM",
        "Fire: STRUCTURE FIRE",
        "Fire: OUTDOOR FIRE",
        "Fire: SMOKE INVESTIGATION",
        "Fire: GAS LEAK",
    ],
    "Other": [
        "Other: PUBLIC ASSIST",
        "Other: WELFARE CHECK",
        "Other: UNKNOWN INCIDENT",
    ],
}


def choose_weighted(rows, key="weight"):
    total = sum(item[key] for item in rows)
    target = random.uniform(0, total)
    running = 0.0
    for item in rows:
        running += item[key]
        if running >= target:
            return item
    return rows[-1]


def synthetic_timestamp():
    start = datetime(2016, 1, 1, 0, 0, 0)
    end = datetime(2024, 12, 31, 23, 59, 59)
    delta = end - start
    seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=seconds)


def category_for_hour(hour):
    if 6 <= hour <= 9 or 16 <= hour <= 19:
        cats = [("Traffic", 0.52), ("EMS", 0.34), ("Fire", 0.1), ("Other", 0.04)]
    elif 10 <= hour <= 15:
        cats = [("EMS", 0.5), ("Traffic", 0.32), ("Fire", 0.14), ("Other", 0.04)]
    elif 20 <= hour <= 23:
        cats = [("EMS", 0.48), ("Traffic", 0.28), ("Fire", 0.18), ("Other", 0.06)]
    else:
        cats = [("EMS", 0.58), ("Traffic", 0.2), ("Fire", 0.16), ("Other", 0.06)]

    total = sum(w for _, w in cats)
    target = random.uniform(0, total)
    running = 0.0
    for cat, weight in cats:
        running += weight
        if running >= target:
            return cat
    return "EMS"


def synthetic_point():
    # Dense urban clusters for storytelling + broad regional spread for map coverage.
    if random.random() < 0.7:
        city = choose_weighted(CITY_CLUSTERS)
        lat = random.gauss(city["lat"], 0.65)
        lng = random.gauss(city["lng"], 0.85)
        twp = f"{city['name']} METRO"
    else:
        region = choose_weighted(NORTH_AMERICA_REGIONS)
        lat = random.uniform(region["lat"][0], region["lat"][1])
        lng = random.uniform(region["lng"][0], region["lng"][1])
        twp = f"{region['name']} REGION"

    # Clamp to North America framing.
    lat = max(10.0, min(60.5, lat))
    lng = max(-168.0, min(-52.0, lng))
    return lat, lng, twp


def process_data(input_file, output_file, real_sample_size=250, synthetic_size=1800, seed=316):
    random.seed(seed)
    print(f"Reading from {input_file}...")

    with open(input_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total_rows = len(rows)
    print(f"Total real rows found: {total_rows}")

    if total_rows > real_sample_size:
        print(f"Sampling {real_sample_size} real rows...")
        sampled_rows = random.sample(rows, real_sample_size)
    else:
        sampled_rows = rows

    for row in sampled_rows:
        title = row.get("title", "")
        if ":" in title:
            row["category"] = title.split(":")[0].strip() or "Other"
        else:
            row["category"] = "Other"

    print(f"Generating {synthetic_size} synthetic North America rows...")
    generated = []
    for i in range(synthetic_size):
        lat, lng, twp = synthetic_point()
        dt = synthetic_timestamp()
        category = category_for_hour(dt.hour)
        title = random.choice(TITLES[category])
        zip_code = f"{random.randint(10000, 99999)}"

        generated.append(
            {
                "lat": f"{lat:.6f}",
                "lng": f"{lng:.6f}",
                "category": category,
                "title": title,
                "timeStamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "zip": zip_code,
                "twp": twp,
            }
        )

        if (i + 1) % 600 == 0:
            print(f"  generated {i + 1} synthetic rows...")

    all_rows = sampled_rows + generated
    random.shuffle(all_rows)

    print(f"Writing {len(all_rows)} rows to {output_file}...")
    with open(output_file, "w", encoding="utf-8", newline="") as f:
        output_fields = ["lat", "lng", "category", "title", "timeStamp", "zip", "twp"]
        writer = csv.DictWriter(f, fieldnames=output_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_rows)

    print("Done.")
    print(f"Output file size: {os.path.getsize(output_file) / (1024 * 1024):.2f} MB")


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_csv = os.path.join(base_dir, "911.csv")
    output_csv = os.path.join(base_dir, "911_sampled.csv")

    if not os.path.exists(input_csv):
        print(f"Error: {input_csv} does not exist.")
    else:
        process_data(input_csv, output_csv, real_sample_size=250, synthetic_size=1800, seed=316)
