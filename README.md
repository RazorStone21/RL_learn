# 强化学习的数学原理

围绕赵世钰《Mathematical Foundations of Reinforcement Learning》(Springer, 2025)
重建的**完全离线**浏览器端课程。

- **数学原理主线 31 课**：4 课数学预备 + 按原著 10 章拆出的 27 课。
  讲定义、定理与完整证明，含压缩映射定理、Robbins-Monro、Dvoretzky 收敛定理、
  SGD、贝尔曼方程矩阵形式、平均奖励度量、DPG 定理等。每课 10 道选择题，**无编程题**。
  内联 SVG 插图 142 张、编号公式 152 条、定理框 121 个、证明框 112 个。
- **进阶篇 27 课**：原「应用向」课程整体保留（多臂老虎机 → DQN → PPO → RLHF），
  含 54 道 Python 代码题，在浏览器内用 Pyodide 真跑 numpy。

全部离线：无 CDN、无外部字体、无网络依赖。KaTeX 与 Pyodide 都已内置。

## 本地运行

### 方式一：直接双击（不需要服务器）

双击 `index.html` 就能读。目录、公式、插图、选择题、进度全部正常。

**只有进阶篇的 54 道代码题跑不了**：浏览器不允许 `file://` 页面加载
Python 运行时（Pyodide 的 wasm 和 numpy 轮子都是 `fetch` 来的，被同源策略拒绝）。
这时每道代码题下面会写明原因，并提供「我在本机跑通了」按钮让你自己标记完成；
参考答案照常可以看，代码也可以复制到自己电脑上跑。

> 进度记在浏览器 localStorage 里，而**每种打开方式是一个独立的源**：
> 双击（`file://`）、`127.0.0.1:8777`、`https://<用户名>.github.io/...`
> 各自存各自的进度，不会互相看见。想在两者之间搬进度，用侧栏底部的
> 「导出」存成 JSON，再到另一种方式里「导入」。
> 建议选定一种方式长期用，别来回切。

### 方式二：起本地服务器（代码题可用）

```bash
./start.sh                 # 默认端口 8777，自动打开浏览器
./start.sh 9000            # 换端口
./start.sh 8777 --lan      # 绑定 0.0.0.0，手机（同一 Wi-Fi）也能访问
```

两种方式的差别只有一处：

| | 双击打开（`file://`） | `./start.sh` 或 GitHub Pages |
|---|---|---|
| 阅读、公式、插图、选择题、进度 | ✅ | ✅ |
| 进阶篇 Python 代码题 | ❌ 降级为「自评完成」 | ✅ 浏览器内真跑 |

## 学习进度（记住读到哪儿）

进度全部存在浏览器本地，不上传：

- **继续上次**：侧栏顶部按钮直接回到最后打开的那一课，并**恢复上次的滚动位置**；
  文字会提示「0003 · 线性代数 · 2 小时前」。
- **已读**：滚过一课 90% 即记为已读，目录里打 ✓，顶部进度条按「读到多少」而非
  「做了多少题」推进。
- **停留时长**：只统计页面可见的时间，后台标签页不刷时长；累计显示在进度条下面。
- **题目记录**：选择题只记「首次是否答对」，代码题记是否通过，与旧版数据兼容。
- **导出 / 导入**：侧栏底部可把进度存成 JSON，或从 JSON 合并恢复
  （已答对的题、更远的阅读进度优先保留）。
- 多标签页同时开着时，一边答题另一边目录会跟着刷新。

> 已知限制：Chrome / Edge / Firefox 的 `file://` 下 localStorage 可用；
> Safari 会拒绝本地存储，页面会提示「进度只在本次打开期间有效」。
> 无痕模式关闭即清空。同一个浏览器里放两份课程副本会共用一份进度。

## 部署到公网（在任何设备上访问）

课程是纯静态的，把整个仓库推到 GitHub 并开启 Pages 即可。
详见下方「部署」一节。

