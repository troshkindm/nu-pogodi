import json
import math
import re
import sys

raw = json.load(open(sys.argv[1]))
affine = json.load(open('lcdart/affine.json'))
SMOOTH_PASSES = int(sys.argv[3]) if len(sys.argv) > 3 else 2
TOLERANCE = float(sys.argv[4]) if len(sys.argv) > 4 else 0.45
ax, ay = affine['x'], affine['y']


def to_layout(p):
    u, v = p
    return (ax[0] * u + ax[1] * v + ax[2], ay[0] * u + ay[1] * v + ay[2])


def subpaths(d):
    tokens = re.findall(r'[MLQZ]|-?\d+(?:\.\d+)?', d)
    paths, current, i = [], [], 0
    while i < len(tokens):
        cmd = tokens[i]; i += 1
        if cmd == 'M':
            if current:
                paths.append(current)
            current = [(float(tokens[i]), float(tokens[i + 1]))]; i += 2
        elif cmd == 'L':
            current.append((float(tokens[i]), float(tokens[i + 1]))); i += 2
        elif cmd == 'Q':
            c = (float(tokens[i]), float(tokens[i + 1])); e = (float(tokens[i + 2]), float(tokens[i + 3])); i += 4
            s = current[-1]
            current.append((0.25 * s[0] + 0.5 * c[0] + 0.25 * e[0], 0.25 * s[1] + 0.5 * c[1] + 0.25 * e[1]))
            current.append(e)
        elif cmd == 'Z':
            if current:
                paths.append(current)
            current = []
    if current:
        paths.append(current)
    return [p[:-1] if len(p) > 2 and p[0] == p[-1] else p for p in paths]


def resample(points, step=0.5):
    out = []
    n = len(points)
    for k in range(n):
        a, b = points[k], points[(k + 1) % n]
        length = math.dist(a, b)
        count = max(1, int(length / step))
        for j in range(count):
            t = j / count
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def smooth(points, passes):
    for _ in range(passes):
        n = len(points)
        points = [((points[k - 2][0] + 2 * points[k - 1][0] + 3 * points[k][0] + 2 * points[(k + 1) % n][0] + points[(k + 2) % n][0]) / 9,
                   (points[k - 2][1] + 2 * points[k - 1][1] + 3 * points[k][1] + 2 * points[(k + 1) % n][1] + points[(k + 2) % n][1]) / 9)
                  for k in range(n)]
    return points


def rdp(points, tolerance):
    if len(points) < 3:
        return points
    a, b = points[0], points[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    norm = math.hypot(dx, dy) or 1e-9
    distances = [abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / norm for p in points]
    index = max(range(len(points)), key=lambda k: distances[k])
    if distances[index] <= tolerance:
        return [a, b]
    return rdp(points[:index + 1], tolerance)[:-1] + rdp(points[index:], tolerance)


def simplify_closed(points, tolerance):
    far = max(range(len(points)), key=lambda k: math.dist(points[0], points[k]))
    first = rdp(points[:far + 1], tolerance)
    second = rdp(points[far:] + [points[0]], tolerance)
    return first[:-1] + second[:-1]


def bezier(points):
    n = len(points)
    if n < 3:
        return ''
    pts = [to_layout(p) for p in points]
    out = f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for k in range(n):
        p0, p1, p2, p3 = pts[k - 1], pts[k], pts[(k + 1) % n], pts[(k + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        out += f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return out + 'Z'


result = {}
for seg, d in raw.items():
    parts = []
    for path in subpaths(d):
        if len(path) < 4:
            continue
        dense = smooth(resample(path), SMOOTH_PASSES)
        simple = simplify_closed(dense, TOLERANCE)
        if len(simple) >= 3:
            parts.append(bezier(simple))
    result[seg] = ''.join(parts)
json.dump(result, open(sys.argv[2], 'w'))
print('segments', len(result), 'chars', sum(len(v) for v in result.values()))
