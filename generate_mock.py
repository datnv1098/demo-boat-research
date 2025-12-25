import json
import random
from datetime import datetime, timedelta

def generate_mock_data():
    # Define marine zones strictly within Thailand's sea areas
    # Gulf of Thailand: Lon 99.5 to 103.0
    # Andaman Sea: Lon 97.5 to 99.5
    marine_zones = [
        {"name": "Upper Gulf", "lat": (12.5, 13.5), "lon": (100.0, 101.5)},
        {"name": "Central Gulf", "lat": (10.0, 12.5), "lon": (99.5, 102.5)},
        {"name": "Lower Gulf", "lat": (6.5, 10.0), "lon": (99.5, 103.0)},
        {"name": "Upper Andaman", "lat": (9.0, 11.5), "lon": (97.5, 98.5)},
        {"name": "Lower Andaman", "lat": (6.5, 9.0), "lon": (97.5, 99.0)}
    ]
    
    header = []
    catch = []
    water_ql = []
    
    # Generate 3000 stations for ultra-smooth distribution
    for i in range(1, 3001):
        link = f"mock_{202501000 + i}"
        date = datetime(2024, 1, 1) + timedelta(days=random.randint(0, 500))
        date_str = date.strftime("%Y-%m-%d")
        
        # Pick a random marine zone
        zone_info = random.choice(marine_zones)
        lat = random.uniform(zone_info["lat"][0], zone_info["lat"][1])
        lon = random.uniform(zone_info["lon"][0], zone_info["lon"][1])
        
        # Strict exclusion of Vietnam (anything East of 103.0)
        if lon > 103.0:
            continue
            
        # Strict land exclusion for Thailand
        is_on_land = False
        if lat > 12.8 and 99.8 < lon < 101.5: # Central
            is_on_land = True
        if 7.0 < lat < 12.8 and 98.5 < lon < 99.8: # Peninsula
            is_on_land = True
        if 11.5 < lat < 13.5 and lon > 101.5: # Eastern coast
            is_on_land = True
            
        if is_on_land:
            continue

        station_id = f"{i:04d}"
        zone = "Andaman" if lon < 99.5 else "Gulf"
        
        header.append({
            "Link": link,
            "Date": date_str,
            "LatStart": lat,
            "LongStart": lon,
            "Depth": random.uniform(15, 65),
            "Tow": 60,
            "Station": station_id,
            "Zone": zone,
            "Course": random.choice(["N", "S", "E", "W"])
        })
        
        # Create ultra-intense and smooth clusters
        # Hotspot 1: Gulf Central (11.0N, 101.2E)
        # Hotspot 2: Andaman South (7.5N, 98.2E)
        # Hotspot 3: Lower Gulf (8.5N, 100.5E)
        dist_h1 = ((lat - 11.0)**2 + (lon - 101.2)**2)**0.5
        dist_h2 = ((lat - 7.5)**2 + (lon - 98.2)**2)**0.5
        dist_h3 = ((lat - 8.5)**2 + (lon - 100.5)**2)**0.5
        
        min_dist = min(dist_h1, dist_h2, dist_h3)
        
        if min_dist < 0.5:
            weight = random.uniform(1200, 2500)
        elif min_dist < 1.5:
            weight = random.uniform(400, 800)
        else:
            weight = random.uniform(10, 60)
            
        catch.append({
            "Link": link,
            "total_weight": weight
        })
        
        water_ql.append({
            "year": date.year,
            "month": date.month,
            "station": station_id,
            "Temp_surface": random.uniform(27, 32),
            "DO_surface": random.uniform(4, 8),
            "Salinity_surface": random.uniform(30, 35)
        })
        
    mock_data = {
        "header": header,
        "catch": catch,
        "Water_QL": water_ql
    }
    
    with open("/Users/onlyup/Desktop/demo-boat-research/cmdec_mock.json", "w") as f:
        json.dump(mock_data, f, indent=2)

if __name__ == "__main__":
    generate_mock_data()
