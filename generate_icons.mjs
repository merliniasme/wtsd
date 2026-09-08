import sharp from 'sharp';
import fs from 'fs';

const input = 'public/app-icon.jpg';

async function generate() {
  await sharp(input).resize(192, 192).toFile('public/pwa-192x192.png');
  await sharp(input).resize(512, 512).toFile('public/pwa-512x512.png');
  await sharp(input).resize(512, 512).toFile('public/pwa-maskable-512x512.png');
  await sharp(input).resize(180, 180).toFile('public/apple-touch-icon.png');
  console.log('Icons generated!');
}

generate().catch(console.error);
