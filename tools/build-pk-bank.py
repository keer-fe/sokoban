#!/usr/bin/env python3
"""Build a compact, disjoint candidate bank for invited two-player PK rooms."""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs' / 'level-research'


def read(name):
    with (ROOT / name).open(encoding='utf-8', newline='') as file:
        return list(csv.DictReader(file))


catalog = read('catalog.csv')
future_signatures = {row['signature'] for row in read('future-100-release.csv')}
pool = [row for row in catalog if row['source'] == 'Mas Microban'
        and 10 <= int(row['source_no']) <= 100
        and row['mainline_screening'] == '主线候选'
        and 2 <= int(row['boxes']) <= 4
        and not row['same_as_local']
        and row['signature'] not in future_signatures]
assert len(pool) == 64
base_signatures = {row['signature'] for row in pool}
expansion = [row for row in catalog if row['source'] in ('Mas Microban', 'Microban III')
             and (row['source'] != 'Mas Microban' or int(row['source_no']) > 100)
             and row['mainline_screening'] == '主线候选'
             and 2 <= int(row['boxes']) <= 4
             and not row['same_as_local']
             and row['signature'] not in future_signatures | base_signatures]
expansion += [row for row in catalog if row['source'] == 'Boxoban Unfiltered 样本'
              and row['mainline_screening'] == '主线候选'
              and 2 <= int(row['boxes']) <= 4][:100]
assert len(expansion) == 160
assert len({row['signature'] for row in expansion}) == len(expansion)

fields = ['candidate_no', 'source', 'source_no', 'id', 'boxes', 'size',
          'small_screen_cell_px', 'category', 'min_steps', 'review_status']


