#!/usr/bin/env python3
"""Build a research catalog without changing the game's runtime levels."""

import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'level-research'
SKINNER = 'https://www.onlinespiele-sammlung.de/sokoban/sokobangames/skinner/'
BOXOBAN = 'https://raw.githubusercontent.com/google-deepmind/boxoban-levels/master/'
PACKS = {
    'Microban': 'm1.txt', 'Mas Microban': 'm2.txt', 'Microban III': 'm3.txt',
    'Sasquatch': 's1.txt', 'Mas Sasquatch': 's2.txt',
    'Sasquatch III': 's3.txt', 'Sasquatch IV': 's4.txt',
    'Sasquatch V': 's5.txt', 'Sasquatch VI': 's6.txt',
    'Sasquatch VII': 's7.txt', 'Sasquatch VIII': 's8.txt',
}
TILES = '_# .$*@+'


def fetch(url):
    with urlopen(url, timeout=30) as response:
        return response.read().decode('latin-1')


def parse(text):
    number, rows = None, []
    for line in text.splitlines() + ['; end']:
        line = line.rstrip('\r\n')
        if line.startswith(';'):
            if number is not None and rows:
                yield number, rows
            part = line[1:].strip().split()
            number = int(part[0]) if part and part[0].isdigit() else None
            rows = []
        elif number is not None:
            if line and set(line) <= set(' #.$*@+_-'):
                rows.append(line.replace('-', '_'))


def normalize(rows):
    width = max(map(len, rows))
    grid = [list(row.ljust(width, '_')) for row in rows]
    # XSB uses spaces both for walkable floor and for the empty area outside
    # irregular walls. Flood-fill from the edge to make that convention explicit.
    height = len(grid)
    edge = [(x, y) for y in range(height) for x in (0, width - 1)]
    edge += [(x, y) for x in range(width) for y in (0, height - 1)]
    seen = set()
    while edge:
        x, y = edge.pop()
        if (x, y) in seen or not (0 <= x < width and 0 <= y < height):
            continue
        if grid[y][x] not in ' _':
            continue
        seen.add((x, y))
        grid[y][x] = '_'
        edge.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    grid = [''.join(row) for row in grid]
    occupied = [(x, y) for y, row in enumerate(grid) for x, c in enumerate(row) if c != '_']
    left, right = min(x for x, _ in occupied), max(x for x, _ in occupied)
    top, bottom = min(y for _, y in occupied), max(y for _, y in occupied)
    return [row[left:right + 1] for row in grid[top:bottom + 1]]


def signature(rows):
    return hashlib.sha256('\n'.join(normalize(rows)).encode()).hexdigest()[:16]


def category(boxes, floors):
    if boxes <= 2 and floors <= 30:
        return '微型解谜'
    if boxes <= 4 and floors <= 55:
        return '小型规划'
    if boxes <= 8 and floors <= 100:
        return '中型规划'
    return '大型挑战'


def item(source, number, rows, url, min_steps=''):
    rows = normalize(rows)
    chars = ''.join(rows)
    boxes = sum(chars.count(c) for c in '$*')
    goals = sum(chars.count(c) for c in '.*+')
    players = chars.count('@') + chars.count('+')
    if boxes != goals or players != 1 or not boxes:
        raise ValueError(f'{source} #{number}: invalid boxes/goals/player: {boxes}/{goals}/{players}')
    floors = sum(chars.count(c) for c in ' .$*@+')
    width, height = max(map(len, rows)), len(rows)
    # GamePage.boardBounds is 354×468 logical units on the 320×568 test viewport;
    # createViewport scales it to 0.7282 of that size in screen pixels.
    small_screen_cell = round(min(354 / width, 468 / height) * (568 / 780), 1)
    too_small = small_screen_cell < 16
    too_many_boxes = boxes > 8
    return {
        'source': source, 'source_no': number, 'id': f'selfboot-{number}' if source == '本地经典' else '',
        'width': width, 'height': height,
        'size': f'{width}×{height}', 'boxes': boxes, 'floors': floors,
        'small_screen_cell_px': small_screen_cell,
        'too_small_on_phone': '是' if too_small else '否',
        'too_many_boxes': '是' if too_many_boxes else '否',
        'mainline_screening': '建议排除主线' if too_small or too_many_boxes else '主线候选',
        'category': category(boxes, floors), 'min_steps': min_steps, 'playtest_rating': '',
        'signature': signature(rows), 'same_as_local': '', 'source_url': url,
        'rows': json.dumps(rows, ensure_ascii=False, separators=(',', ':')),
    }


