// Development only. Keep this key stable so existing local reflections remain readable.
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const file = new URL('../.dev.vars', import.meta.url);
let contents = '';
try { contents = await readFile(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!/^AUTH_ENCRYPTION_KEY=/m.test(contents)) {
  await writeFile(file, `${contents}\n# Local development only; never commit this key.\nAUTH_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}\n`, { mode: 0o600 });
  console.log('Configured local reflection encryption. Retain .dev.vars with the local database.');
} else {
  console.log('Keeping the existing local encryption configuration.');
}
