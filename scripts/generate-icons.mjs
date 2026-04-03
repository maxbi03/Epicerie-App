import sharp from 'sharp';
import fs from 'fs';

const svg = fs.readFileSync('./public/icons/logo.svg');

await sharp(svg).resize(512, 512).png().toFile('./public/icons/logo.png');

console.log('✅ Icônes générées !');