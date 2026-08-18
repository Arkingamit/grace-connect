import sharp from 'sharp';

const BLACK = { r: 0, g: 0, b: 0 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const CANVAS = 1024;
// Leave a black margin around the flame so it clears the rounded corners iOS
// applies, matching the inset used by the Grace Music icon.
const CONTENT = 656;

const flame = await sharp('assets/icon-original.png')
  .trim()
  .resize(CONTENT, CONTENT, { fit: 'contain', background: TRANSPARENT })
  .png()
  .toBuffer();

await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 3, background: BLACK },
})
  .composite([{ input: flame, gravity: 'centre' }])
  .flatten({ background: BLACK })
  .removeAlpha()
  .png()
  .toFile('assets/icon.png');

const meta = await sharp('assets/icon.png').metadata();
console.log(`icon.png -> ${meta.width}x${meta.height}, hasAlpha=${meta.hasAlpha}`);
