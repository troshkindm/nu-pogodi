import json

layout = json.load(open('ref1/render_lbl.png.json'))
components = json.load(open('lcdart/np-components.json'))
t = json.load(open('lcdart/affine.json'))


def to_layout(u, v):
    return (t['x'][0] * u + t['x'][1] * v + t['x'][2], t['y'][0] * u + t['y'][1] * v + t['y'][2])


def seg_box(seg):
    boxes = layout[seg]
    x1 = min(b[1] for b in boxes); y1 = min(b[2] for b in boxes)
    x2 = max(b[1] + b[3] for b in boxes); y2 = max(b[2] + b[4] for b in boxes)
    return (x1, y1, x2, y2)


def overlap(a, b):
    w = min(a[2], b[2]) - max(a[0], b[0])
    h = min(a[3], b[3]) - max(a[1], b[1])
    return max(0, w) * max(0, h)


result = {}
unassigned = []
for i, c in enumerate(components):
    x, y, w, h = c['box']
    p1 = to_layout(x, y); p2 = to_layout(x + w, y + h)
    cb = (p1[0], p1[1], p2[0], p2[1])
    area = (cb[2] - cb[0]) * (cb[3] - cb[1])
    scores = sorted(((overlap(cb, seg_box(s)) / max(1, area), s) for s in layout), reverse=True)
    best, seg = scores[0]
    second = scores[1]
    if best > 0.5:
        result.setdefault(seg, []).append(i)
        flag = ' AMBIG ' + second[1] + ' %.2f' % second[0] if second[0] > 0.5 else ''
        if flag or c['area'] > 6000:
            print('comp', i, 'area', c['area'], '->', seg, '%.2f' % best, flag)
    else:
        unassigned.append((i, c['area'], [round(v) for v in cb], seg, round(best, 2)))

missing = [s for s in layout if s not in result]
print('assigned segments', len(result), 'missing', missing)
print('unassigned big:', [u for u in unassigned if u[1] > 300][:30])
json.dump(result, open('lcdart/assign.json', 'w'))
