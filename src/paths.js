import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Los datos personales viven fuera del proyecto (y fuera de OneDrive), para que
// nunca acaben en un repositorio ni sincronizados. KURSO_DATA permite usar otra carpeta,
// por ejemplo para probar con una copia.
const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
export const DATA_DIR = process.env.KURSO_DATA || path.join(base, 'Kurso');
export const DATA_FILE = path.join(DATA_DIR, 'data.json');
export const VAULT_FILE = path.join(DATA_DIR, 'secretos.dpapi');
export const GRADES_SAMPLE_FILE = path.join(DATA_DIR, 'calificaciones-muestra.html');

export const ensureDataDir = () => fs.mkdir(DATA_DIR, { recursive: true });
