// Vendor the Pyodide runtime into ./pyodide so the course runs fully offline.
// Usage: node tools/vendor-pyodide.mjs [version]
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const VERSION = process.argv[2] || 'v0.26.2';
const CDN = `https://cdn.jsdelivr.net/pyodide/${VERSION}/full`;
const OUT = resolve(process.cwd(), 'pyodide');

const CORE = [
  'pyodide.js',
  'pyodide.mjs',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

const WANTED = ['numpy'];

async function sizeOf(p) {
  try { return (await stat(p)).size; } catch { return 0; }
}

async function download(rel, { optional = false } = {}) {
  const dest = join(OUT, rel);
  await mkdir(dirname(dest), { recursive: true });
  const url = `${CDN}/${rel}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (optional) { console.log(`  skip ${rel} (HTTP ${res.status})`); return false; }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  ok   ${rel}  ${(buf.length / 1024).toFixed(0)} KB`);
  return true;
}

async function resolvePackages() {
  const res = await fetch(`${CDN}/pyodide-lock.json`);
  const lock = await res.json();
  const seen = new Set();
  const queue = [...WANTED];
  const files = [];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const pkg = lock.packages[name];
    if (!pkg) { console.log(`  warn: package "${name}" not in lock file`); continue; }
    files.push(pkg.file_name);
    for (const dep of pkg.depends || []) queue.push(dep);
  }
  return files;
}

console.log(`Vendoring Pyodide ${VERSION} -> ${OUT}`);
await mkdir(OUT, { recursive: true });
for (const rel of CORE) await download(rel, { optional: true });

console.log('Resolving package wheels...');
const wheels = await resolvePackages();
console.log(`  wheels: ${wheels.join(', ') || '(none)'}`);
for (const w of wheels) await download(w);

const total = (await Promise.all(CORE.map((f) => sizeOf(join(OUT, f))))).reduce((a, b) => a + b, 0);
console.log(`Core runtime bytes: ${(total / 1024 / 1024).toFixed(1)} MB`);
console.log('Done.');
