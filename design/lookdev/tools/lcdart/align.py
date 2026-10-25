import json

layout = json.load(open('ref1/render_lbl.png.json'))
components = json.load(open('lcdart/np-components.json'))

EGGS = ['3.0.1', '3.0.0', '3.1.0', '3.1.1', '3.2.1', '3.2.0', '3.3.0', '3.3.1', '2.0.1', '2.0.0',
        '7.0.1', '8.3.1', '8.3.0', '8.2.0', '8.2.1', '8.1.0', '8.1.1', '8.0.0', '8.0.1', '0.3.1']


def center(seg):
    boxes = layout[seg]
    x1 = min(b[1] for b in boxes); y1 = min(b[2] for b in boxes)
    x2 = max(b[1] + b[3] for b in boxes); y2 = max(b[2] + b[4] for b in boxes)
    return ((x1 + x2) / 2, (y1 + y2) / 2)


def solve(pairs):
    # least squares affine: photo (u,v) -> layout (x,y)
    import itertools
    n = len(pairs)
    sums = {}
    A = [[0.0] * 3 for _ in range(3)]
    bx = [0.0] * 3
    by = [0.0] * 3
    for (u, v), (x, y) in pairs:
        row = [u, v, 1.0]
        for i in range(3):
            for j in range(3):
                A[i][j] += row[i] * row[j]
            bx[i] += row[i] * x
            by[i] += row[i] * y

    def gauss(M, b):
        M = [r[:] + [bb] for r, bb in zip(M, b)]
        for i in range(3):
            p = max(range(i, 3), key=lambda k: abs(M[k][i]))
            M[i], M[p] = M[p], M[i]
            for k in range(3):
                if k != i:
                    f = M[k][i] / M[i][i]
                    M[k] = [a - f * c for a, c in zip(M[k], M[i])]
        return [M[i][3] / M[i][i] for i in range(3)]
    return gauss(A, bx), gauss(A, by)


def apply(t, u, v):
    ax, ay = t
    return (ax[0] * u + ax[1] * v + ax[2], ay[0] * u + ay[1] * v + ay[2])


seed = [((873.0, 306.7), center('4.0.1')), ((985.9, 305.4), center('4.1.1')), ((1101.2, 304.0), center('6.0.1')),
        ((405.0, 822.9), center('2.3.1')), ((1116.3, 819.5), center('0.0.0'))]
t = solve(seed)
for it in range(3):
    pairs = list(seed)
    used = set()
    for seg in EGGS:
        cx, cy = center(seg)
        best = None
        for i, c in enumerate(components):
            if i in used or c['area'] < 500 or c['area'] > 2200:
                continue
            x, y = apply(t, *c['c'])
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if best is None or d < best[0]:
                best = (d, i)
        if best and best[0] < 40:
            used.add(best[1])
            pairs.append((tuple(components[best[1]]['c']), (cx, cy)))
    t = solve(pairs)
    errs = [((apply(t, *p)[0] - q[0]) ** 2 + (apply(t, *p)[1] - q[1]) ** 2) ** 0.5 for p, q in pairs]
    print('iter', it, 'pairs', len(pairs), 'rms', round((sum(e * e for e in errs) / len(errs)) ** 0.5, 2), 'max', round(max(errs), 2))
print('affine x', [round(v, 5) for v in t[0]])
print('affine y', [round(v, 5) for v in t[1]])
json.dump({'x': t[0], 'y': t[1]}, open('lcdart/affine.json', 'w'))
