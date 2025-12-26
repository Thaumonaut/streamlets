import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.resolve(__dirname, '../build');
const indexPath = path.join(buildDir, 'index.html');
const panelPath = path.join(buildDir, 'panel.html');

async function main() {
  try {
    await access(indexPath, constants.F_OK);
  } catch (error) {
    console.error('[postbuild] index.html not found at', indexPath);
    process.exit(1);
  }

  try {
    await copyFile(indexPath, panelPath);
    console.log('[postbuild] Created panel.html from index.html');
  } catch (error) {
    console.error('[postbuild] Failed to create panel.html:', error);
    process.exit(1);
  }
}

main();
