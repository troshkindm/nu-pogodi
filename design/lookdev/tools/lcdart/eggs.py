import json
import math
from PIL import Image

meta = json.load(open('lcdart/segindex.json'))
index = Image.open('lcdart/segindex.png').convert('RGB')
W, H = index.size
ip = index.load()
ax, ay = meta['affine']['x'], meta['affine']['y']
EGGS = ['3.0.1', '3.0.0', '3.1.0', '3.1.1', '3.2.1', '3.2.0', '3.3.0', '3.3.1', '2.0.1', '2.0.0',
        '7.0.1', '8.3.1', '8.3.0', '8.2.0', '8.2.1', '8.1.0', '8.1.1', '8.0.0', '8.0.1', '0.3.1']


def to_layout(u, v):
    return (ax[0] * u + ax[1] * v + ax[2], ay[0] * u + ay[1] * v + ay[2])


def ring(cx, cy, a, b, angle, steps=56, reverse=False):
    points = []
    for k in range(steps):
        t = 2 * math.pi * k / steps * (-1 if reverse else 1)
        x = cx + a * math.cos(t) * math.cos(angle) - b * math.sin(t) * math.sin(angle)
        y = cy + a * math.cos(t) * math.sin(angle) + b * math.sin(t) * math.cos(angle)
        points.append(to_layout(x, y))
    return 'M ' + ' L '.join(f'{x:.1f} {y:.1f}' for x, y in points) + ' Z'


out = {}
for seg in EGGS:
    info = meta['segments'][seg]
    bx, by, bw, bh = info['box']
    pts = [(x, y) for y in range(by, by + bh) for x in range(bx, bx + bw) if ip[x, y][0] == info['code']]
    n = len(pts)
    mx = sum(p[0] for p in pts) / n; my = sum(p[1] for p in pts) / n
    sxx = sum((p[0] - mx) ** 2 for p in pts) / n
    syy = sum((p[1] - my) ** 2 for p in pts) / n
    sxy = sum((p[0] - mx) * (p[1] - my) for p in pts) / n
    angle = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ca, sa = math.cos(angle), math.sin(angle)
    along = [(p[0] - mx) * ca + (p[1] - my) * sa for p in pts]
    across = [-(p[0] - mx) * sa + (p[1] - my) * ca for p in pts]
    a = (max(along) - min(along)) / 2 + 0.5
    b = (max(across) - min(across)) / 2 + 0.5
    thickness = (a + b) / 2 - math.sqrt(max(0.0, ((a + b) / 2) ** 2 - n / math.pi))
    thickness = max(2.5, min(thickness, min(a, b) * 0.45))
    out[seg] = ring(mx, my, a, b, angle) + ' ' + ring(mx, my, a - thickness, b - thickness, angle, reverse=True)
    print(seg, 'a', round(a, 1), 'b', round(b, 1), 'deg', round(math.degrees(angle)), 't', round(thickness, 1))
json.dump(out, open('lcdart/eggs.json', 'w'))
