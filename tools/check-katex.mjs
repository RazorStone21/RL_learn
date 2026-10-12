/* 用真正的 KaTeX 渲染每一课里的每条公式，抓出语法错误。
 *
 * 为什么必须做这个：页面上 KaTeX 设了 throwOnError:false，
 * 写错的公式只会显示成红色小字，不会报错，很容易一路带到最后。
 *
 * 用法: node tools/check-katex.mjs [文件...]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = resolve(process.cwd());
const require = createRequire(import.meta.url);

// katex.min.js 是 UMD 包，在 Node 里可以直接 require
const katexPath = join(ROOT, 'assets', 'katex', 'katex.min.js');
if (!existsSync(katexPath)) {
  console.error('找不到 assets/katex/katex.min.js');
  process.exit(2);
}
const katex = require(katexPath);

// 与 assets/math.js 保持一致的宏
const MACROS = {
  '\\E': '\\mathbb{E}', '\\R': '\\mathbb{R}', '\\var': '\\operatorname{Var}',
  '\\argmax': '\\operatorname*{arg\\,max}', '\\argmin': '\\operatorname*{arg\\,min}',
  '\\d': '\\mathrm{d}',
};

function lessonFiles() {
  const out = [];
  for (const d of ['lessons', 'advanced']) {
    const dir = join(ROOT, d);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (/^[0-9A-Z]+-.*\.html$/.test(f) && !f.startsWith('._')) out.push(join(dir, f));
    }
  }
  return out.sort();
}

/* 抽出所有公式。先取 $$...$$（块级），再取剩余的 $...$（行内）。 */
function extractMath(html) {
  // 去掉 script / style，避免把代码里的 $ 当公式
  let s = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
              .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
              .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ');
  const out = [];
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, body) => { out.push({ body, display: true }); return ' '; });
  s = s.replace(/(?<!\$)\$([^$\n]{1,600}?)\$(?!\$)/g, (_, body) => { out.push({ body, display: false }); return ' '; });
  return out;
}

let files = process.argv.slice(2);
if (!files.length) files = lessonFiles();

let total = 0, bad = 0;
const report = [];
for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const items = extractMath(html);
  const errs = [];
  for (const it of items) {
    total++;
    // 公式里写 `<` 时，若后面紧跟字母，HTML 解析器会把它当成标签开头，
    // 整段结构崩掉（例如写成 $t<n$ 想要"小于 n"）。
    // `<1`、`<\infty` 这类不跟字母的是安全文本，不报。
    const danger = /<[A-Za-z]/.exec(it.body);
    if (danger) {
      const at = Math.max(0, danger.index - 24);
      errs.push({
        body: it.body.trim().replace(/\s+/g, ' ').slice(0, 110),
        msg: `公式里的 \`<\` 后面紧跟字母（会破坏 HTML 解析），请改写：`
           + `…${it.body.slice(at, danger.index + 12).replace(/\s+/g, ' ')}…  → 用 \\lt`,
      });
      continue;
    }
    try {
      katex.renderToString(it.body, { displayMode: it.display, throwOnError: true, macros: MACROS, strict: false });
    } catch (e) {
      errs.push({ body: it.body.trim().replace(/\s+/g, ' ').slice(0, 110), msg: String(e.message || e).slice(0, 110) });
    }
  }
  bad += errs.length;
  if (errs.length) report.push({ file: basename(f), n: items.length, errs });
}

for (const r of report) {
  console.log('='.repeat(70));
  console.log(`${r.file}  （共 ${r.n} 条公式）`);
  for (const e of r.errs) {
    console.log(`  [公式错误] ${e.msg}`);
    console.log(`             ${e.body}`);
  }
}
console.log('');
console.log('='.repeat(70));
console.log(`KaTeX 渲染校验：${files.length} 个文件，${total} 条公式，${bad} 条报错`);
if (bad) { console.log('有公式无法编译。'); process.exit(1); }
console.log('全部公式可正常编译。');
