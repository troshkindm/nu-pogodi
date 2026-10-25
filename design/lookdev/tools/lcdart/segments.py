import json
from PIL import Image

layout = json.load(open('ref1/render_lbl.png.json'))
assign = json.load(open('lcdart/assign.json'))
components = json.load(open('lcdart/np-components.json'))
t = json.load(open('lcdart/affine.json'))
mask = Image.open('lcdart/np-mask.png').convert('L')
W, H = mask.size
mk = mask.load()

ax, ay = t['x'], t['y']
det = ax[0] * ay[1] - ax[1] * ay[0]


def to_photo(x, y):
    x -= ax[2]; y -= ay[2]
    return ((ay[1] * x - ax[1] * y) / det, (-ay[0] * x + ax[0] * y) / det)


def seg_box(seg):
    boxes = layout[seg]
    return (min(b[1] for b in boxes), min(b[2] for b in boxes), max(b[1] + b[3] for b in boxes), max(b[2] + b[4] for b in boxes))


labels = [-1] * (W * H)
for index, comp in enumerate(components):
    pass

# relabel connected components exactly as mask.py did, keeping only components with area >= 30
seen = bytearray(W * H)
order = []
for y in range(H):
    for x in range(W):
        if mk[x, y] and not seen[y * W + x]:
            stack = [(x, y)]; seen[y * W + x] = 1; pixels = []
            while stack:
                cx, cy = stack.pop(); pixels.append(cy * W + cx)
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if 0 <= nx < W and 0 <= ny < H and mk[nx, ny] and not seen[ny * W + nx]:
                            seen[ny * W + nx] = 1; stack.append((nx, ny))
            if len(pixels) >= 30:
                order.append(pixels)
order.sort(key=lambda p: -len(p))
for index, pixels in enumerate(order):
    for p in pixels:
        labels[p] = index

segments = list(layout.keys())
seg_pixels = {s: [] for s in segments}
for seg, comps in assign.items():
    for c in comps:
        seg_pixels[seg].extend(order[c])

for seg in ('4.3.1', '7.0.1', '2.1.0'):
    x1, y1, x2, y2 = seg_box(seg)
    corners = [to_photo(x1, y1), to_photo(x2, y1), to_photo(x1, y2), to_photo(x2, y2)]
    u1 = int(min(c[0] for c in corners)) - 4; u2 = int(max(c[0] for c in corners)) + 4
    v1 = int(min(c[1] for c in corners)) - 4; v2 = int(max(c[1] for c in corners)) + 4
    for v in range(max(0, v1), min(H, v2)):
        for u in range(max(0, u1), min(W, u2)):
            if labels[v * W + u] == 0 and not (seg == '4.3.1' and (u < 262 or v < 52)):
                seg_pixels[seg].append(v * W + u)

index_image = Image.new('RGB', (W, H), (0, 0, 0))
ip = index_image.load()
meta = {}
for i, seg in enumerate(segments):
    if not seg_pixels[seg]:
        continue
    code = i + 1
    for p in seg_pixels[seg]:
        ip[p % W, p // W] = (code, 0, 0)
    xs = [p % W for p in seg_pixels[seg]]; ys = [p // W for p in seg_pixels[seg]]
    meta[seg] = {'code': code, 'box': [min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1], 'area': len(xs)}
index_image.save('lcdart/segindex.png')
json.dump({'segments': meta, 'affine': t}, open('lcdart/segindex.json', 'w'))
print(len(meta), 'segments with pixels')
print({s: meta[s]['area'] for s in ('4.3.1', '7.0.1', '2.1.0') if s in meta})

preview = Image.new('RGB', (W, H), (235, 235, 235))
pp = preview.load()
import random
random.seed(3)
colors = {seg: (random.randint(0, 200), random.randint(0, 200), random.randint(0, 200)) for seg in segments}
for seg in segments:
    for p in seg_pixels[seg]:
        pp[p % W, p // W] = colors[seg]
for p, l in enumerate(labels):
    if l == 0 and pp[p % W, p // W] == (235, 235, 235):
        pp[p % W, p // W] = (170, 170, 170)
preview.resize((1170, 690), Image.LANCZOS).save('captures/segpreview.jpg', quality=90)
