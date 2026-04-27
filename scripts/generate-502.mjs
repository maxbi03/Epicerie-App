import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const configPath = pathToFileURL(path.resolve('./app/lib/config.js')).href;
const { APP_NAME, APP_LOGO } = await import(configPath);

const template = fs.readFileSync('./public/502.template.html', 'utf8');

const output = template
  .replaceAll('{{APP_NAME}}', APP_NAME)
  .replaceAll('{{APP_LOGO}}', APP_LOGO);

fs.writeFileSync('./public/502.html', output);
console.log(`✅ public/502.html généré (logo: ${APP_LOGO})`);