def write_pool():
    with (ROOT / 'pk-pool.csv').open('w', encoding='utf-8', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for number, row in enumerate(pool, 1):
            writer.writerow({**{field: row.get(field, '') for field in fields},
                             'candidate_no': number, 'review_status': '待求解验证'})
    print(json.dumps({'pool': len(pool)}, ensure_ascii=False))


if sys.argv[1:] == ['--pool']:
    write_pool()
elif sys.argv[1:] == ['--expand-pool']:
    with (ROOT / 'pk-expansion-pool.csv').open('w', encoding='utf-8', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for number, row in enumerate(expansion, 1):
            writer.writerow({**{field: row.get(field, '') for field in fields},
                             'candidate_no': number, 'review_status': '待求解验证'})
    print(json.dumps({'expansion_pool': len(expansion)}, ensure_ascii=False))
elif sys.argv[1:] == ['--final']:
    report = json.loads((ROOT / 'pk-pool-verification.json').read_text(encoding='utf-8'))
    extra_report = json.loads((ROOT / 'pk-expansion-verification.json').read_text(encoding='utf-8'))
    assert report['total'] == len(pool)
    assert extra_report['total'] == len(expansion)
    assert all(result['source'] == row['source']
               and result['source_no'] == int(row['source_no'])
               for result, row in zip(report['results'], pool))
    assert all(result['source'] == row['source']
               and str(result['source_no']) == row['source_no']
               for result, row in zip(extra_report['results'], expansion))
    eligible = [(row, result) for row, result in zip(pool, report['results'])
                if result['status'] == 'verified'
                and 20 <= result['steps'] <= 85
                and 5 <= result['pushes'] <= 25
                and result['goalExits'] <= 6]
    eligible.sort(key=lambda pair: (pair[1]['steps'], int(pair[0]['source_no'])))
    original = eligible[:24]
    assert len(original) == 24
    extra_eligible = [(row, result) for row, result in zip(expansion, extra_report['results'])
                      if result['status'] == 'verified'
                      and 20 <= result['steps'] <= 85
                      and 5 <= result['pushes'] <= 35
                      and result['goalExits'] <= 8]
    microban_iii = sorted((pair for pair in extra_eligible if pair[0]['source'] == 'Microban III'),
                          key=lambda pair: (pair[1]['steps'], int(pair[0]['source_no'])))
    boxoban = sorted((pair for pair in extra_eligible if pair[0]['source'] == 'Boxoban Unfiltered 样本'),
                     key=lambda pair: (pair[1]['steps'], pair[0]['source_no']))
    assert len(microban_iii) >= 36 and len(boxoban) >= 60
    # Evenly sample the valid procedural levels across path lengths; keep the original 24 IDs stable.
    boxoban_sample = [boxoban[round(i * (len(boxoban) - 1) / 59)] for i in range(60)]
    selected = original + microban_iii[:36] + boxoban_sample
    assert len(selected) == 120
    assert len({row['signature'] for row, _ in selected}) == 120
    by_length = sorted(range(len(selected)), key=lambda index: (
        selected[index][1]['steps'], selected[index][1]['pushes'], index))
    tiers = {}
    for rank, index in enumerate(by_length):
        tiers[index] = ['短局', '常规', '进阶'][rank // 40]
    with (ROOT / 'pk-bank-candidates.csv').open('w', encoding='utf-8', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for number, (row, _) in enumerate(selected, 1):
            writer.writerow({**{field: row.get(field, '') for field in fields},
                             'candidate_no': number,
                             'review_status': '已求解回放，待双人试玩'})
    bank = []
    for number, (row, result) in enumerate(selected, 1):
        tier = tiers[number - 1]
        bank.append({
            'id': f'pk-bank-{number:03d}', 'bankNo': number, 'tier': tier,
            'source': row['source'], 'sourceNo': int(row['source_no'])
            if row['source_no'].isdigit() else row['source_no'],
            'sourceUrl': row['source_url'], 'signature': row['signature'],
            'boxCount': int(row['boxes']), 'width': int(row['width']),
            'height': int(row['height']), 'smallScreenCellPx': float(row['small_screen_cell_px']),
            'verifiedSolutionSteps': result['steps'], 'verifiedPushes': result['pushes'],
            'minimumSteps': None, 'rows': json.loads(row['rows']),
        })
    (ROOT / 'pk-bank.json').write_text(
        json.dumps({'status': 'bundled', 'mode': 'invited-two-device-pk', 'levels': bank},
                   ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    runtime = [{
        'id': row['id'], 'bankNo': row['bankNo'], 'tier': row['tier'],
        'campaign': 'pk', 'name': f"双人 PK · 第 {row['bankNo']} 题",
        'boxCount': row['boxCount'], 'minSteps': None, 'rows': row['rows'],
    } for row in bank]
    (ROOT.parents[1] / 'src' / 'game' / 'pk-bank.js').write_text(
        '// Generated by tools/build-pk-bank.py; run --final after verifying the pool.\n'
        'export const pkBank = Object.freeze('
        + json.dumps(runtime, ensure_ascii=False, separators=(',', ':')) + ');\n',
        encoding='utf-8')
    with (ROOT / 'pk-bank.csv').open('w', encoding='utf-8', newline='') as file:
        bank_fields = ['bank_no', 'tier', 'id', 'source', 'source_no', 'boxes', 'size',
                       'small_screen_cell_px', 'verified_solution_steps',
                       'verified_pushes', 'source_url', 'signature', 'rows']
        writer = csv.DictWriter(file, fieldnames=bank_fields)
        writer.writeheader()
        for row in bank:
            writer.writerow({
                'bank_no': row['bankNo'], 'tier': row['tier'], 'id': row['id'],
                'source': row['source'], 'source_no': row['sourceNo'],
                'boxes': row['boxCount'], 'size': f"{row['width']}×{row['height']}",
                'small_screen_cell_px': row['smallScreenCellPx'],
                'verified_solution_steps': row['verifiedSolutionSteps'],
                'verified_pushes': row['verifiedPushes'],
                'source_url': row['sourceUrl'], 'signature': row['signature'],
                'rows': json.dumps(row['rows'], ensure_ascii=False),
            })
    print(json.dumps({'selected': len(bank), 'tiers': {tier: 40 for tier in ('短局', '常规', '进阶')}},
                     ensure_ascii=False))
else:
    raise SystemExit('Usage: build-pk-bank.py --pool|--expand-pool|--final')
