import sharp from 'sharp';
import fs from 'fs';

const svg = fs.readFileSync('./public/icons/icon.svg');

await sharp(svg).resize(192, 192).png().toFile('./public/icons/icon-192.png');
await sharp(svg).resize(512, 512).png().toFile('./public/icons/icon-512.png');

console.log('✅ Icônes générées !');