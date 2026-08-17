import sharp from 'sharp';

const BLACK = { r: 0, g: 0, b: 0 };

await sharp('assets/icon-original.png')
  .resize(1024, 1024, { fit: 'contain', background: BLACK })
  .flatten({ background: BLACK })
  .png()
  .toFile('assets/icon.png');

const meta = await sharp('assets/icon.png').metadata();
console.log(`icon.png -> ${meta.width}x${meta.height}, hasAlpha=${meta.hasAlpha}`);
