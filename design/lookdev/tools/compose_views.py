import sys
from PIL import Image

source, prefix = sys.argv[1], sys.argv[2]
K = 800 / 1240
VIEWS = {
    'full': (0.53125, 217.328125, 1242.59375, 741.140625),
    'left': (1.109375, -237.359375, 2526.78125, 1507.09375),
    'right': (-1238.890625, -237.359375, 2526.78125, 1507.09375),
    'top': (-378.890625, 12.640625, 2526.78125, 1507.09375),
    'bottomleft': (1.109375, -335.359375, 2526.78125, 1507.09375),
    'buttons3x': (-377.78125, -1674.71875, 5053.578125, 3014.1875),
}

bitmap = Image.open(source).convert('RGBA')
for name, (left, top, width, height) in VIEWS.items():
    frame = Image.new('RGBA', (800, 753), (14, 14, 14, 255))
    size = (round(width * K), round(height * K))
    scaled = bitmap.resize(size, Image.LANCZOS if size[0] < bitmap.width else Image.BICUBIC)
    frame.alpha_composite(scaled, (round(left * K), round(top * K)))
    frame.convert('RGB').save(f'{prefix}-{name}.jpg', quality=90)
print('ok')
