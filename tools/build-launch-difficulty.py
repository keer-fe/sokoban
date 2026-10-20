#!/usr/bin/env python3
"""Rank the verified launch candidates by a transparent, provisional difficulty proxy."""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs' / 'level-research'
verification_file = sys.argv[1] if len(sys.argv) > 1 else 'launch-100-verification.json'
output_file = sys.argv[2] if len(sys.argv) > 2 else 'launch-100-difficulty.csv'
verification = json.loads((ROOT / verification_file).read_text(encoding='utf-8'))
rows = verification['results']
assert verification['total'] == 100 and verification['verified'] == 100


def proxy(row):
    # Integer units are twice the displayed score, avoiding floating point ties.
    return (2 * row['pushes'] + 4 * row['directionChanges']
            + 3 * row['boxSwitches'] + 6 * row['goalExits']
            + 6 * (row['boxes'] - 1))


scores = sorted(proxy(row) for row in rows)
cuts = [scores[i] for i in (9, 34, 69, 89)]


def stars(score):
    return 1 + sum(score > cut for cut in cuts)


with (ROOT / output_file).open('w', encoding='utf-8', newline='') as file:
    fields = ['candidate_no', 'source', 'source_no', 'boxes', 'size', 'solution_steps',
              'pushes', 'direction_changes', 'box_switches', 'goal_exits',
              'proxy_score', 'estimated_stars', 'rating_status']
    writer = csv.DictWriter(file, fieldnames=fields)
    writer.writeheader()
    for row in rows:
        score = proxy(row)
        writer.writerow({
            'candidate_no': row['candidate_no'], 'source': row['source'],
            'source_no': row['source_no'], 'boxes': row['boxes'], 'size': row['size'],
            'solution_steps': row['steps'], 'pushes': row['pushes'],
            'direction_changes': row['directionChanges'],
            'box_switches': row['boxSwitches'], 'goal_exits': row['goalExits'],
            'proxy_score': score / 2, 'estimated_stars': stars(score),
            'rating_status': '预估·待玩家试玩校准',
        })

print(json.dumps({'total': len(rows), 'cuts': [cut / 2 for cut in cuts],
                  'stars': {str(n): sum(stars(proxy(row)) == n for row in rows)
                            for n in range(1, 6)}}, ensure_ascii=False))
