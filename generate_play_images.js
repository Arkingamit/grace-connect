const sharp = require('sharp');

async function generate() {
  try {
    // 512x512 App Icon
    await sharp('public/logo.png')
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile('play_store_icon.png');
      
    // 1024x500 Feature Graphic
    await sharp('public/logo.png')
      .resize(1024, 500, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile('play_store_feature_graphic.png');
      
    console.log('Successfully generated play_store_icon.png and play_store_feature_graphic.png');
  } catch (err) {
    console.error('Error generating images:', err);
  }
}

generate();
