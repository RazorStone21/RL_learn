#!/usr/bin/env node
/* ==========================================================================
   把两份 manifest.json 打平成 assets/manifests.js
   --------------------------------------------------------------------------
   为什么需要这一步：
   直接双击 index.html（file://）时，fetch() 读本地 JSON 会被同源策略拒绝
   （Chrome / Edge / Firefox / Safari 都一样，报 TypeError），整站会白屏。
   而 <script src="..."> 在 file:// 下不受限制，所以课表改成构建期打平成 JS。

   数据源仍然是 lessons/manifest.json 与 advanced/manifest.json —— 新增或
   改名课程后，记得跑一次：

       node tools/build-manifests.mjs

   用法:
       node tools/build-manifests.mjs          # 生成
       node tools/build-manifests.mjs --check  # 只检查是不是最新的（CI 用）
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'manifests.js');

const SOURCES = [
  ['lessons', 'lessons/manifest.json'],
  ['advanced', 'advanced/manifest.json'],
];

function build() {
  const lines = [
    '/* 自动生成，请不要手改。',
    ' * 改完 lessons/manifest.json 或 advanced/manifest.json 后运行：',
    ' *   node tools/build-manifests.mjs',
    ' * 生成原因见 tools/build-manifests.mjs 顶部说明（file:// 下不能 fetch）。',
    ' */',
    'window.RL_MANIFESTS = window.RL_MANIFESTS || {};',
    '',
  ];

  const problems = [];

  for (const [key, rel] of SOURCES) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      problems.push(`缺少 ${rel}`);
      continue;
    }
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));

    // 完整性检查：manifest 里列出的每一课都应该真的有文件。
    // 写错文件名时，与其等用户看到 404，不如构建期就报出来。
    const dir = path.dirname(file);
    const seen = new Set();
    for (const L of json.lessons || []) {
      seen.add(L.number);
      const p = path.join(dir, L.file);
      if (!fs.existsSync(p)) problems.push(`${rel}: ${L.number} 指向的文件不存在 -> ${L.file}`);
    }
    for (const part of json.parts || []) {
      for (const num of part.lessons || []) {
        if (!seen.has(num)) problems.push(`${rel}: 分区 ${part.id || part.name} 里的 ${num} 不在 lessons 列表中`);
      }
    }
    const n = (json.lessons || []).length;
    if (typeof json.lessonCount === 'number' && json.lessonCount !== n) {
      problems.push(`${rel}: lessonCount=${json.lessonCount}，实际 ${n} 课`);
    }

    lines.push(`window.RL_MANIFESTS[${JSON.stringify(key)}] = ${JSON.stringify(json)};`);
    lines.push('');
  }

  if (problems.length) {
    // 完整性问题是硬错误：生成一个能用的文件没有意义
    console.error('课表自检未通过：');
    for (const p of problems) console.error('  - ' + p);
    process.exitCode = 1;
  }

  return lines.join('\n');
}

const content = build();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old !== content) {
    console.error('assets/manifests.js 已过期，请运行：node tools/build-manifests.mjs');
    process.exit(1);
  }
  console.log('assets/manifests.js 是最新的');
} else {
  if (process.exitCode) {
    console.error('（课表有问题，未写入。先修好上面的问题。）');
  } else {
    fs.writeFileSync(OUT, content, 'utf8');
    const kb = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1);
    console.log(`已生成 assets/manifests.js（${kb} KB）`);
  }
}
