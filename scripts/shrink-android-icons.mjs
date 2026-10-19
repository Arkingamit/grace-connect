import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SCALE = 0.95; // Shrink by 5%
const densities = ['ldpi', 'mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const iconFiles = ['ic_launcher_foreground.png', 'ic_launcher.png', 'ic_launcher_round.png'];

async function shrinkImage(filePath, scale = SCALE) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  const meta = await sharp(filePath).metadata();
  const targetW = Math.max(1, Math.round(meta.width * scale));
  const targetH = Math.max(1, Math.round(meta.height * scale));
  const padLeft = Math.floor((meta.width - targetW) / 2);
  const padRight = meta.width - targetW - padLeft;
  const padTop = Math.floor((meta.height - targetH) / 2);
  const padBottom = meta.height - targetH - padTop;

  const buffer = await sharp(filePath)
    .resize(targetW, targetH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  fs.writeFileSync(filePath, buffer);
  console.log(`Shrunk ${filePath}: ${meta.width}x${meta.height} (inner ${targetW}x${targetH})`);
}

async function run() {
  console.log('--- Shrinking Android App Icons by 5% ---');
  for (const d of densities) {
    for (const file of iconFiles) {
      const p = path.join('android', 'app', 'src', 'main', 'res', `mipmap-${d}`, file);
      await shrinkImage(p, SCALE);
    }
  }

  // Also shrink source assets in assets/
  for (const file of ['icon-foreground.png', 'icon.png']) {
    const p = path.join('assets', file);
    if (fs.existsSync(p)) {
      await shrinkImage(p, SCALE);
    }
  }

  console.log('--- All Android icons successfully shrunk by 5% ---');
}

run().catch((err) => {
  console.error('Error shrinking icons:', err);
  process.exit(1);
});
