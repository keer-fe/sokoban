"""Offline design verifier. These rules are prototypes, not runtime rules."""
from collections import deque

MAPS = [
    ("01", "你先过去", [
        "#########",
        "#1 a#   #",
        "#   A $ #",
        "# 2 # . #",
        "#   #   #",
        "#########",
    ]),
    ("02", "转个弯送到", [
        "##########",
        "#1 a#    #",
        "#   A $  #",
        "# 2 # # .#",
        "#   #    #",
        "##########",
    ]),
    ("03", "两箱入库", [
        "###########",
        "#1 a#     #",
        "#   A $ . #",
        "# 2 # $ . #",
        "#   #     #",
        "###########",
    ]),
    ("04", "换你接应我", [
        "###########",
        "#1 a#  b  #",
        "# # A     #",
        "# $ #     #",
        "# 2 B   . #",
        "#   #     #",
        "###########",
    ]),
    ("05", "双向送货", [
        "###########",
        "#1 a#  b  #",
        "# # A     #",
        "# $ # $   #",
        "# . B   . #",
        "# 2 #     #",
        "###########",
    ]),
    ("06", "一起收工", [
        "###########",
        "#1 a#  b  #",
        "# # A     #",
        "# $ # $   #",
        "#   B   . #",
        "# 2 #   . #",
        "###########",
    ]),
]


def solve(rows, frozen=None, limit=1500000):
    width = len(rows[0])
    assert all(len(r) == width for r in rows)
    cells = {y * width + x: c for y, row in enumerate(rows)
             for x, c in enumerate(row) if c != "#"}
    players = tuple(next(p for p, c in cells.items() if c == str(i)) for i in (1, 2))
    boxes = tuple(sorted(p for p, c in cells.items() if c == "$"))
    goals = {p for p, c in cells.items() if c == "."}
    assert len(goals) == len(boxes)
    plates = {c: p for p, c in cells.items() if c in "ab"}
    start = (*players, boxes)
    queue = deque([start])
    previous = {start: None}
    while queue:
        state = queue.popleft()
        if set(state[2]) == goals:
            moves = []
            while previous[state] is not None:
                state, move = previous[state]
                moves.append(move)
            return list(reversed(moves)), len(previous)
        for actor in (0, 1):
            if actor == frozen:
                continue
            occupied = {*state[:2], *state[2]}
            for direction, delta in (("↑", -width), ("↓", width), ("←", -1), ("→", 1)):
                nxt = state[actor] + delta
                def passable(p):
                    return p in cells and (cells[p] not in "AB" or
                        plates[cells[p].lower()] in occupied or p in occupied)
                if not passable(nxt) or nxt == state[1 - actor]:
                    continue
                new_boxes = list(state[2])
                if nxt in new_boxes:
                    target = nxt + delta
                    if not passable(target) or target in occupied:
                        continue
                    new_boxes[new_boxes.index(nxt)] = target
                people = list(state[:2])
                people[actor] = nxt
                successor = (*people, tuple(sorted(new_boxes)))
                if successor not in previous:
                    previous[successor] = (state, f"{actor + 1}{direction}")
                    queue.append(successor)
                    if len(previous) > limit:
                        raise RuntimeError("Search limit reached")
    return None, len(previous)


if __name__ == "__main__":
    for number, name, rows in MAPS:
        path, count = solve(rows)
        frozen_results = [solve(rows, frozen=i)[0] for i in (0, 1)]
        print(number, name, "steps", len(path) if path else None,
              "states", count, "frozen_solvable",
              [p is not None for p in frozen_results])
        print(" ".join(path or []))
