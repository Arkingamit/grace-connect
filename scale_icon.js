const sharp = require('sharp');
const fs = require('fs');

async function scaleImage(inputFile, outputFile) {
  if (!fs.existsSync(inputFile)) {
    console.log('File not found: ' + inputFile);
    return;
  }
  
  const image = sharp(inputFile);
  
  // Trim transparent edges
  const trimmed = await image.trim().toBuffer();
  
  const targetSize = 1024;
  const margin = 20; // Very small margin so it fills the screen
  const availableSize = targetSize - (margin * 2);
  
  await sharp(trimmed)
    .resize(availableSize, availableSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: margin,
      bottom: margin,
      left: margin,
      right: margin,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(outputFile);
    
  console.log('Processed ' + inputFile + ' -> ' + outputFile);
}

async function run() {
  await scaleImage('assets/icon.png', 'assets/icon_new.png');
  await scaleImage('assets/icon-foreground.png', 'assets/icon-foreground_new.png');
  
  if (fs.existsSync('assets/icon_new.png')) {
    fs.copyFileSync('assets/icon.png', 'assets/icon.png.bak');
    fs.copyFileSync('assets/icon_new.png', 'assets/icon.png');
  }
  
  if (fs.existsSync('assets/icon-foreground_new.png')) {
    fs.copyFileSync('assets/icon-foreground.png', 'assets/icon-foreground.png.bak');
    fs.copyFileSync('assets/icon-foreground_new.png', 'assets/icon-foreground.png');
  }
}

run().catch(console.error);
