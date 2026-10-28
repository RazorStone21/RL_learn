#!/usr/bin/env node
/* ==========================================================================
   打包成「一个 HTML 文件」——dist/rl-learn.html
   --------------------------------------------------------------------------
   目标：双击就能读，不需要服务器、不需要旁边跟着一堆 assets/。

   做法：
     · 58 篇课程 + 3 篇参考文档的 <body> 内容，各存成一个 <template>
     · course.css / KaTeX（含字体）/ 各组件脚本，全部内联
     · 打开某课时，外壳把这些拼成一篇完整文档，塞进 iframe 的 srcdoc
       （srcdoc 与父页面同源，postMessage / localStorage 都照常工作）
     · 代码题跑不了：单文件里没有 Pyodide（26 MB 的 wasm 塞不下也没意义），
       课时页会自动降级成「可读、可看答案、可自评完成」

   用法:
       node tools/build-single.mjs
       node tools/build-single.mjs --check    # 只校验 dist/ 里的版本是否最新（CI 用）
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'rl-learn.html');

const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readB64 = (rel) => fs.readFileSync(path.join(ROOT, rel)).toString('base64');

/* ---------- 1. 要打包的文档清单（顺序 = 目录顺序） ---------- */

const docs = [];
for (const [mf, dir] of [
  ['lessons/manifest.json', 'lessons/'],
  ['advanced/manifest.json', 'advanced/'],
]) {
  const m = JSON.parse(readText(mf));
  for (const L of m.lessons) docs.push(dir + L.file);
}
docs.push('reference/glossary.html', 'reference/algorithms.html', 'reference/notation.html');

/* ---------- 2. 抽出 <body>，去掉外链脚本 ---------- */

function extractDoc(rel) {
  const src = readText(rel);
  const m = src.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!m) throw new Error(rel + '：找不到 <body>');

  // 外部脚本在这里全都不需要：依赖由外壳统一内联进 srcdoc，
  // 留着相对路径的 <script src> 只会在单文件里 404。
  const body = m[1]
    .replace(/<script\b[^>]*\bsrc=[^>]*>\s*<\/script>\s*/gi, '')
    .trim();

  return {
    body,
    math: /katex\.min\.css/.test(src),
    runtime: /assets\/lesson\.js/.test(src),
  };
}

/* ---------- 3. KaTeX：把字体文件换成 data: URL ---------- */

function buildKatexCss() {
  const css = readText('assets/katex/katex.min.css');
  let n = 0;
  const out = css.replace(
    /src:url\(fonts\/([\w-]+)\.woff2\) format\("woff2"\),url\(fonts\/\1\.woff\) format\("woff"\),url\(fonts\/\1\.ttf\) format\("truetype"\)/g,
    (_m, name) => {
      n++;
      return 'src:url(data:font/woff2;base64,' +
        readB64('assets/katex/fonts/' + name + '.woff2') +
        ') format("woff2")';
    }
  );
  if (n === 0) throw new Error('KaTeX 字体没匹配到，检查 katex.min.css 的 @font-face 写法');
  // 只内联 woff2：2016 年之后的浏览器全都支持，ttf/woff 是给 IE 时代的兜底，
  // 全部内联会把文件从 3 MB 撑到 4.5 MB。
  return { css: out, fonts: n };
}

/* ---------- 4. 原样内联的资源 ---------- */

const ASSETS = {
  'rl-katex-js': 'assets/katex/katex.min.js',
  'rl-autorender-js': 'assets/katex/contrib/auto-render.min.js',
  'rl-store-js': 'assets/store.js',
  'rl-quiz-js': 'assets/quiz.js',
  'rl-sim-js': 'assets/sim.js',
  'rl-lesson-js': 'assets/lesson.js',
  'rl-math-js': 'assets/math.js',
};

/* ---------- 5. 组装 ---------- */