## 目录结构

```
index.html                  课程外壳骨架（侧栏、顶栏、iframe）
assets/
  app.js                    外壳逻辑：目录、路由、进度面板、导入导出、与课程页通信
  manifests.js              课表（由 tools/build-manifests.mjs 从两份 JSON 生成）
  course.css                共享样式表（Tufte 风格，可打印，含窄屏适配）
  store.js                  进度存储（localStorage，含阅读位置/时长/备份）
  quiz.js                   选择题组件（即时反馈 + 可重做）
  runner.js                 代码题运行器（Pyodide，外壳内共享一个实例）
  sim.js                    交互演示（多臂老虎机 / 网格世界 / 随机游走）
  math.js                   KaTeX 加载与公式渲染
  katex/                    内置 KaTeX 0.16.11（含字体）
lessons/
  manifest.json             数学原理主线目录（31 课，课表的唯一数据源）
  NNNN-*.html               主线课程（数学课，无代码题）
advanced/
  manifest.json             进阶篇目录（27 课）
  ANN-*.html                原「应用向」课程，含代码题
reference/                  术语表、算法速查表、符号表
pyodide/                    内置 Python 运行时 + numpy（离线，约 25 MB）
tools/
  serve.py                  本地服务器（多线程 + 禁用缓存）
  build-manifests.mjs       把两份 manifest.json 打平成 assets/manifests.js（改课表后必跑）
  validate-all.sh           一键跑完 11 道验收闸门
  check-lesson.py           课程结构 + 习题完整性 + 真的执行判题
  check-html.py             HTML 标签平衡 + 块级元素嵌套
  check-katex.mjs           用真 KaTeX 逐条编译每条公式
  check-invariants.py       红线不变量（公式编号 / 答案 / 题数 / 脚本数）
  audit-math.py             数学一致性（交叉引用 / ∎ / 编号前缀）
  audit-jargon.py           术语首现是否有白话解释
  audit-terms.py            缩写与符号首现是否有解释
  audit-readability.py      嵌套括号与未解释的英文词
  audit-prompts.py          代码题题干是否说清要做什么
  audit-hints.py            代码题提示是否点名每一步
  scan-style.py             文风（AI 腔 / 破折号 / 加粗）
  style-report.py           文风汇总报告
  _textutil.py              剥标签时的数学保护（见下方「坑」）
COURSE-SPEC.md              课程写作契约（含数学课规范）
COURSE-MAP.md               重构蓝图（章节 → 课程映射）
docs/AUTHORING-BRIEF.md     数学课撰写手册
docs/plain-terms.md         白话术语表（含业务与技术外来词）
```

## 自检

```bash
./tools/validate-all.sh     # 11 道闸门，全绿才算通过
python3 tools/style-report.py --check   # 文风闸门
node tools/build-manifests.mjs --check  # 课表是不是最新的（改过 manifest 就要重跑）
```

11 道闸门依次是：课程结构、HTML 标签平衡、真实 Pyodide 端到端判题、
缩写与符号、代码题题干、红线不变量、概念术语、可读性、代码题提示、
KaTeX 编译、数学一致性。

其中两道值得单独说明：

- **`check-katex.mjs` 用真的 KaTeX 逐条编译每条公式。** 页面设了
  `throwOnError: false`，写错的公式只会渲染成红色小字而不报错，所以必须这样查。
- **`smoke-pyodide.mjs` 用真实 Pyodide 跑一遍全部 54 道代码题**，
  与浏览器里是同一个运行时，判题 harness 直接从 `assets/runner.js` 抽取。

## 部署

推到一个 GitHub 仓库，然后在仓库的 **Settings → Pages** 里把
Source 设为 `Deploy from a branch`、分支选 `main`、目录选 `/ (root)`，保存即可。
一两分钟后站点出现在 `https://<用户名>.github.io/<仓库名>/`。

已在仓库里准备好两件事：

