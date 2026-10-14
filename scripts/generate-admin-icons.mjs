import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const BG_COLOR = '#032B30'; // Website header background color

const SIZES = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

const resDir = path.resolve('android/app/src/admin/res');

async function run() {
  console.log('Generating Admin APK icons with website header background (#032B30)...');

  // 1. Ensure directories exist
  const valuesDir = path.join(resDir, 'values');
  const drawableDir = path.join(resDir, 'drawable');
  fs.mkdirSync(valuesDir, { recursive: true });
  fs.mkdirSync(drawableDir, { recursive: true });

  // 2. Write ic_launcher_background.xml in values and drawable
  fs.writeFileSync(
    path.join(valuesDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG_COLOR}</color>\n</resources>\n`
  );

  fs.writeFileSync(
    path.join(drawableDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="108dp"\n    android:height="108dp"\n    android:viewportHeight="108"\n    android:viewportWidth="108">\n    <path android:fillColor="${BG_COLOR}" android:pathData="M0,0h108v108h-108z" />\n</vector>\n`
  );

  // 3. Use public/cropped-logo-icon-hd.png
  const logoSourcePath = path.resolve('public/cropped-logo-icon-hd.png');

  for (const { name, size } of SIZES) {
    const targetDir = path.join(resDir, name);
    fs.mkdirSync(targetDir, { recursive: true });

    // Inner logo scaled to 74% of target icon size
    const logoSize = Math.round(size * 0.74);
    const logoBuffer = await sharp(logoSourcePath)
      .resize(logoSize, logoSize, { fit: 'inside' })
      .toBuffer();

    // Foreground icon (transparent canvas with logo centered)
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    // Standard square launcher icon (solid #032B30 background with logo centered)
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 3, g: 43, b: 48, alpha: 1 },
      },
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // Round launcher icon (circular mask on #032B30 with logo centered)
    const circleSvg = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );

    const roundBase = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 3, g: 43, b: 48, alpha: 1 },
      },
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png()
      .toBuffer();

    await sharp(roundBase)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    console.log(`Generated ${name} (${size}x${size})`);
  }

  console.log('Admin APK launcher icons generated successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
