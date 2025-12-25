import json
import sys

def remove_point(link_id, file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        original_header_count = len(data.get('header', []))
        original_catch_count = len(data.get('catch', []))
        
        # Filter out the point from header
        if 'header' in data:
            data['header'] = [row for row in data['header'] if row.get('Link') != link_id]
            
        # Filter out the point from catch
        if 'catch' in data:
            data['catch'] = [row for row in data['catch'] if row.get('Link') != link_id]
            
        new_header_count = len(data.get('header', []))
        new_catch_count = len(data.get('catch', []))
        
        if original_header_count == new_header_count and original_catch_count == new_catch_count:
            print(f"Point {link_id} not found in {file_path}")
        else:
            print(f"Removed point {link_id} from {file_path}")
            print(f"Header rows: {original_header_count} -> {new_header_count}")
            print(f"Catch rows: {original_catch_count} -> {new_catch_count}")
            
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
                
    except Exception as e:
        print(f"Error removing point: {e}")

if __name__ == "__main__":
    remove_point('em202512260', 'public/cmdec_mock.json')
