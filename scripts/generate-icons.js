const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '../src/logo-1024.png');
const outputDir = __dirname;

// Android icon sizes (in pixels)
const androidSizes = {
  'mdpi': { launcher: 48, round: 48 },
  'hdpi': { launcher: 72, round: 72 },
  'xhdpi': { launcher: 96, round: 96 },
  'xxhdpi': { launcher: 144, round: 144 },
  'xxxhdpi': { launcher: 192, round: 192 }
};

// iOS icon sizes (in pixels)
const iosSizes = [
  { name: 'icon-20@2x.png', size: 40 },
  { name: 'icon-20@3x.png', size: 60 },
  { name: 'icon-29@2x.png', size: 58 },
  { name: 'icon-29@3x.png', size: 87 },
  { name: 'icon-40@2x.png', size: 80 },
  { name: 'icon-40@3x.png', size: 120 },
  { name: 'icon-60@2x.png', size: 120 },
  { name: 'icon-60@3x.png', size: 180 },
  { name: 'icon-1024.png', size: 1024 }
];

async function generateIcons() {
  try {
    console.log('Reading source image...');
    const image = sharp(sourceImage);

    // Generate Android icons
    console.log('Generating Android icons...');
    for (const [density, sizes] of Object.entries(androidSizes)) {
      const androidDir = path.join(__dirname, `../android/app/src/main/res/mipmap-${density}`);
      
      // Ensure directory exists
      if (!fs.existsSync(androidDir)) {
        fs.mkdirSync(androidDir, { recursive: true });
      }

      // Generate ic_launcher.png
      await image
        .clone()
        .resize(sizes.launcher, sizes.launcher, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(path.join(androidDir, 'ic_launcher.png'));

      // Generate ic_launcher_round.png (same as launcher for now)
      await image
        .clone()
        .resize(sizes.round, sizes.round, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(path.join(androidDir, 'ic_launcher_round.png'));

      console.log(`✓ Generated ${density} icons`);
    }

    // Generate iOS icons
    console.log('Generating iOS icons...');
    const iosDir = path.join(__dirname, '../ios/AtharvNarayan/Images.xcassets/AppIcon.appiconset');
    
    // Ensure directory exists
    if (!fs.existsSync(iosDir)) {
      fs.mkdirSync(iosDir, { recursive: true });
    }

    for (const icon of iosSizes) {
      await image
        .clone()
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(path.join(iosDir, icon.name));
      
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
    }

    // Update iOS Contents.json
    console.log('Updating iOS Contents.json...');
    const contentsJson = {
      "images": [
        {
          "filename": "icon-20@2x.png",
          "idiom": "iphone",
          "scale": "2x",
          "size": "20x20"
        },
        {
          "filename": "icon-20@3x.png",
          "idiom": "iphone",
          "scale": "3x",
          "size": "20x20"
        },
        {
          "filename": "icon-29@2x.png",
          "idiom": "iphone",
          "scale": "2x",
          "size": "29x29"
        },
        {
          "filename": "icon-29@3x.png",
          "idiom": "iphone",
          "scale": "3x",
          "size": "29x29"
        },
        {
          "filename": "icon-40@2x.png",
          "idiom": "iphone",
          "scale": "2x",
          "size": "40x40"
        },
        {
          "filename": "icon-40@3x.png",
          "idiom": "iphone",
          "scale": "3x",
          "size": "40x40"
        },
        {
          "filename": "icon-60@2x.png",
          "idiom": "iphone",
          "scale": "2x",
          "size": "60x60"
        },
        {
          "filename": "icon-60@3x.png",
          "idiom": "iphone",
          "scale": "3x",
          "size": "60x60"
        },
        {
          "filename": "icon-1024.png",
          "idiom": "ios-marketing",
          "scale": "1x",
          "size": "1024x1024"
        }
      ],
      "info": {
        "author": "xcode",
        "version": 1
      }
    };

    fs.writeFileSync(
      path.join(iosDir, 'Contents.json'),
      JSON.stringify(contentsJson, null, 2)
    );

    console.log('\n✅ All icons generated successfully!');
    console.log('Android icons: android/app/src/main/res/mipmap-*/');
    console.log('iOS icons: ios/AtharvNarayan/Images.xcassets/AppIcon.appiconset/');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

