#!/usr/bin/env python3
"""Prepare and finalize a distinct, phone-friendly second batch from Microban."""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs' / 'level-research'
with (ROOT / 'catalog.csv').open(encoding='utf-8', newline='') as file:
    catalog = list(csv.DictReader(file))

pool = [row for row in catalog if row['source'] == 'Microban'
        and int(row['source_no']) >= 41
        and row['mainline_screening'] == '主线候选'
        and not row['same_as_local']
        and int(row['source_no']) not in (93, 98)]
assert len(pool) == 104
assert len({row['signature'] for row in pool}) == 104
extras = [row for row in catalog if row['source'] == 'Mas Microban'
          and row['mainline_screening'] == '主线候选'
          and int(row['boxes']) <= 4][:20]
assert len(extras) == 20
assert not {row['signature'] for row in pool} & {row['signature'] for row in extras}

fields = ['candidate_no', 'source', 'source_no', 'id', 'boxes', 'size',
          'small_screen_cell_px', 'category', 'min_steps', 'review_status']


def write(name, rows):
    with (ROOT / name).open('w', encoding='utf-8', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for number, row in enumerate(rows, 1):
            writer.writerow({**{field: row.get(field, '') for field in fields},
                             'candidate_no': number,
                             'review_status': '待玩家试玩复核（求解结果见验证文件）'})


if sys.argv[1:] == ['--pool']:
    write('future-100-pool.csv', pool)
    write('future-extra-pool.csv', extras)
    print(json.dumps({'microban_pool': len(pool), 'extra_pool': len(extras)}, ensure_ascii=False))
elif sys.argv[1:] == ['--final']:
    report = json.loads((ROOT / 'future-pool-verification.json').read_text(encoding='utf-8'))
    extra_report = json.loads((ROOT / 'future-extra-verification.json').read_text(encoding='utf-8'))
    assert report['total'] == len(pool)
    assert extra_report['total'] == len(extras)
    assert all(result['source'] == row['source']
               and result['source_no'] == int(row['source_no'])
               for result, row in zip(report['results'], pool))
    assert all(result['source'] == row['source']
               and result['source_no'] == int(row['source_no'])
               for result, row in zip(extra_report['results'], extras))
    picked = ([row for row, result in zip(pool, report['results'])
               if result['status'] == 'verified']
              + [row for row, result in zip(extras, extra_report['results'])
                 if result['status'] == 'verified'])[:100]
    assert len(picked) == 100
    assert len({row['signature'] for row in picked}) == 100
    write('future-100-candidates.csv', picked)
    print(json.dumps({'selected': len(picked),
                      'sources': {source: sum(row['source'] == source for row in picked)
                                  for source in sorted({row['source'] for row in picked})}},
                     ensure_ascii=False))
else:
    raise SystemExit('Usage: build-future-levels.py --pool|--final')
