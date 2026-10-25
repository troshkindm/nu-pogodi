import json
import math
import re
import xml.etree.ElementTree as ET

SVG = 'ref1/nupogodi.svg'
LAYOUT = 'ref1/render_lbl.png.json'
NS = '{http://www.w3.org/2000/svg}'


def multiply(m, n):
    a, b, c, d, e, f = m
    a2, b2, c2, d2, e2, f2 = n
    return (a * a2 + c * b2, b * a2 + d * b2, a * c2 + c * d2, b * c2 + d * d2, a * e2 + c * f2 + e, b * e2 + d * f2 + f)


def parse_transform(text):
    m = (1, 0, 0, 1, 0, 0)
    for name, args in re.findall(r'(\w+)\s*\(([^)]*)\)', text or ''):
        v = [float(x) for x in re.split(r'[\s,]+', args.strip()) if x]
        if name == 'translate':
            t = (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0)
        elif name == 'scale':
            t = (v[0], 0, 0, v[1] if len(v) > 1 else v[0], 0, 0)
        elif name == 'rotate':
            r = math.radians(v[0])
            t = (math.cos(r), math.sin(r), -math.sin(r), math.cos(r), 0, 0)
            if len(v) == 3:
                t = multiply(multiply((1, 0, 0, 1, v[1], v[2]), t), (1, 0, 0, 1, -v[1], -v[2]))
        elif name == 'matrix':
            t = tuple(v)
        else:
            raise ValueError(name)
        m = multiply(m, t)
    return m


def apply(m, x, y):
    return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])


def transform_path(d, m):
    tokens = re.findall(r'[MmLlHhVvCcSsQqTtZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?', d)
    out, i, cmd = [], 0, None
    cx = cy = sx = sy = 0.0
    last_ctrl = None

    def num():
        nonlocal i
        i += 1
        return float(tokens[i - 1])

    def emit(letter, points):
        out.append(letter + ' '.join(f'{px:.2f} {py:.2f}' for px, py in (apply(m, *p) for p in points)))

    while i < len(tokens):
        if re.match(r'[A-Za-z]', tokens[i]):
            cmd = tokens[i]
            i += 1
            if cmd in 'Zz':
                out.append('Z')
                cx, cy = sx, sy
                last_ctrl = None
                continue
        rel = cmd.islower()
        c = cmd.upper()
        if c == 'M':
            x, y = num(), num()
            if rel:
                x, y = cx + x, cy + y
            cx, cy, sx, sy = x, y, x, y
            emit('M', [(x, y)])
            cmd = 'l' if rel else 'L'
            last_ctrl = None
        elif c == 'L':
            x, y = num(), num()
            if rel:
                x, y = cx + x, cy + y
            cx, cy = x, y
            emit('L', [(x, y)])
            last_ctrl = None
        elif c in 'HV':
            v = num()
            if c == 'H':
                cx = cx + v if rel else v
            else:
                cy = cy + v if rel else v
            emit('L', [(cx, cy)])
            last_ctrl = None
        elif c == 'C':
            p = [num() for _ in range(6)]
            if rel:
                p = [p[k] + (cx if k % 2 == 0 else cy) for k in range(6)]
            emit('C', [(p[0], p[1]), (p[2], p[3]), (p[4], p[5])])
            last_ctrl = (p[2], p[3])
            cx, cy = p[4], p[5]
        elif c == 'S':
            p = [num() for _ in range(4)]
            if rel:
                p = [p[k] + (cx if k % 2 == 0 else cy) for k in range(4)]
            c1 = (2 * cx - last_ctrl[0], 2 * cy - last_ctrl[1]) if last_ctrl else (cx, cy)
            emit('C', [c1, (p[0], p[1]), (p[2], p[3])])
            last_ctrl = (p[0], p[1])
            cx, cy = p[2], p[3]
        elif c == 'Q':
            p = [num() for _ in range(4)]
            if rel:
                p = [p[k] + (cx if k % 2 == 0 else cy) for k in range(4)]
            emit('Q', [(p[0], p[1]), (p[2], p[3])])
            last_ctrl = None
            cx, cy = p[2], p[3]
        else:
            raise ValueError(cmd)
    return ''.join(out)


tree = ET.parse(SVG)
matrices = {}
paths = {}


def walk(node, m):
    m = multiply(m, parse_transform(node.get('transform')))
    if node.tag == NS + 'path' and node.get('id'):
        paths[node.get('id')] = transform_path(node.get('d'), m)
    for child in node:
        walk(child, m)


walk(tree.getroot(), (1, 0, 0, 1, 0, 0))
layout = json.load(open(LAYOUT))
segments = {seg: ''.join(paths[box[0]] for box in boxes) for seg, boxes in layout.items()}
json.dump(segments, open('lcdart/mame-segments.json', 'w'))
print(len(segments), 'segments', sum(len(v) for v in segments.values()), 'chars')
