/* ==========================================================================
   端到端冒烟测试：用**真正的 Pyodide 运行时**（与浏览器里同一个 WASM 版本，
   Python 3.12 + numpy 1.26）执行每一道代码题，验证
     - solution + tests  → 通过
     - starter  + tests  → 失败
   判题用的 harness 直接从 assets/runner.js 里抽取，保证测的就是线上那份。
   用法: node tools/smoke-pyodide.mjs [lesson.html ...]
   ========================================================================== */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.cwd());
// 主线（lessons/）暂时没有代码题；进阶篇（advanced/）保留了全部 54 道。
// 两处都要扫，否则搬完目录后判题闸门会「找不到课程文件」。
const LESSON_DIRS = ['lessons', 'advanced'].map((d) => join(ROOT, d));

/* ---------- 从 runner.js 抽出真正的 Python harness ---------- */
function extractPrelude() {
  const src = readFileSync(join(ROOT, 'assets', 'runner.js'), 'utf-8');
  const m = src.match(/var PRELUDE = (\[[\s\S]*?\])\.join\('\\n'\);/);
  if (!m) throw new Error('无法从 assets/runner.js 里抽取 PRELUDE');
  const arr = new Function('return ' + m[1])();
  if (!Array.isArray(arr) || !arr.length) throw new Error('PRELUDE 抽取结果不是非空数组');
  return arr.join('\n');
}

/* ---------- 从课程 HTML 里抽出代码题 ---------- */
const SCRIPT_RE = /<script\b[^>]*type="text\/x-python"[^>]*data-role="(starter|tests|solution)"[^>]*>([\s\S]*?)<\/script>/gi;

function balancedDiv(html, start) {
  let depth = 0;
  const re = /<div\b|<\/div\s*>/gi;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].toLowerCase().startsWith('</')) {
      depth--;
      if (depth === 0) return html.slice(start, m.index + m[0].length);
    } else depth++;
  }
  return html.slice(start);
}

function extractExercises(html) {
  const out = [];
  const re = /<div\b[^>]*\bclass="([^"]*)"[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (!m[1].split(/\s+/).includes('code-ex')) continue;
    const chunk = balancedDiv(html, m.index);
    const cidM = chunk.match(/data-code="([^"]+)"/);
    const roles = {};
    let s;
    SCRIPT_RE.lastIndex = 0;
    while ((s = SCRIPT_RE.exec(chunk))) roles[s[1]] = s[2].replace(/^\s*\n/, '');
    if (cidM && roles.starter && roles.tests && roles.solution) {
      out.push({ id: cidM[1], ...roles });
    }
  }
  return out;
}

/* ---------- 主流程 ---------- */
const args = process.argv.slice(2);
let files;
if (args.length) files = args.map((a) => resolve(a));
else files = LESSON_DIRS.flatMap((dir) => {
  try {
    return readdirSync(dir)
      .filter((f) => /^[0-9A-Z]+-.*\.html$/.test(f) && !f.startsWith('._'))
      .sort()
      .map((f) => join(dir, f));
  } catch (e) { return []; }
});

if (!files.length) { console.error('没有找到任何课程文件'); process.exit(2); }

console.log('抽取判题 harness …');
const PRELUDE = extractPrelude();
console.log(`  harness ${PRELUDE.split('\n').length} 行`);

const all = [];
for (const f of files) {
  if (!existsSync(f)) { console.log(`  跳过（不存在）${basename(f)}`); continue; }
  const html = readFileSync(f, 'utf-8');
  for (const ex of extractExercises(html)) all.push({ file: basename(f), ...ex });
}
console.log(`找到 ${all.length} 道代码题，来自 ${files.length} 个文件`);
if (!all.length) { console.error('没有抽到任何代码题'); process.exit(2); }

console.log('加载 Pyodide（与浏览器同一个运行时）…');
const t0 = Date.now();
const { loadPyodide } = await import(pathToFileURL(join(ROOT, 'pyodide', 'pyodide.mjs')).href);
const py = await loadPyodide({ indexURL: join(ROOT, 'pyodide') + '/' });
console.log(`  Pyodide ${py.version} 就绪 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
await py.loadPackage('numpy');
const npVer = await py.runPythonAsync('import numpy; numpy.__version__');
console.log(`  numpy ${npVer}`);
await py.runPythonAsync(PRELUDE);

async function judge(code, tests) {
  py.globals.set('_rl_user_code', code);
  py.globals.set('_rl_tests', tests);
  const out = await py.runPythonAsync('_rl_json(_rl_user_code, _rl_tests)');
  return JSON.parse(out);
}

let pass = 0, fail = 0;
const problems = [];
for (const ex of all) {
  const sol = await judge(ex.solution, ex.tests);
  const str = await judge(ex.starter, ex.tests);
  const okSol = sol.passed === true;
  const okStr = str.passed === false;
  if (okSol && okStr) {
    pass++;
    console.log(`  ✓ ${ex.id}`);
  } else {
    fail++;
    const why = [];
    if (!okSol) why.push('solution 未通过：' + (sol.error || '(无错误信息)').split('\n')[0]);
    if (!okStr) why.push('starter 竟然通过了 —— 测试太弱');
    problems.push({ id: ex.id, file: ex.file, why });
    console.log(`  ✗ ${ex.id}  [${ex.file}]`);
    why.forEach((w) => console.log(`      ${w}`));
  }
}

console.log('\n' + '='.repeat(64));
console.log(`Pyodide 端到端判题：${pass} 通过 / ${fail} 失败（共 ${all.length} 题）`);
if (problems.length) {
  console.log('有问题的题目：');
  problems.forEach((p) => console.log(`  - ${p.id} (${p.file})`));
}
console.log('='.repeat(64));
process.exit(fail ? 1 : 0);