- `.nojekyll` —— 否则 GitHub Pages 会走 Jekyll 处理，可能忽略部分文件。
- 所有内部链接都是**相对路径**，因此放在子路径下（项目站点）也能正常工作。

> 进阶篇的代码题需要 Pyodide（约 25 MB）。它**不会在打开课程时自动下载**，
> 只在第一次点某道代码题的「运行」时才加载。除此之外整站无需任何下载。

## 几个踩过的坑（改代码前请读）

- **`file://` 下 `fetch()` 读本地文件一律失败。** 这正是旧版「必须起服务器」的原因：
  外壳要 `fetch('lessons/manifest.json')`，浏览器直接给 `TypeError`，整站白屏。
  现在课表改成 `assets/manifests.js`（`<script>` 引入），不受该限制。
  **新增/改名课程后必须跑一次 `node tools/build-manifests.mjs`**，否则目录里看不到新课；
  脚本会顺手校验课表里的文件是否真的存在。
- **`file://` 下父页面读不到 iframe 的 `contentDocument`（返回 null）**，
  所以外壳与课程页之间只能走 `postMessage`。滚动位置、停留时长都是这么传的。
- **滚动位置要等 KaTeX 渲染完再恢复**（见 `assets/lesson.js` 的 `whenSettled`），
  否则公式一展开页面变高，恢复的位置就偏了。进阶篇没引入 KaTeX，这条要跳过，
  不然每课白等 2 秒。
- **`start.sh` 必须是 LF 行尾。** Windows 上 `core.autocrlf` 会把检出转成 CRLF，
  shebang 变成 `bash\r`，然后报一句很难懂的
  `/usr/bin/env: 'bash\r': No such file or directory`。
  仓库根目录的 `.gitattributes` 已钉成 `*.sh text eol=lf`；改脚本后如果它又不肯跑，
  先看 `file start.sh` 是不是 CRLF。
- **数学里的裸 `<` 会吞正文。** 任何形如 `<[^>]+>` 的处理都会从 `<` 一路匹配到
  下一个 `>`，把中间整段文字删掉。曾因此在 11 课里静默吞掉 5153 个字，
  并让字数与术语检查长期漏报。修法是 `tools/_textutil.py`：剥标签前先把
  `$...$` 与 `$$...$$` 里的 `<` 换成占位符。**工具改动请复用它的
  `protect_math` / `strip_tags` / `visible_len`。**
- **KaTeX 的 auto-render 默认不认单个 `$`**，必须在 `assets/math.js` 里
  显式传 `delimiters`。
- **SVG `<text>` 里不能写 `$...$`**：KaTeX 会把整段吃掉。图内一律用 Unicode
  （Ω μ ε γ Σ ∫ ± ≤ ≥ ∈ ⊆ → × · √ ∞）。
- **编号公式不要塞进 `<p>`**：`<div class="eq">` 必须是 `<p>` 的兄弟节点。
- **`.eq` 是 flex 容器，子项必须写 `min-width: 0`。** flex 子项默认
  `min-width: auto`，不会缩到内容最小宽度以下；一条宽公式（实测 904px）
  会把整行撑开，把整个文档拉宽（实测 991px / 视口 375px），手机右侧内容全被切掉。
- **`http.server` 的两个坑**：单线程时监听队列只有 5，并发一多就
  connection reset（前端会误判成文件不存在）；不发 `Cache-Control` 会让浏览器
  一直用旧课表。`tools/serve.py` 两个都修了。

## 本机环境注意事项

- 工作区 `/Volumes/RAZOR` 是 **exFAT**：不支持硬链接，某些编辑器的原子写会报
  `ENOTSUP`，写文件请用 shell 重定向。exFAT 还会生成 `._*` 旁车文件（已在
  `.gitignore` 里排除）。
- 注意 exFAT 的块大小会让 `du` 严重虚报：本仓库 `du -sh` 显示 96 MB，
  实际文件内容只有约 31 MB。
