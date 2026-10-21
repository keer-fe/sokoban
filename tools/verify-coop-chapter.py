"""Exact step-cost A* over the playable chapter's shared data; no file writes.

Reverse-push distances ignore doors/actors, giving an admissible lower bound.
Exhaustion with one actor frozen proves that actor must leave their start.
"""
import argparse
import heapq
import itertools
import json
import subprocess
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read_maps():
    return json.loads(subprocess.check_output([
        'node', '-e', 'const vm=require("node:vm"),fs=require("node:fs");'
        'vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));'
        'process.stdout.write(JSON.stringify(globalThis.COOP_MAPS));',
        str(ROOT / 'docs/coop-level-data.js')], text=True))

def solve(rows, frozen=None, limit=2000000):
    width = len(rows[0])
    assert all(len(r) == width for r in rows), 'Non-rectangular map'
    assert all(c == '#' for c in rows[0] + rows[-1])
    assert all(r[0] == r[-1] == '#' for r in rows)
    text = ''.join(rows)
    assert all(c in '# 12$.abAB' for c in text), 'Unknown tile'
    assert text.count('1') == text.count('2') == 1
    cells = {i: c for i, c in enumerate(text) if c != '#'}
    players = (text.index('1'), text.index('2'))
    boxes = tuple(i for i, c in cells.items() if c == '$')
    goals = tuple(i for i, c in cells.items() if c == '.')
    assert len(boxes) == len(goals) > 0
    plates = {c: p for p, c in cells.items() if c in 'ab'}
    for door in 'AB':
        assert text.count(door.lower()) <= 1
        assert (door in text) == (door.lower() in text)
    doors = {p: plates[c.lower()] for p, c in cells.items() if c in 'AB'}
    deltas = [('↑', -width), ('↓', width), ('←', -1), ('→', 1)]
    neighbors = {p: [(direction, p + delta, p + 2 * delta)
                     for direction, delta in deltas if p + delta in cells] for p in cells}
    distances = []
    for goal in goals:
        distance = {goal: 0}
        queue = deque([goal])
        while queue:
            pos = queue.popleft()
            for _, delta in deltas:
                prior = pos - delta
                if prior in cells and prior - delta in cells and prior not in distance:
                    distance[prior] = distance[pos] + 1
                    queue.append(prior)
        distances.append(distance)
    goal_set = set(goals)
    safe = set().union(*(set(d) for d in distances))
    heuristic_cache = {}
    def heuristic(bs):
        if bs not in heuristic_cache:
            heuristic_cache[bs] = min(sum(distances[i].get(p, 10**6)
                for i, p in enumerate(order)) for order in itertools.permutations(bs))
        return heuristic_cache[bs]
    start = (*players, boxes)
    queue = [(heuristic(boxes), 0, start)]
    costs = {start: 0}
    previous = {start: None}
    while queue:
        _, cost, state = heapq.heappop(queue)
        if costs.get(state) != cost:
            continue
        if set(state[2]) == goal_set:
            moves = []
            while previous[state] is not None:
                state, move = previous[state]
                moves.append(move)
            return list(reversed(moves)), len(costs)
        occupied = {*state[:2], *state[2]}
        blocked_doors = {p for p, plate in doors.items() if plate not in occupied and p not in occupied}
        for actor in (0, 1):
            if actor == frozen:
                continue
            for direction, nxt, target in neighbors[state[actor]]:
                if nxt in blocked_doors or nxt == state[1 - actor]:
                    continue
                bs = state[2]
                if nxt in bs:
                    if target not in safe or target in occupied or target in blocked_doors:
                        continue
                    bs = tuple(sorted(target if p == nxt else p for p in bs))
                successor = (nxt, state[1], bs) if actor == 0 else (state[0], nxt, bs)
                new_cost = cost + 1
                if new_cost < costs.get(successor, 10**9):
                    costs[successor] = new_cost
                    previous[successor] = (state, f'{actor + 1}{direction}')
                    heapq.heappush(queue, (new_cost + heuristic(bs), new_cost, successor))
                    if len(costs) > limit:
                        raise RuntimeError('Search limit reached; not an impossibility proof')
    return None, len(costs)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', type=int, default=1)
    parser.add_argument('--end', type=int, default=20)
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    for m in read_maps()[args.start-1:args.end]:
        path, count = solve(m[6])
        frozen = [solve(m[6], frozen=i)[0] is not None for i in (0, 1)]
        result = dict(id=m[0], name=m[1], steps=len(path) if path else None,
                      states=count, frozen_solvable=frozen, solution=' '.join(path or []))
        if args.json:
            print(json.dumps(result, ensure_ascii=False), flush=True)
        else:
            print(m[0], m[1], 'steps', result['steps'], 'states', count,
                  'frozen_solvable', frozen, flush=True)
            print(result['solution'], flush=True)
