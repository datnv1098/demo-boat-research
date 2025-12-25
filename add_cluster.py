import json
import random
import time

def add_cluster(center_lat, center_lon, num_points, base_link_id, file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)

    new_headers = []
    new_catches = []
    
    # Base catch data to copy structure from (finding the original point)
    base_catch_template = None
    for row in data['catch']:
        if row.get('Link') == base_link_id:
            base_catch_template = row.copy()
            break
    
    if not base_catch_template:
        print(f"Could not find base catch data for {base_link_id}")
        return

    # Base header data
    base_header_template = None
    for row in data['header']:
        if row.get('Link') == base_link_id:
            base_header_template = row.copy()
            break

    if not base_header_template:
        print(f"Could not find base header data for {base_link_id}")
        return

    for i in range(num_points):
        # Generate random offset
        lat_offset = random.uniform(-0.05, 0.05)
        lon_offset = random.uniform(-0.05, 0.05)
        
        new_link_id = f"{base_link_id}_cluster_{int(time.time())}_{i}"
        
        # Create new header
        new_header = base_header_template.copy()
        new_header['Link'] = new_link_id
        new_header['LatStart'] = center_lat + lat_offset
        new_header['LongStart'] = center_lon + lon_offset
        new_headers.append(new_header)
        
        # Create new catch (using weight around 150-200 to match the requested density style)
        new_catch = base_catch_template.copy()
        new_catch['Link'] = new_link_id
        new_catch['total_weight'] = random.uniform(100, 250) 
        new_catches.append(new_catch)

    # Append new data
    data['header'].extend(new_headers)
    data['catch'].extend(new_catches)
    
    print(f"Added {num_points} points around {center_lat}, {center_lon}")

    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    # Center of em202508222: 6.06013, 99.62569
    add_cluster(6.06013, 99.62569, 20, 'em202508222', 'public/cmdec_mock.json')
