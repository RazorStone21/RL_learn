# 数学课作者手册（主线 lessons/）

**先读这三个文件，再动手：**
1. `lessons/0001-probability-basics.html` —— **样板课**，照它的结构和风格写
2. `COURSE-SPEC.md` 的 **§12（缩写符号）** 与 **§16（数学课规范）**
3. `docs/plain-terms.md` —— 术语白话的**照抄来源**（说法必须与它一致）

---

## 一、这门课是什么

围绕赵世钰《Mathematical Foundations of Reinforcement Learning》(Springer 2025)。
读者**具备概率论与线性代数基础**，是来学"为什么算法这样设计、为什么它有效"的。
**要求真的讲数学与证明**，不许写"证明略""可以证明"。

主线**没有代码题**，每课 **恰好 10 道选择题**。

---

## 二、文件骨架（照抄，只改内容）

```html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>00XX · 课程标题 — 强化学习的数学原理</title>
<link rel="stylesheet" href="../assets/course.css">
<link rel="stylesheet" href="../assets/katex/katex.min.css">
</head>
<body>
<article class="lesson" data-number="00XX" data-slug="slug" data-part="分部名" data-kind="math">

  <header class="lesson-head">
    <p class="eyebrow">数学预备 N ／ 第 X 部分 · 基础工具</p>
    <h1>课程标题</h1>
    <p class="lede">一到两句话：这一课解决什么问题。</p>
    <div class="objectives">
      <h2>学完这一课你会</h2>
      <ul><li>…（4–5 条，用"能说清/能写出/能判断/能证明"起头）</li></ul>
    </div>
  </header>

  <section>
    <h2>1. 小节标题</h2>
    <p>正文…</p>
    <div class="def"><span class="label">定义 1.1（名称）</span><p>…</p></div>
    <div class="thm"><span class="label">定理 1.2（名称）</span><p>…</p></div>
    <div class="proof"><span class="label">证明</span><p>…</p><span class="qed">∎</span></div>
    <div class="eg"><span class="label">例 1.3</span><p>…</p></div>
    <div class="rem"><span class="label">注记 1.4（为什么重要）</span><p>…</p></div>
    <figure class="fig">…</figure>
  </section>

  <section>
    <h2>小结</h2>
    <ul><li>…</li></ul>
    <p>下一课会…（一句话过渡）</p>
  </section>

  <section class="exercises">
    <h2>课后练习</h2>
    <!-- 恰好 10 个 .mcq -->
  </section>

  <footer class="lesson-foot">
    <div class="primary-source">
      <h2>一手来源</h2>
      <p>S. Zhao, <em>Mathematical Foundations of Reinforcement Learning</em>, Springer, 2025, 第 X 章第 Y 节。</p>
      <p>（可再补一条经典教材的对应章节）</p>
    </div>
    <p class="ask">有不清楚的地方，直接追问你的 AI 老师，它是你的私教。比如可以问："…"。</p>
  </footer>

</article>
<script src="../assets/katex/katex.min.js"></script>
<script src="../assets/katex/contrib/auto-render.min.js"></script>
<script src="../assets/lesson.js"></script>
<script src="../assets/math.js"></script>
</body>
</html>
```

**`data-number` / `data-slug` / `data-part` 必须与 `lessons/manifest.json` 完全一致**
（`data-part` 用 manifest 里的 `part` 原文）。文件名必须是 `{number}-{slug}.html`。

---

## 三、六条硬规则（违反会被闸门拦下）

### 1. 公式只用 KaTeX，定界符必须成对
行内 `$v_\pi(s)$`，块级 `$$v_\pi=(I-\gamma P_\pi)^{-1}r_\pi$$`，
多行 `$$\begin{aligned} a &= b \\ &= c \end{aligned}$$`。
可用宏：`\E \R \var \argmax \argmin \d`。
**不要**用 `<var>`、`<sub>` 手写公式。

### 2. ⚠️ SVG 插图里绝对不能用 `$...$`
KaTeX 无法把 HTML 标签塞进 SVG 的 `<text>`，公式会被**静默吃掉**。
图内一律用 Unicode：Ω μ ε σ γ Σ ∫ ± ≤ ≥ ≠ ≈ ∈ ⊆ → × · √ ∞

### 3. 插图必须有 viewBox / role / aria-label / figcaption
```html
<figure class="fig">
  <svg viewBox="0 0 520 200" role="img" aria-label="一句话说明画了什么">
    <line x1="70" y1="150" x2="470" y2="150" class="axis-b"/>
    <rect x="100" y="100" width="42" height="50" class="bar"/>
    <text x="112" y="166" class="lbl">1</text>
  </svg>
  <figcaption class="fig-cap"><span class="fig-num">图 X.1</span>
    一到三句解释这张图在说什么。</figcaption>
</figure>
```
语义 class（配色自动跟随主题，**不要在 SVG 里写死颜色**）：
`axis` `axis-b` `grid` `lbl` `val` `val-b` `bar` `bar-hi` `area` `curve` `curve2`
`mark` `dot` `dot-a` `box` `box-a` `arrow` `arrow-a`。
每课 **4–7 张**，编号 `图 <课号>.<序号>` 按出现顺序递增。

