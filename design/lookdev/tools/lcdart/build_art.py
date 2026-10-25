import json
import re

layout = json.load(open('ref1/render_lbl.png.json'))
traced = json.load(open('captures/segments-traced.json'))
eggs = json.load(open('lcdart/eggs.json'))


def compact(d):
    return re.sub(r'-?\d+\.\d+', lambda m: str(round(float(m.group()))), d).replace(' Z ', 'Z').replace(' Z', 'Z')


def hexagon(x, y, w, h):
    if w > h:
        t = h * 0.42
        yc = y + h / 2
        pts = [(x + t, yc - t), (x + w - t, yc - t), (x + w, yc), (x + w - t, yc + t), (x + t, yc + t), (x, yc)]
    else:
        t = w * 0.62
        xt, xb = x + w - t / 2, x + t / 2
        pts = [(xt, y), (xt + t / 2, y + t / 2), (xb + t / 2, y + h - t / 2), (xb, y + h), (xb - t / 2, y + h - t / 2), (xt - t / 2, y + t / 2)]
    return 'M' + ' L'.join(f'{px:.0f} {py:.0f}' for px, py in pts) + 'Z'


def dot(x, y, w, h):
    pts = [(x + w * 0.3, y), (x + w, y), (x + w * 0.7, y + h), (x, y + h)]
    return 'M' + ' L'.join(f'{px:.0f} {py:.0f}' for px, py in pts) + 'Z'


paths = {seg: compact(d) for seg, d in traced.items()}
paths.update({seg: compact(d) for seg, d in eggs.items()})
for seg, boxes in layout.items():
    if (seg[0] in '567' and seg not in ('6.0.1', '7.0.1', '5.0.1')) or seg == '4.0.0':
        paths[seg] = ' '.join(hexagon(*b[1:]) for b in boxes)
paths['5.0.1'] = ' '.join(dot(*b[1:]) for b in layout['5.0.1'])

texts = {
    '2.2.0': [38, 972, 62, 'ИГРА А', 208],
    '0.1.1': [1335, 972, 62, 'ИГРА Б', 201],
    '4.1.0': [697, 110, 74, 'ДП', 108],
    '1.2.0': [705, 205, 74, 'ПП', 99],
}
missing = [s for s in layout if s not in paths and s not in texts]
print('paths', len(paths), 'texts', len(texts), 'missing', missing)
art = {'paths': paths, 'texts': texts, 'film': json.load(open('captures/film.json'))}
with open('lcd-art.js', 'w', encoding='utf-8') as f:
    f.write('// LCD segment art traced from photo by perepelin30, Wikimedia Commons, CC BY-SA 4.0\n')
    f.write('const LCD_ART = ' + json.dumps(art, ensure_ascii=False, separators=(',', ':')) + ';\n')
import os
print('size', os.path.getsize('lcd-art.js'))
