import json
import sys
from PIL import Image, ImageFilter

SRC = sys.argv[1]
OUT = sys.argv[2]

photo = Image.open(SRC).convert('RGB')
W, H = photo.size
local = photo.convert('L').filter(ImageFilter.BoxBlur(24))
luma = photo.convert('L')
px = photo.load()
lp = luma.load()
mp = local.load()

mask = Image.new('L', (W, H), 0)
mk = mask.load()
for y in range(H):
    for x in range(W):
        r, g, b = px[x, y]
        chroma = max(r, g, b) - min(r, g, b)
        if lp[x, y] < min(48, max(mp[x, y] * 0.55, 34)) and chroma < 45:
            mk[x, y] = 255
mask = mask.filter(ImageFilter.MedianFilter(3))
mask.save(OUT + '-mask.png')

mk = mask.load()
seen = bytearray(W * H)
components = []
for y in range(H):
    for x in range(W):
        if mk[x, y] and not seen[y * W + x]:
            stack = [(x, y)]
            seen[y * W + x] = 1
            area = 0
            x1 = x2 = x
            y1 = y2 = y
            sx = sy = 0
            while stack:
                cx, cy = stack.pop()
                area += 1
                sx += cx
                sy += cy
                x1 = min(x1, cx); x2 = max(x2, cx); y1 = min(y1, cy); y2 = max(y2, cy)
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if 0 <= nx < W and 0 <= ny < H and mk[nx, ny] and not seen[ny * W + nx]:
                            seen[ny * W + nx] = 1
                            stack.append((nx, ny))
            if area >= 30:
                components.append({'area': area, 'box': [x1, y1, x2 - x1 + 1, y2 - y1 + 1], 'c': [round(sx / area, 1), round(sy / area, 1)]})

components.sort(key=lambda c: -c['area'])
json.dump(components, open(OUT + '-components.json', 'w'))
print(len(components), 'components')
for c in components[:40]:
    print(c)