function build() {
  const katex = buildKatexCss();
  const shell = readText('index.html');

  // 半角尖括号里的 </script 会截断内联块；先确认要被「当作脚本整段内联」的素材干净。
  // 注意课程正文里的 <script type="text/x-python">…</script> 是正文的一部分，
  // 会被浏览器正常解析，不算在内。
  const flat = { 'katex.min.css': katex.css };
  for (const [id, rel] of Object.entries(ASSETS)) flat[rel] = readText(rel);
  flat['assets/course.css'] = readText('assets/course.css');
  flat['assets/manifests.js'] = readText('assets/manifests.js');
  flat['assets/app.js'] = readText('assets/app.js');

  const dirty = [];
  for (const [name, text] of Object.entries(flat)) {
    if (/<\/script/i.test(text)) dirty.push(name);
  }

  const parts = [];
  for (const rel of docs) {
    const d = extractDoc(rel);
    // 正文里不能出现 </template>，否则会提前关掉外层模板
    if (/<\/template/i.test(d.body)) dirty.push(rel + '（含 </template>）');

    // 代码题的 Python 源码是 script 元素的原始文本，里面若有 </script 会提前截断
    const pyBlocks = d.body.match(/<script[^>]*text\/x-python[^>]*>[\s\S]*?<\/script>/gi) || [];
    for (const b of pyBlocks) {
      const inner = b.replace(/^[\s\S]*?>/,'').replace(/<\/script>\s*$/i, '');
      if (/<\/script/i.test(inner)) dirty.push(rel + '（Python 代码里出现 </script>）');
    }

    parts.push(
      '<template id="doc-' + rel + '" data-math="' + (d.math ? 1 : 0) +
      '" data-runtime="' + (d.runtime ? 1 : 0) + '">' + d.body + '</template>'
    );
  }
  if (dirty.length) {
    throw new Error('以下素材含 </script> 或 </template>，会截断内联块：' + dirty.join(', '));
  }

  const templates = parts.join('\n');
  const assetBlocks = Object.entries(ASSETS)
    .map(([id, rel]) => '<script type="text/plain" id="' + id + '">' + readText(rel) + '</script>')
    .join('\n');
  const katexCssBlock =
    '<script type="text/plain" id="rl-katex-css">' + katex.css + '</script>';

  const runtime = `
<script>window.RL_SINGLE = true;</script>
${templates}
${katexCssBlock}
${assetBlocks}
<script>
/* 把一课拼成完整文档，交给 iframe 的 srcdoc。
   资源一律从上面的 text/plain 块里取，避免在 JS 字符串里再转义一遍。 */
window.RL_DOC = (function () {
  function txt(id) {
    var el = document.getElementById(id);
    return el ? el.textContent : '';
  }
  var courseCss = txt('rl-css');
  var katexCss = null;

  return function (file) {
    var t = document.getElementById('doc-' + file);
    if (!t) return null;
    var math = t.getAttribute('data-math') === '1';
    var needsRuntime = t.getAttribute('data-runtime') === '1';
    if (math && katexCss === null) katexCss = txt('rl-katex-css');

    var out = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>' + courseCss + '</style>' +
      (math ? '<style>' + katexCss + '</style>' : '') +
      '</head><body>' +
      '<script>window.RL_SINGLE = true;<\\/script>' +
      t.innerHTML;

    if (math) {
      out += '<script>' + txt('rl-katex-js') + '<\\/script>' +
             '<script>' + txt('rl-autorender-js') + '<\\/script>';
    }
    if (needsRuntime) {
      out += '<script>' + txt('rl-store-js') + '<\\/script>' +
             '<script>' + txt('rl-quiz-js') + '<\\/script>' +
             '<script>' + txt('rl-sim-js') + '<\\/script>' +
             '<script>' + txt('rl-lesson-js') + '<\\/script>';
    }
    if (math) out += '<script>' + txt('rl-math-js') + '<\\/script>';
    return out + '</body></html>';
  };
})();
</script>`;

  let html = shell;

  const swap = (from, to) => {
    if (!html.includes(from)) throw new Error('index.html 里找不到这段，构建脚本需要同步更新：' + from.slice(0, 60));
    // 必须用函数式替换：replacement 字符串里的 $& / $' / $1 会被当成「匹配内容」
    // 展开。katex.min.js 里恰好有 /[^]/g,"$&\u0332" 这种写法，用字符串替换会把
    // 整个 KaTeX 源码替换坏掉（表现为公式全不渲染 + 一堆语法错误）。
    html = html.replace(from, () => to);
  };

  swap('<link rel="stylesheet" href="assets/course.css">',
       '<style id="rl-css">' + readText('assets/course.css') + '</style>');
  swap('<script src="assets/manifests.js"></script>',
       '<script>' + readText('assets/manifests.js') + '</script>');
  swap('<script src="assets/store.js"></script>',
       '<script>' + readText('assets/store.js') + '</script>');
  // 单文件里没有 Pyodide 目录，运行器留着只会误导；课内会按「不可运行」降级
  swap('<script src="assets/runner.js"></script>', '<!-- 单文件版不含 Pyodide 运行时 -->');
  swap('<script src="assets/app.js"></script>',
       runtime + '\n<script>' + readText('assets/app.js') + '</script>');

  html = html.replace('<title>强化学习的数学原理</title>',
    '<title>强化学习的数学原理（单文件版）</title>');

  return { html, fonts: katex.fonts };
}

const { html, fonts } = build();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old !== html) {
    console.error('dist/rl-learn.html 已过期，请运行：node tools/build-single.mjs');
    process.exit(1);
  }
  console.log('dist/rl-learn.html 是最新的');
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html, 'utf8');
  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
  console.log(`已生成 dist/rl-learn.html（${mb} MB，${docs.length} 篇文档，内联 KaTeX 字体 ${fonts} 个）`);
}
