// Arma herramientas-web.zip con el contenido de dist/ para subirlo al public_html del VPS.
// Usa tar.exe (incluido en Windows 10+) porque Compress-Archive de PowerShell 5.1 guarda
// rutas con barras invertidas que el extractor de Linux del panel no acepta.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
const zip = resolve('herramientas-web.zip');

if (!existsSync(dist)) {
  console.error('No existe dist/. Corré primero: npm run build');
  process.exit(1);
}
if (existsSync(zip)) rmSync(zip);

execFileSync('tar', ['-a', '-c', '-f', zip, '--format', 'zip', '-C', dist, ...readdirSync(dist)], { stdio: 'inherit' });
console.log(`Listo: ${zip}`);
