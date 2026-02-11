const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceIcon = path.join(__dirname, 'src', 'logo-login.png');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const sizes = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
];

async function generateIcons() {
    console.log('Generating icons...');

    for (const { name, size } of sizes) {
        const dir = path.join(resDir, name);
        if (!fs.existsSync(dir)) {
            console.log(`Creating directory: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
        }

        const iconPath = path.join(dir, 'ic_launcher.png');
        const roundIconPath = path.join(dir, 'ic_launcher_round.png');

        // Standard Icon
        await sharp(sourceIcon)
            .resize(size, size)
            .toFile(iconPath);
        console.log(`Generated: ${iconPath}`);

        // Round Icon
        const radius = size / 2;
        const circleSvg = Buffer.from(
            `<svg><circle cx="${radius}" cy="${radius}" r="${radius}" /></svg>`
        );

        await sharp(sourceIcon)
            .resize(size, size)
            .composite([{
                input: circleSvg,
                blend: 'dest-in'
            }])
            .toFile(roundIconPath);
        console.log(`Generated: ${roundIconPath}`);
    }

    console.log('Icon generation complete!');
}

generateIcons().catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
});
