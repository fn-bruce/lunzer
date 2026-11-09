"""Convert the public KCNA26 expo hall PDF into Lunzer venue data.

Usage: python build_venue.py map.pdf exhibitors.txt out.json
"""
import base64
import json
import sys

import pymupdf

CELL = 2.5  # PDF points per routing cell (~1.2 m)
METRES_PER_PT = 0.476  # 20 ft platinum booth = 12.9 pt

SPONSOR = {
    (0.7, 0.7, 0.71): "silver",
    (0.33, 0.66, 0.28): "startup",
    (1.0, 0.85, 0.41): "gold",
    (0.46, 0.61, 0.82): "platinum",
    (0.93, 0.1, 0.5): "diamond",
    (0.96, 0.53, 0.12): "media",
    (0.68, 0.47, 0.71): "enduser",
}
WHITE = (1.0, 1.0, 1.0)


def poly_of(d):
    pts = []
    for it in d["items"]:
        if it[0] == "re":
            r = it[1]
            return [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
        if it[0] == "qu":
            q = it[1]
            return [(q.ul.x, q.ul.y), (q.ur.x, q.ur.y), (q.lr.x, q.lr.y), (q.ll.x, q.ll.y)]
        if it[0] == "l":
            if not pts:
                pts.append((it[1].x, it[1].y))
            pts.append((it[2].x, it[2].y))
    if len(pts) > 2 and abs(pts[0][0] - pts[-1][0]) < 0.01 and abs(pts[0][1] - pts[-1][1]) < 0.01:
        pts.pop()
    return pts


def inside(pt, poly):
    x, y = pt
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def bbox(poly):
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    return min(xs), min(ys), max(xs), max(ys)


def area(poly):
    a = 0
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def r1(v):
    return round(v, 1)


def main(pdf, exhibitors_path, out):
    page = pymupdf.open(pdf)[0]
    draws = page.get_drawings()

    floors = []
    for d in draws[:6]:
        floors.append(poly_of(d))

    def on_floor(pt, tol=1.2):
        for dx, dy in ((0, 0), (tol, 0), (-tol, 0), (0, tol), (0, -tol)):
            if any(inside((pt[0] + dx, pt[1] + dy), f) for f in floors):
                return True
        return False

    obstacles = []
    for d in draws[6:]:
        f = d.get("fill")
        if not f:
            continue
        key = tuple(round(c, 2) for c in f)
        kind = SPONSOR.get(key)
        if not kind and key == WHITE and len(d["items"]) <= 8:
            kind = "block"
        if not kind:
            continue
        poly = poly_of(d)
        if len(poly) < 3:
            continue
        a = area(poly)
        if a < 12:
            continue
        x0, y0, x1, y1 = bbox(poly)
        c = ((x0 + x1) / 2, (y0 + y1) / 2)
        if not on_floor(c, 0):
            continue
        obstacles.append({"kind": kind, "poly": poly, "area": a, "c": c})

    # Drop shapes nested in a larger obstacle (e.g. kiosks drawn inside the pavilion inset).
    obstacles.sort(key=lambda o: -o["area"])
    kept = []
    for o in obstacles:
        if any(k["area"] > o["area"] * 1.5 and inside(o["c"], k["poly"]) for k in kept):
            continue
        kept.append(o)
    obstacles = kept

    # Booth numbers -> containing shape.
    words = page.get_text("words")
    booths = {}
    for w in words:
        t = w[4]
        if not (t.isdigit() and 100 <= int(t) <= 380):
            continue
        c = ((w[0] + w[2]) / 2, (w[1] + w[3]) / 2)
        if c[0] > 690:
            continue
        hits = [o for o in obstacles if inside(c, o["poly"])]
        if hits:
            o = min(hits, key=lambda o: o["area"])
            o.setdefault("nums", []).append(int(t))
            booths[int(t)] = {"num": int(t), "shape": o, "label": c}
        else:
            booths[int(t)] = {"num": int(t), "shape": None, "label": c}

    # Grid.
    fx0 = min(bbox(f)[0] for f in floors) - CELL
    fy0 = min(bbox(f)[1] for f in floors) - CELL
    fx1 = max(bbox(f)[2] for f in floors) + CELL
    fy1 = max(bbox(f)[3] for f in floors) + CELL
    cols = int((fx1 - fx0) / CELL) + 1
    rows = int((fy1 - fy0) / CELL) + 1
    grid = bytearray(cols * rows)
    for j in range(rows):
        for i in range(cols):
            p = (fx0 + (i + 0.5) * CELL, fy0 + (j + 0.5) * CELL)
            if on_floor(p, 0.9):
                grid[j * cols + i] = 1
    pad = 0.9
    for o in obstacles:
        x0, y0, x1, y1 = bbox(o["poly"])
        for j in range(max(0, int((y0 - pad - fy0) / CELL) - 1), min(rows, int((y1 + pad - fy0) / CELL) + 2)):
            for i in range(max(0, int((x0 - pad - fx0) / CELL) - 1), min(cols, int((x1 + pad - fx0) / CELL) + 2)):
                k = j * cols + i
                if not grid[k]:
                    continue
                cx, cy = fx0 + (i + 0.5) * CELL, fy0 + (j + 0.5) * CELL
                for dx, dy in ((0, 0), (pad, pad), (-pad, pad), (pad, -pad), (-pad, -pad)):
                    if inside((cx + dx, cy + dy), o["poly"]):
                        grid[k] = 0
                        break
    bits = bytearray((cols * rows + 7) // 8)
    for k, v in enumerate(grid):
        if v:
            bits[k >> 3] |= 1 << (k & 7)

    exhibitors = []
    for line in open(exhibitors_path, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        name, nums = line.split("|")
        exhibitors.append({"name": name, "booths": [int(n) for n in nums.split(",")]})

    data = {
        "source": "KubeCon + CloudNativeCon North America 2026 expo hall map (public PDF, Linux Foundation)",
        "metresPerUnit": METRES_PER_PT,
        "grid": {"x0": r1(fx0), "y0": r1(fy0), "cell": CELL, "cols": cols, "rows": rows,
                 "bits": base64.b64encode(bytes(bits)).decode()},
        "floors": [[[r1(x), r1(y)] for x, y in f] for f in floors],
        "obstacles": [{"kind": o["kind"], "poly": [[r1(x), r1(y)] for x, y in o["poly"]], **({"nums": o["nums"]} if "nums" in o else {})} for o in obstacles],
        "booths": [{"num": b["num"], "x": r1(b["label"][0]), "y": r1(b["label"][1]),
                    **({"poly": [[r1(x), r1(y)] for x, y in b["shape"]["poly"]], "level": b["shape"]["kind"]} if b["shape"] else {})}
                   for b in sorted(booths.values(), key=lambda b: b["num"])],
        "exhibitors": exhibitors,
    }
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, separators=(",", ":"))
    found = {b["num"] for b in data["booths"]}
    missing = sorted({n for e in exhibitors for n in e["booths"]} - found)
    print("floors", len(floors), "obstacles", len(obstacles), "booths", len(found), "grid", cols, rows,
          "walkable", sum(grid), "missing exhibitor booths", missing)
    print("booths without shape", [b["num"] for b in booths.values() if not b["shape"]])


if __name__ == "__main__":
    main(*sys.argv[1:4])
