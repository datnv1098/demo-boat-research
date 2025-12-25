import json

def match_density(source_id, target_id, file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)

    # Find source weights
    source_weights = []
    if 'catch' in data:
        for row in data['catch']:
            if row.get('Link') == source_id:
                source_weights.append(row.get('total_weight', 0))
    
    if not source_weights:
        print(f"No weights found for source ID: {source_id}")
        return

    print(f"Found {len(source_weights)} weights for {source_id}: {source_weights}")

    # Update target weights
    updated_count = 0
    if 'catch' in data:
        for row in data['catch']:
            if row.get('Link') == target_id:
                # Use modulo to cycle through source weights if target has more entries
                new_weight = source_weights[updated_count % len(source_weights)]
                row['total_weight'] = new_weight
                updated_count += 1

    print(f"Updated {updated_count} entries for {target_id} with weights from {source_id}")

    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    # Source: em202403024, Target: em202508222
    match_density('em202403024', 'em202508222', 'public/cmdec_mock.json')