def main():
    originals = json.loads((ROOT / 'docs' / 'levels-original.json').read_text())['levels']
    steps_text = (ROOT / 'src' / 'game' / 'minimum-steps.js').read_text()
    # The step table is metadata only; unverified maps keep a blank value.
    import re
    known = {int(n): int(v) for n, v in re.findall(r'["\x27]?(\d+)["\x27]?\s*:\s*(\d+)', steps_text)}
    records = []
    local_url = 'docs/levels-original.json'
    for n, grid in enumerate(originals, 1):
        records.append(item('本地经典', n, [''.join(TILES[cell] for cell in row) for row in grid],
                            local_url, known.get(n, '')))
    for name, filename in PACKS.items():
        url = SKINNER + filename
        for n, rows in parse(fetch(url)):
            records.append(item(name, n, rows, url))
    for name, files in {
        'Boxoban Hard': [f'hard/{n:03}.txt' for n in range(4)],
        'Boxoban Medium 样本': ['medium/train/000.txt'],
        'Boxoban Unfiltered 样本': ['unfiltered/test/000.txt'],
    }.items():
        for filename in files:
            url = BOXOBAN + filename
            for n, rows in parse(fetch(url)):
                records.append(item(name, f'{Path(filename).stem}-{n}', rows, url))

    local = defaultdict(list)
    for row in records[:100]:
        local[row['signature']].append(row['id'])
    for row in records[100:]:
        row['same_as_local'] = '|'.join(local[row['signature']])
    counts = Counter(row['source'] for row in records)
    duplicates = Counter(row['source'] for row in records[100:] if row['same_as_local'])
    screening = Counter((row['too_small_on_phone'], row['too_many_boxes']) for row in records)
    unique = len({row['signature'] for row in records})
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / 'catalog.csv').open('w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
    first_group = [row for row in records if row['source'] == '本地经典'
                   and 1 <= int(row['source_no']) <= 40]
    second_group = [row for row in records if row['source'] == 'Microban'
                    and 41 <= int(row['source_no']) <= 104
                    and int(row['source_no']) not in (93, 98)
                    and row['mainline_screening'] == '主线候选'
                    and not row['same_as_local']]
    shortlist = first_group + second_group
    assert len(first_group) == 40 and len(second_group) == 60 and len(shortlist) == 100
    with (OUT / 'launch-100-candidates.csv').open('w', newline='', encoding='utf-8') as file:
        fields = ['candidate_no', 'source', 'source_no', 'id', 'boxes', 'size',
                  'small_screen_cell_px', 'category', 'min_steps', 'review_status']
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for number, row in enumerate(shortlist, 1):
            writer.writerow({**{field: row.get(field, '') for field in fields},
                             'candidate_no': number, 'review_status': '待玩家试玩复核（求解结果见验证文件）'})
    summary = [
        '# 单人地图素材分类', '',
        '按地图几何尺寸、箱子数和可行走格数作初筛。分类是**结构分类，不是试玩难度**。',
        '完整地图、来源编号、箱子数、尺寸、分类和与本地地图的重复关系见 [catalog.csv](catalog.csv)。', '',
        f'共收录 **{len(records)}** 条地图记录，去除完全相同布局后 **{unique}** 张。', '',
        '| 来源 | 收录 | 与本地 100 关完全相同 | 微型解谜 | 小型规划 | 中型规划 | 大型挑战 |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ]
    for source, count in counts.items():
        group = [row for row in records if row['source'] == source]
        kinds = Counter(row['category'] for row in group)
        summary.append('| ' + ' | '.join(map(str, [source, count, duplicates[source],
            kinds['微型解谜'], kinds['小型规划'], kinds['中型规划'], kinds['大型挑战']])) + ' |')
    summary += ['', '## 本地 100 关逐关清单', '',
        '| 当前关卡 | 箱子 | 尺寸（宽×高） | 结构分类 | 小屏单格 | 整图过小 | 箱子过多 | 主线初筛 | 已验证最少步数 | 试玩难度 |',
        '| ---: | ---: | ---: | --- | ---: | --- | --- | --- | ---: | --- |',
    ]
    for row in records[:100]:
        summary.append(f'| {row["source_no"]} | {row["boxes"]} | {row["size"]} | '
                       f'{row["category"]} | {row["small_screen_cell_px"]} px | '
                       f'{row["too_small_on_phone"]} | {row["too_many_boxes"]} | '
                       f'{row["mainline_screening"]} | {row["min_steps"] or "—"} | 待测 |')
    summary += ['', '## 手机主线初筛', '',
        '本项目棋盘会按地图尺寸缩放；“整图过小”表示全图显示时单格太小，不表示地图无法载入。',
        '以项目现有 320×568 小屏布局为基准，棋盘可用区域为 354×468 逻辑单位，缩放比例约 0.728。',
        '全图单格低于 16 屏幕像素标为“整图过小”；箱子数大于 8 标为“箱子过多”。这两条是主线筛选阈值，不是关卡难度评级。', '',
        '| 初筛原因 | 地图数 |', '| --- | ---: |',
        f'| 两项均未触发 | {screening[("否", "否")]} |',
        f'| 仅整图过小 | {screening[("是", "否")]} |',
        f'| 仅箱子过多 | {screening[("否", "是")]} |',
        f'| 两项都触发 | {screening[("是", "是")]} |',
        '',
    ]
    summary += ['## 首发与后续批次', '',
        '经典模式正式第 1 关已固定为 `classic-learn-1`：1 箱、8×3、最少 4 步，先走两步再推两次。它是新设计的教学图，不在以下 6186 条收集素材中。游戏当前保持 100 关：教学图加本地原始第 1–99 关；原始第 100 关仍留在素材目录。',
        '后续上线批次另选 100 张，见 [future-100-release.csv](future-100-release.csv) 和含完整棋盘的 [future-100-levels.json](future-100-levels.json)。暂编为第 101–200 关，按预估难度从低到高排列；这是审阅顺序，尚未加入游戏运行关卡。',
        '其中 Microban 91 张、Mas Microban 9 张；均通过小屏与箱数初筛，不与本地原始 100 关或彼此重复。100/100 已由求解器和游戏引擎逐步回放验证，见 [future-100-verification.json](future-100-verification.json)。',
        '每关的尺寸、箱数、推箱次数和预估星级见 [future-100-difficulty.csv](future-100-difficulty.csv)。外部地图求得的是一条可行解，不保证最少步数。上线前仍需试玩校准星级和顺序。', '',
        '## 双人 PK 独立题库', '',
        '已从 Mas Microban 另选 24 张作为邀请式、双设备 PK 题库，见 [pk-bank.csv](pk-bank.csv) 和完整棋盘 [pk-bank.json](pk-bank.json)。短局、常规、进阶各 8 张；均为 2–4 箱，并通过小屏初筛，不与首发原始地图、后续 100 关或题库内其他地图重复。',
        '24/24 已通过求解器及游戏引擎逐步回放，见 [pk-bank-verification.json](pk-bank-verification.json)。分组依据一条已验证解的步数、推箱数和移出目标点次数，仍需双人试玩校准实际局长。PK 建房已从该题库抽题，合作模式继续使用原有地图。',
        '现有 PK 胜负按步数优先、用时打破同一步数的平局；云端房间记录玩家提交的结果。静态验证不等于两台真机的联机生命周期验证。', '',
        '## 旧首轮备选池（研究记录）', '',
        '以下清单是此前讨论首发重选时建立的备选池。当前首发方案已确定为游戏内 100 关，此清单不再代表首发关单。',
        '候选清单见 [launch-100-candidates.csv](launch-100-candidates.csv)。',
        '取本地第 1–40 关，加 Microban 第 41–104 关中通过小屏和箱数初筛的 60 关；Microban 第 63、99 关整图过小，未入选。',
        'Microban 第 93、98 关在首轮求解预算内未得到解，暂不进入备选池；这不表示地图无解。',
        '这 100 张已通过求解器验证和游戏引擎逐步回放，结果见 [launch-100-verification.json](launch-100-verification.json)。candidate_no 是检索序号，不是最终游玩顺序。',
        '上线前仍需玩家试玩，用首次通关率、耗时、重开次数和卡点重新编排；体验差的关卡从其他合格素材中替换。', '',
        '## 预估难度星级', '',
        '旧备选池的预估星级见 [launch-100-difficulty.csv](launch-100-difficulty.csv)。后续批次的星级另行按自身 100 张分档；不同批次的星级不宜直接比较。星级不是实测难度，也不是玩家通关奖励星数。',
        '验证脚本逐步回放一条解，记录推箱次数 P、同一箱子的变向次数 D、连续两次推不同箱子的次数 S、箱子从目标点移出的次数 G、箱数 B。复杂度分 = P + 2D + 1.5S + 3G + 3(B−1)。',
        '按这 100 张的复杂度分从低到高分档：前 10% 为 1 星，随后 25% 为 2 星、35% 为 3 星、20% 为 4 星、最后 10% 为 5 星；同分保持同一星级。求解路径对多数外部地图不保证最短，因此这些指标只是代理值。',
        '试玩时每个星级抽取代表地图，记录首次通关率、耗时、重开次数和卡点，再调整星级及最终关卡顺序。', '',
    ]
    summary += ['## 分类规则', '',
        '- 微型解谜：最多 2 箱，最多 30 个可行走格。',
        '- 小型规划：最多 4 箱，最多 55 个可行走格。',
        '- 中型规划：最多 8 箱，最多 100 个可行走格。',
        '- 大型挑战：其余地图。', '',
        '比较重复时去掉外侧空白；墙、地面、目标、箱子和玩家位置必须完全相同。',
        '本地第 1–40 关与 Microban 的第 1–40 关相同，其中前两关顺序对调；其余 60 关未在已收录素材中找到完全相同布局。',
        '本地已标定的最少步数直接读取项目数据，外部地图的该列留空，不代表不可解。',
        '尺寸按包含墙体的最小外接矩形计算，宽×高；不是手机屏幕上的像素尺寸。',
        'Boxoban Medium 与 Unfiltered 各只抽取一个 1000 关文件；Hard 收录 000–003 文件。',
        '本目录只供设计研究，不会进入游戏运行时目录。', '',
        '## 实际游玩难度评级', '',
        '不能从箱子数、地图尺寸、最少步数或 Boxoban 的数据集标签直接得出玩家难度。',
        '先用求解器确认可解并记录最短步数；再让至少 8 位目标玩家盲玩，每关最多 10 分钟，记录：', '',
        '- 10 分钟内独立通关率（不看提示、不看解答）。',
        '- 通关者的中位耗时，以及中位重开次数。',
        '- 卡点发生在哪次推箱或哪条错误路线；提示使用另记，不计入独立通关。', '',
        '| 试玩评级 | 建议初始判定线 |',
        '| --- | --- |',
        '| 入门 | 独立通关率 ≥ 80%，通关中位耗时 ≤ 3 分钟。 |',
        '| 普通 | 独立通关率 ≥ 70%，通关中位耗时 ≤ 5 分钟。 |',
        '| 困难 | 独立通关率 ≥ 50%，通关中位耗时 ≤ 10 分钟。 |',
        '| 专家 | 未达到困难线；先检查是否存在难以察觉的规则或不合理死局。 |', '',
        '从上到下取首个满足的档位。上述阈值是首版校准规则，积累玩家数据后按目标受众调整。',
        'catalog.csv 的 playtest_rating 暂留空，只有完成试玩后才填写；重新运行脚本会重建该文件。', '',
        '## 来源', '',
        f'- 本地经典：[{local_url}](../levels-original.json)',
        f'- David W. Skinner 地图集：[{SKINNER}]({SKINNER})',
        f'- Boxoban：[{BOXOBAN}]({BOXOBAN})', '',
    ]
    (OUT / 'README.md').write_text('\n'.join(summary), encoding='utf-8')
    print(json.dumps({'records': len(records), 'unique': unique, 'sources': counts,
                      'local_duplicates': duplicates}, ensure_ascii=False))


if __name__ == '__main__':
    main()
