/**
 * node scripts/make-icons.js — render the app icons in public/icons from the
 * SVG below (teal tile with a dumbbell), using sharp from Next's dependencies.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'icons');
const TEAL = '#00C4B4';
const DARK = '#0A0C10';

// `inset` shrinks the artwork for maskable icons, whose edges may be cropped.
const svg = ({ rounded, inset }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="${TEAL}"/>
  <g transform="translate(256 256) scale(${inset}) translate(-256 -256)" fill="${DARK}">
    <rect x="96" y="176" width="48" height="160" rx="16"/>
    <rect x="368" y="176" width="48" height="160" rx="16"/>
    <rect x="152" y="208" width="40" height="96" rx="12"/>
    <rect x="320" y="208" width="40" height="96" rx="12"/>
    <rect x="192" y="240" width="128" height="32" rx="8"/>
  </g>
</svg>`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const icons = [
    ['icon-192.png', 192, { rounded: true, inset: 1 }],
    ['icon-512.png', 512, { rounded: true, inset: 1 }],
    ['icon-maskable-512.png', 512, { rounded: false, inset: 0.72 }],
    ['apple-touch-icon.png', 180, { rounded: false, inset: 0.9 }],
  ];
  for (const [name, size, options] of icons) {
    await sharp(Buffer.from(svg(options))).resize(size, size).png().toFile(path.join(OUT, name));
  }
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svg({ rounded: true, inset: 1 }).trim());
  console.log(`Wrote ${icons.length + 1} icons to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
