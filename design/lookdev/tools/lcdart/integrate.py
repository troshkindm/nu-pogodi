import sys

path = sys.argv[1]
s = open(path, encoding='utf-8').read()

start = s.index("  const segs = document.getElementById('segs');")
end = s.index("  let audio = null;")
new_block = """  const segs = document.getElementById('segs');
  segs.setAttribute('transform', 'translate(273.4 151.95) scale(0.295)');
  const SEG = {};
  Object.entries(LCD_ART.paths).forEach(([id, d]) => {
    SEG[id] = make('g', { class: 'seg' }, segs);
    make('path', { d, stroke: 'none' }, SEG[id]);
  });
  Object.entries(LCD_ART.texts).forEach(([id, [x, y, size, text, length]]) => {
    SEG[id] = make('g', { class: 'seg' }, segs);
    make('text', { x, y, 'font-size': size, 'font-weight': 800, stroke: 'none', textLength: length, lengthAdjust: 'spacingAndGlyphs' }, SEG[id]).textContent = text;
  });
  const pick = (ids) => ids.map((id) => SEG[id]);
  const toggle = (nodes, on) => [].concat(nodes).forEach((g) => g.classList.toggle('on', on));

  const eggSegments = [
    ['3.0.1', '3.0.0', '3.1.0', '3.1.1', '3.2.1'],
    ['3.2.0', '3.3.0', '3.3.1', '2.0.1', '2.0.0'],
    ['7.0.1', '8.3.1', '8.3.0', '8.2.0', '8.2.1'],
    ['8.1.0', '8.1.1', '8.0.0', '8.0.1', '0.3.1'],
  ].map(pick);
  const wolves = [
    { body: SEG['1.1.0'], arms: pick(['1.1.1', '1.0.0']) },
    { body: SEG['1.2.1'], arms: pick(['1.3.1', '1.3.0']) },
  ];
  const hare = pick(['4.3.1', '4.3.0']);
  const fallen = [pick(['2.3.1', '2.3.0']), pick(['0.0.0', '0.0.1'])];
  const missMarks = pick(['4.0.1', '4.1.1', '6.0.1']);
  const labels = pick(['2.2.0', '0.1.1']);
  const meridiem = pick(['4.1.0', '1.2.0']);
  const SEVEN = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const digits = ['5', '6', '7'].map((n) => ({ a: SEG[`${n}.1.0`], b: SEG[`${n}.0.0`], c: SEG[`${n}.3.0`], d: SEG[`${n}.3.1`], e: SEG[`${n}.2.1`], f: SEG[`${n}.1.1`], g: SEG[`${n}.2.0`] }));
  const leadingOne = SEG['4.0.0'];
  const colon = SEG['5.0.1'];

  function showNumber(text) {
    const padded = text.padStart(4, ' ').slice(-4);
    leadingOne.classList.toggle('on', padded[0] === '1');
    digits.forEach((digit, i) => {
      const lit = SEVEN[padded[i + 1]] || '';
      Object.entries(digit).forEach(([name, g]) => g.classList.toggle('on', lit.includes(name)));
    });
  }

"""
s = s[:start] + new_block + s[end:]

rep = [
    ("    hare.classList.toggle('on', state.running && Math.floor(state.tick / 12) % 3 === 1);",
     "    toggle(hare, state.running && Math.floor(state.tick / 12) % 3 === 1);\n    meridiem.forEach((g, i) => g.classList.toggle('on', Boolean(clockTimer) && i === (state.pm ? 1 : 0)));"),
    ("      fallen[side].classList.add('on');\n      setTimeout(() => fallen[side].classList.remove('on'), 800);",
     "      toggle(fallen[side], true);\n      setTimeout(() => toggle(fallen[side], false), 800);"),
    ("    showNumber(`${now.getHours() % 12 || 12}${String(now.getMinutes()).padStart(2, '0')}`);",
     "    state.pm = now.getHours() >= 12;\n    showNumber(`${now.getHours() % 12 || 12}${String(now.getMinutes()).padStart(2, '0')}`);"),
    ("    document.querySelectorAll('.seg').forEach((g) => g.classList.add('on'));\n    showNumber('0000');\n    colon.classList.remove('on');",
     "    document.querySelectorAll('.seg').forEach((g) => g.classList.add('on'));"),
    ("<script>\n", '<script src="lcd-art.js"></script>\n<script>\n'),
]
for a, b in rep:
    if a not in s:
        sys.exit('MISSING ' + a[:80])
    s = s.replace(a, b, 1)
open(path, 'w', encoding='utf-8').write(s)
print('ok')