### 4. 术语首次出现必须给白话
查 `docs/plain-terms.md` **照抄**它的说法。写法：`术语（白话）`，
且白话要**紧跟在术语后面**（中间最多隔一个引号或书名号）。
白话长度**不超过 20 字**（判据窗口有限）。
若确属后文才讲，写"X 课会讲"。

### 5. 缩写与希腊符号首次出现也要解释
`P(A)` 里的符号若首次出现在公式里，正文要用"式中 …"交代。

### 6. 文风
- **不用** `——`（每千字 ≤ 1.0，最好 0）
- **不用** `<strong>`
- **不写**"值得注意的是""也就是说""正是"这类套话
- 不出现嵌套括号
- 语言要说人话（见样板课的写法），别写成翻译腔

---

## 四、10 道选择题的配比

| 类型 | 数量 |
|---|---|
| 定义辨析 | 2 |
| **推导中间步骤**（"从 (2.3) 到 (2.4) 用了哪条性质"） | 3 |
| 反例 / 边界判断 | 2 |
| 结论应用（给个小例子算结果） | 2 |
| 为什么这样设计 | 1 |

- 选项**固定 4 个**，`data-answer` 为 0 基下标，**正确答案位置要分散**
- 每题必须有 `.mcq-explain`，要说清**错项为什么错**
- 选项长度要接近（差异过大会被判"靠长度露馅"）

结构：
```html
<div class="mcq" data-answer="2">
  <p class="mcq-q">1. 题干？</p>
  <ol class="mcq-options">
    <li>选项 A</li><li>选项 B</li><li>选项 C</li><li>选项 D</li>
  </ol>
  <div class="mcq-explain">
    <p>为什么：…</p>
    <p>A 错在…；B 错在…；D 错在…</p>
  </div>
</div>
```

---

## 五、写完必须自查（命令逐条跑，全绿才算完成）

```bash
python3 tools/check-lesson.py lessons/00XX-*.html    # 结构+10道选择题+插图
python3 tools/check-html.py   lessons/00XX-*.html    # 标签平衡
python3 tools/audit-jargon.py lessons/00XX-*.html    # 概念术语白话
python3 tools/audit-terms.py  lessons/00XX-*.html    # 缩写与希腊符号
python3 tools/audit-readability.py lessons/00XX-*.html
python3 tools/scan-style.py   lessons/00XX-*.html    # 破折号/加粗
node    tools/check-katex.mjs lessons/00XX-*.html    # ★ 真的用 KaTeX 编译每条公式
python3 tools/audit-math.py   lessons/00XX-*.html    # ★ 交叉引用/证明结束标记/编号
```

★ 这两条是**必跑**的，原因：

- **`check-katex.mjs`**：页面上 KaTeX 设了 `throwOnError:false`，**写错的公式只会渲染成红色小字，不报错**。
  必须用真 KaTeX 编译一遍。常见错误：
  - `\big\mid` 非法（`\mid` 不能作 `\big` 的分隔符）→ 改用 `\big|` 或直接 `\mid`
  - `\left[` 没有配对的 `\right]`
  - `\frac{1}` 缺参数、`\begin{aligned}` 没有 `\end{aligned}`
  - 用了未定义的宏（本项目只定义了 `\E \R \var \argmax \argmin \d`）
- **`audit-math.py`**：交叉引用必须指向真实存在的课；每个证明块必须有 `∎`；
  公式编号用本课前缀（0008 课写 `(8.1)`，不是 `(3.1)`）；插图编号同理。

**关键公式要编号**：把真正的结论（定理/命题给出的等式）包进 `.eq` 结构并编号，
推导的中间步骤不编号。写法：

```html
<div class="eq">
  <span class="eq-body">$$v_\pi=(I-\gamma P_\pi)^{-1}r_\pi$$</span>
  <span class="eq-num">(9.1)</span>
</div>
```
正文与题干里用「见式 (9.1)」引用它。

**必须做到 0 错误 0 警告**。修完再跑一遍确认。

### 浏览器实测（可选但强烈建议）
```bash
# 服务器已在跑：http://127.0.0.1:8777/
# 用 headless Chrome 截图，确认公式渲染出来、图没画歪
```

---

## 六、数学内容的质量要求

1. **证明要完整**：每一步都要有依据（用到了哪条定理/性质）。
   较长的证明先写"思路："再给推导。
2. **符号统一**：见 `COURSE-SPEC.md` §16.5 的符号表，全课程一致。
3. **例子要具体**：优先用网格世界（grid world）或掷骰子这类能手算的例子。
4. **不要编造定理名**：不确定的定理名宁可写成"命题"。
5. **数学上要正确**：写完自己验算一遍算例。
