// Guarda secretos cifrados con DPAPI de Windows: solo tu usuario de Windows, en
// este equipo, puede descifrarlos. Los datos viajan por stdin, nunca por argumentos
// de línea de comandos, para que no queden visibles en la lista de procesos.
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { VAULT_FILE, ensureDataDir } from './paths.js';

class VaultError extends Error {
  code = 'dpapi';
}

function dpapi(operation, base64Input) {
  const script =
    'Add-Type -AssemblyName System.Security;' +
    '$i=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim());' +
    `$o=[Security.Cryptography.ProtectedData]::${operation}($i,$null,'CurrentUser');` +
    '[Console]::Out.Write([Convert]::ToBase64String($o))';
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
    });
    let out = '';
    let err = '';
    ps.stdout.on('data', (d) => (out += d));
    ps.stderr.on('data', (d) => (err += d));
    ps.on('error', reject); // PowerShell no se ha podido arrancar: no es un problema de los datos
    ps.on('close', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new VaultError(`No se pudo usar el cifrado de Windows: ${err.slice(0, 200)}`));
    });
    ps.stdin.end(base64Input);
  });
}

// Las operaciones van de una en una: dos conexiones a la vez no pueden pisarse las credenciales.
let queue = Promise.resolve();
const serial = (fn) => {
  const run = queue.catch(() => {}).then(fn);
  queue = run;
  return run;
};

// Si el archivo no se puede descifrar (copiado de otro usuario de Windows o dañado), se trata
// como si no hubiera credenciales: la app pedirá volver a conectar en vez de fallar siempre.
async function readNow() {
  let blob;
  try {
    blob = await fs.readFile(VAULT_FILE, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
  try {
    const plain = await dpapi('Unprotect', blob);
    return JSON.parse(Buffer.from(plain, 'base64').toString('utf8'));
  } catch (e) {
    if (e.code !== 'dpapi' && !(e instanceof SyntaxError)) throw e;
    console.error('Credenciales ilegibles, se ignoran:', e.message);
    return {};
  }
}

async function writeNow(data) {
  await ensureDataDir();
  const input = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  const blob = await dpapi('Protect', input);
  const tmp = `${VAULT_FILE}.tmp`;
  await fs.writeFile(tmp, blob, 'utf8');
  await fs.rename(tmp, VAULT_FILE);
}

export const readVault = () => serial(readNow);
export const writeVault = (data) => serial(() => writeNow(data));

// Borra el archivo entero: tras cerrar sesión no queda nada cifrado en el equipo.
export const clearVault = () => serial(() => fs.rm(VAULT_FILE, { force: true }));

export const updateVault = (mutator) => serial(async () => {
  const data = await readNow();
  mutator(data);
  await writeNow(data);
});
