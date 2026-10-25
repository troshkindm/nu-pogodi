export interface PrintInks {
  logo: string;
  logoText: string;
  arrows: string;
  labels: string;
  bell: string;
  clock: string;
  title: string;
  nameplate: string;
  frame: string;
}

export const PAINTED_INKS: PrintInks = {
  logo: '#1d1c21',
  logoText: '#232126',
  arrows: '#2d2830',
  labels: '#1d191d',
  bell: '#261823',
  clock: '#2e202c',
  title: '#a8424a',
  nameplate: '#403543',
  frame: '#3b2f3a',
};

export const uniformInks = (color: string): PrintInks => ({
  logo: color,
  logoText: color,
  arrows: color,
  labels: color,
  bell: color,
  clock: color,
  title: color,
  nameplate: color,
  frame: color,
});

export const HALFTONE_FILTER = `
  <filter id="halftone" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="1" seed="31" result="n"/>
    <feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 12 -2.4" result="m"/>
    <feComposite in="SourceGraphic" in2="m" operator="in"/>
  </filter>`;

export const printLayer = (ink: PrintInks) => `
  <path d="M73.6 75.8 A46 46 0 1 1 73.6 105.8" fill="none" stroke="${ink.logo}" stroke-width="4.6"/>
  <circle cx="68" cy="90.8" r="9" fill="${ink.logo}"/>
  <text x="114" y="113" text-anchor="middle" font-size="62" font-weight="800" fill="${ink.logoText}" textLength="68" lengthAdjust="spacingAndGlyphs">ИМ</text>
  <g fill="${ink.arrows}" filter="url(#halftone)">
    <path d="M38 349 L79.6 362 L63.8 382 Z" transform="matrix(1.1 0 0 1.1 -6.05 -36.43)"/><path d="M38 544 L79.6 531 L63.8 509 Z"/>
    <path d="M971.5 347 L928.5 362 L943.5 382 Z" transform="matrix(1.1 0 0 1.1 -94.78 -36.37)"/><path d="M971.5 541 L928.5 528 L943.5 506 Z"/>
  </g>
  <g class="rounded" font-size="24" font-weight="700" text-anchor="middle" fill="${ink.labels}" stroke="${ink.labels}" stroke-width=".35">
    <text x="879" y="121" textLength="72" lengthAdjust="spacingAndGlyphs">играА</text>
    <text x="879" y="187" textLength="72" lengthAdjust="spacingAndGlyphs">играБ</text>
    <text x="879" y="253" textLength="74" lengthAdjust="spacingAndGlyphs">время</text>
  </g>
  <path d="M933 63 q-7.6 1.2 -9 11.4 l-1.2 7.6 l-4.6 6.2 h28.4 l-4.4 -6.4 l-1.4 -7.4 q-1.2 -10.2 -7.8 -11.4 z M930 90 q1.5 4.6 4.6 4.4 q2.6 -.4 3.4 -4.4" fill="none" stroke="${ink.bell}" stroke-width="3.2" stroke-linejoin="round" transform="translate(9 0) rotate(-8 933 78)"/>
  <g fill="${ink.clock}" transform="translate(4 7)">
    <circle cx="928.5" cy="142" r="3.4"/><circle cx="926.5" cy="157" r="3.1"/><circle cx="938" cy="133" r="3.4"/><circle cx="958" cy="135" r="3.2"/><circle cx="965" cy="148" r="3.3"/>
    <path d="M947 138 l3.6 8 l-3.6 8 l-3.6 -8 z"/><path d="M948 152.5 l14.5 2.2 l-.6 3.4 l-14.5 -2 z"/>
  </g>
  <g font-size="30" font-weight="700" fill="${ink.title}">
    <text x="424.2" y="109" text-anchor="end" textLength="49.4" lengthAdjust="spacing">НУ</text>
    <path d="M440.6 103.4 L445 103.4 L438.4 115.8 L435.4 115.8 Z"/>
    <text x="450.2" y="109" textLength="167" lengthAdjust="spacing">ПОГОДИ!</text>
  </g>
  <text x="505" y="496" text-anchor="middle" font-size="31" font-weight="800" fill="${ink.nameplate}" textLength="422" lengthAdjust="spacingAndGlyphs" letter-spacing="3">ЭЛЕКТРОНИКА ИМ 02</text>`;

export const frameLines = (color: string) =>
  `<g fill="none" stroke="${color}" stroke-width="5.8"><path d="M355 99 H242 Q224 99 224 117 V464 Q224 482 242 482 H288"/><path d="M638 99 H764 Q782 99 782 117 V464 Q782 482 764 482 H722"/></g>`;
