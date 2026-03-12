import csv
import random
import os
import geopandas as gpd
from shapely.geometry import Point

def process_data(input_file, output_file, real_sample_size=200, synthetic_size=1000):
    print(f"Reading from {input_file}...")
    
    # Read all rows
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        # We'll add a 'category' column
        if 'category' not in fieldnames:
            fieldnames.append('category')
            
        rows = list(reader)
        
    total_rows = len(rows)
    print(f"Total rows found: {total_rows}")
    
    # Sample the real rows
    if total_rows > real_sample_size:
        print(f"Sampling {real_sample_size} real rows...")
        sampled_rows = random.sample(rows, real_sample_size)
    else:
        sampled_rows = rows
        
    print("Processing extracted categories for real data...")
    # Add 'category' derived from 'title' (e.g., "EMS: BACK PAINS/INJURY" -> "EMS")
    for row in sampled_rows:
        title = row.get('title', '')
        if ':' in title:
            # Extract the broad category before the colon
            row['category'] = title.split(':')[0].strip()
        else:
            row['category'] = 'Other'

    # Generate Synthetic Data on Land
    print(f"Generating {synthetic_size} synthetic global rows (on land only)...")
    
    # Load world map from Natural Earth (Admin 0 - Countries)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    shapefile_path = os.path.join(base_dir, 'scripts', 'ne_110m_admin_0_countries.shp')
    
    try:
        world = gpd.read_file(shapefile_path)
        # Unite all land into a single geometry for faster checking
        land_geometry = world.unary_union
    except Exception as e:
        print(f"Error loading shapefile: {e}. Falling back to completely random global generation.")
        land_geometry = None

    categories = ['EMS', 'Traffic', 'Fire']
    titles = {
        'EMS': ['EMS: MEDICAL EMERGENCY', 'EMS: INJURY', 'EMS: CARDIAC ARREST'],
        'Traffic': ['Traffic: VEHICLE ACCIDENT', 'Traffic: ROAD CLOSURE', 'Traffic: DISABLED VEHICLE'],
        'Fire': ['Fire: BUILDING FIRE', 'Fire: FIRE ALARM', 'Fire: GAS LEAK']
    }
    
    generated_count = 0
    while generated_count < synthetic_size:
        lat = random.uniform(-60.0, 70.0)
        lng = random.uniform(-180.0, 180.0)
        
        # If we successfully loaded the shapefile, check if point is on land
        if land_geometry is not None:
            point = Point(lng, lat)
            if not land_geometry.contains(point):
                continue # Skip this point, it's in the ocean
                
        cat = random.choice(categories)
        title = random.choice(titles[cat])
        
        synthetic_row = {
            'lat': str(lat),
            'lng': str(lng),
            'category': cat,
            'title': title,
            'timeStamp': '2015-12-10 17:00:00', # Generic timestamp
            'zip': '00000',
            'twp': 'Global Sector'
        }
        sampled_rows.append(synthetic_row)
        generated_count += 1
        
        if generated_count % 500 == 0:
            print(f"Generated {generated_count} valid land points...")

    print(f"Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        # We only really need a subset of the fields for the D3 map to keep the file size minimal
        output_fields = ['lat', 'lng', 'category', 'title', 'timeStamp', 'zip', 'twp']
        writer = csv.DictWriter(f, fieldnames=output_fields, extrasaction='ignore')
        
        writer.writeheader()
        writer.writerows(sampled_rows)
        
    print(f"Successfully processed and saved {len(sampled_rows)} rows to {output_file}.")
    print(f"Output file size: {os.path.getsize(output_file) / (1024*1024):.2f} MB")

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_csv = os.path.join(base_dir, '911.csv')
    output_csv = os.path.join(base_dir, '911_sampled.csv')
    
    # Check if input exists
    if not os.path.exists(input_csv):
        print(f"Error: {input_csv} does not exist.")
    else:
        process_data(input_csv, output_csv, real_sample_size=200, synthetic_size=1000)
