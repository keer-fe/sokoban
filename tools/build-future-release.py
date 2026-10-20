#!/usr/bin/env python3
"""Build a reviewable provisional 101–200 order from the verified second batch."""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs' / 'level-research'


def read(name):
    with (ROOT / name).open(encoding='utf-8', newline='') as file:
        return list(csv.DictReader(file))


candidates = read('future-100-candidates.csv')
ratings = {int(row['candidate_no']): row for row in read('future-100-difficulty.csv')}
assert len(candidates) == len(ratings) == 100
rows = [{**row, **ratings[int(row['candidate_no'])]} for row in candidates]
rows.sort(key=lambda row: (int(row['estimated_stars']), float(row['proxy_score']),
                           int(row['candidate_no'])))
catalog = {(row['source'], row['source_no']): row for row in read('catalog.csv')}

fields = ['level_no', 'source', 'source_no', 'boxes', 'size', 'small_screen_cell_px',
          'category', 'solution_steps', 'pushes', 'estimated_stars', 'proxy_score',
          'rating_status', 'source_url', 'signature', 'rows']
levels = []
with (ROOT / 'future-100-release.csv').open('w', encoding='utf-8', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=fields)
    writer.writeheader()
    for number, row in enumerate(rows, 101):
        original = catalog[row['source'], row['source_no']]
        writer.writerow({**{field: row.get(field, '') for field in fields},
                         'level_no': number, 'source_url': original['source_url'],
                         'signature': original['signature'], 'rows': original['rows']})
        levels.append({
            'id': f'future-{number}', 'provisionalLevelNo': number,
            'source': row['source'], 'sourceNo': int(row['source_no']),
            'sourceUrl': original['source_url'], 'signature': original['signature'],
            'boxCount': int(row['boxes']), 'estimatedDifficultyStars': int(row['estimated_stars']),
            'minimumSteps': None, 'verifiedSolutionSteps': int(row['solution_steps']),
            'rows': json.loads(original['rows']),
        })

(ROOT / 'future-100-levels.json').write_text(
    json.dumps({'status': 'planned', 'levels': levels}, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8')

print(f'Provisional levels 101–200: {len(rows)} verified maps')
