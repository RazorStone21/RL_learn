# COURSE-SPEC —— 课程写作契约（所有课都必须遵守）

这是本课程的唯一写作规范。写任何一课之前先读完本文件。

---

## 0. 写文件的方式（**必读，否则一定失败**）

工作区 `/Volumes/RAZOR` 是 **exFAT，不支持硬链接**，因此 `write` / `edit` 工具会报
`ENOTSUP: operation not supported on socket`。**必须用重定向写文件**：

在 bash 里用 `cat > 目标文件 <<'某个唯一定界符'`，内容写完后另起一行写该定界符。
定界符要加引号以免 shell 展开 `$` 和反引号，并且**定界符本身不能出现在正文任何一行**。

- 写完用 `wc -c < 文件` 确认非空。
- 再用 `python3 tools/check-lesson.py 文件` 做结构与判题自检。

---

## 1. 学习者与目标（决定取舍）

- **Mission：应用向** —— 把 RL 用到自己的真实业务问题上，不是做研究、不是应付考试。
- 读者画像：有编程基础、会基本 numpy 与概率统计，但**没系统学过 RL**。
- 因此每讲一个概念都要回答：**"这东西在我建模/选算法/诊断的时候有什么用？"**
- 数学以"够用"为准：给出公式、解释每个符号、说明它怎么用于计算；**不做收敛性证明**。
- 讲解用中文；**术语首次出现必须给英文原文**，如"折扣因子（discount factor, γ）"。

## 2. 教学法铁律（来自 `teach` skill，不可违背）

1. **一课一个具体的胜利**。开头用一句话说清"学完你能做到什么"。
2. **短**。正文控制在 ~1200–2000 字（不含代码与习题）。工作记忆很小，宁短勿长。
   > **零基础版例外**：按 §15 改写后每课要加 40–60 处白话解释（概念、记号、概率、numpy），
   > 实测在 **2000–4600 字**之间（中位约 3300）。这个变长是必要的，不要为了压字数删解释；
   > 超过 4600 字才说明写成了正文。
3. **知识为了习得 → 难度是敌人**；解释要顺、要具体、要给例子。
4. **技能为了保持 → 难度是工具**；习题必须是**检索练习**（让人回忆并写出），
   不能是"回去把上面第三段抄下来"。
5. **必须引用一手来源**。事实性断言要从 `RESOURCES.md` 里取，并在正文用
   `<a class="cite" href="...">` 标注（如 Sutton &amp; Barto §3.3）。**不要凭记忆编造公式或结论。**
6. 每课要有 `primary-source`（该课最值得读的一手资料），
   **URL 必须来自 `RESOURCES.md` 且标为 `[✓可达]`**。
7. 每课结尾要有"**问你的 AI 老师**"提醒。
8. 用 HTML 锚点链接到**其他课**与 **reference 文档**。
9. **复用优先**：能用 `assets/` 里现成的组件就用，不要内联重复造轮子。

## 3. 文件位置与命名

- 课程文件：`lessons/NNNN-<slug>.html`（四位数字，零填充）。
- 编号、slug、标题、所属部分**必须与 `lessons/manifest.json` 完全一致**。
- 参考文档：`reference/*.html`。

## 4. 页面骨架（复制此结构，不要改动标签与属性名）

```html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>0007 · 蒙特卡洛方法 — 强化学习入门</title>
<link rel="stylesheet" href="../assets/course.css">
</head>
<body>
<article class="lesson" data-number="0007" data-slug="monte-carlo" data-part="第二部分：无模型方法">

  <header class="lesson-head">
    <p class="eyebrow">第 7 课 · 第二部分：无模型方法</p>
    <h1>蒙特卡洛方法</h1>
    <p class="lede">学完这一课，你能<strong>只靠采样得到的完整回合</strong>估计状态价值，
      并说清它和动态规划的根本区别。</p>
    <div class="objectives">
      <h2>你会得到</h2>
      <ul>
        <li>能写出首次访问 MC 预测的更新式</li>
        <li>能解释 MC 为什么不需要环境模型</li>
        <li>能说出 MC 与 TD 的偏差-方差差异</li>
      </ul>
    </div>
  </header>

  <section>
    <h2>为什么需要它</h2>
    <p>…</p>
  </section>

  <!-- 可选：交互演示，只能使用第 8 节列出的 data-sim 之一 -->
  <figure class="sim" data-sim="random-walk" data-states="5" data-runs="100"></figure>

  <section>
    <h2>…</h2>
    <p>…</p>
    <div class="eq">
      <span class="eq-body">V(s) ← V(s) + α [ G<sub>t</sub> − V(s) ]</span>
      <span class="eq-num">(7.1)</span>
    </div>
  </section>

  <section class="exercises">
    <h2>课后练习</h2>
    <!-- 先 5 道选择题，再 2 道代码题，顺序不要混 -->
  </section>

  <footer class="lesson-foot">
    <div class="primary-source">
      <h2>一手来源</h2>
      <p>Sutton &amp; Barto, <em>Reinforcement Learning: An Introduction</em>, 第 5.1 节
        <a class="cite" href="http://incompleteideas.net/book/RLbook2020.pdf">[PDF]</a></p>
    </div>
    <p class="ask">有不清楚的地方，直接追问你的 AI 老师 —— 它是你的私教，可以就这一课的任何细节展开、
      也可以按你的业务场景给你重新举例。</p>
  </footer>

</article>
<script src="../assets/lesson.js"></script>
</body>
</html>
```

## 5. 选择题格式

```html
<div class="mcq" data-answer="2">
  <p class="mcq-q">1. 下列关于……的说法，哪一项是正确的？</p>
  <ol class="mcq-options">
    <li>选项一</li>
    <li>选项二</li>
    <li>选项三</li>
    <li>选项四</li>
  </ol>
  <div class="mcq-explain">
    <p><strong>为什么：</strong>……</p>
  </div>
</div>
```

规则（`teach` skill 强制，会被自动校验）：

- **每题 4 个选项**，`data-answer` 是**正确项的 0 基下标**（0–3）。
- **四个选项字数必须尽量一致**（长度差不超过约 30%），**不能**让正确答案靠长度/措辞露馅。
- **正确项位置要打散**：一课 5 题里，`data-answer` 的取值应大致均匀（不要连着都是 2）。
- 干扰项必须是**似是而非的真错**（常见误解），不能是明显凑数的废话。
- `mcq-explain` 必须解释**为什么对**，并顺便说明**主要干扰项错在哪**。
- 考的是**理解与辨析**，不是背诵。优先考："这个更新式为什么用 max 而不是期望""什么情况下 on-policy 更合适"。

## 6. 代码题格式

代码**不要**放进 JSON（转义太容易出错），用 `script type="text/x-python"` 内联。
浏览器不会执行这种 script，也不会显示它，运行器会自己取。

```html
<div class="code-ex" data-code="0007-code-1">
  <h3>代码题 1 · 用蒙特卡洛估计状态价值</h3>
  <div class="code-prompt">
    <p>给定一个 5 状态的随机游走环境……请实现 <code>mc_prediction(n_episodes, gamma)</code>，
      返回长度为 7 的 numpy 数组 <code>V</code>……</p>
  </div>
  <details class="hints">
    <summary>卡住了？看提示</summary>
    <ul><li>首次访问只需在状态第一次出现时记录 G。</li></ul>
  </details>

  <script type="text/x-python" data-role="starter">
import numpy as np

def mc_prediction(n_episodes=1000, gamma=1.0):
    # TODO: 采样若干回合，做首次访问蒙特卡洛更新
    return np.zeros(7)
</script>

  <script type="text/x-python" data-role="tests">
V = mc_prediction(n_episodes=5000)
check(V.shape == (7,), "V 必须是长度 7 的数组")
check(abs(V[1] - 1/6) < 0.05, f"V[1] 应接近 1/6，实际 {V[1]:.3f}")
</script>

  <script type="text/x-python" data-role="solution">
import numpy as np

def mc_prediction(n_episodes=1000, gamma=1.0):
    V = np.zeros(7)
    for _ in range(n_episodes):
        states, reward, s = [], 0.0, 3
        while True:
            s += 1 if np.random.rand() < 0.5 else -1
            states.append(s)
            if s in (0, 6):
                reward = 0.0 if s == 0 else 1.0
                break
        G = reward
        for st in reversed(states):
            if st in (0, 6):
                continue
            V[st] += (G - V[st])
            G *= gamma
    return V
</script>
</div>
```

规则：

- `data-code` 形如 `NNNN-code-K`（K 从 1 开始）。
- 三个 script 块**必须都有**：`starter` / `tests` / `solution`，且 `data-role` 一字不差。
- Python 代码里**不能出现** `</script>` 字样（会提前结束脚本块）。
- 只能用**标准库 + numpy**。**禁**：`input()`、`sys.exit()`、文件读写、网络、
  `matplotlib`、`pandas`、`torch`、`gym`、`scipy`。
  浏览器里是 Python 3.12 + numpy 1.26，所以**不要用 numpy 2.x 专有 API**
  （如 `np.float_`、`np.trapz` 的改名形式），用 `np.float64`、`np.trapezoid` 的稳妥替代或直接避开。
- 运行环境已预置 `numpy as np`，但 starter 里**仍要显式写** `import numpy as np`（便于用户复制出去）。
- 测试里可用预置的 **`check(条件, 消息)`** 断言函数。也可直接用 `assert`。
  测试失败要给出**可行动的信息**（期望什么、实际什么）。
- `tests` 块**不能**重新定义用户要实现的函数；它只调用并断言。
- **`starter` 必须让 `tests` 失败**（否则这题没意义）；**`solution` 必须让 `tests` 通过**。
  这一点会被自动校验，务必自己先验证。
- 随机性：`solution` 与 `tests` 要**固定随机种子或留足容差**，保证反复运行都稳定通过。
- 难度：一题"照公式实现"，一题"要动脑/做对比分析"。
- 提示写 1–3 条，不要直接给答案。

## 7. 数学与排版

**不引入任何外部依赖**（无 MathJax / KaTeX / CDN / 外部字体 / 外部图片）。公式用 HTML 写：

- 行内：`<span class="math">V<sup>π</sup>(s)</span>`
- 独立成行：`<div class="eq"><span class="eq-body">…</span><span class="eq-num">(3.2)</span></div>`
- 变量用 `<var>`（自动斜体）：`<var>γ</var>`、`<var>α</var>`、`<var>ε</var>`
- 常用符号直接打 Unicode：γ α ε π ∇ Σ 𝔼 ← ≈ ∈ ≥ ⌊ ⌋ max arg max
- 表格用 `<table>`；要点用 `<ul>`；术语首次出现用
  `<span class="term">折扣因子（discount factor）</span>`。

## 8. 可用的交互组件（只能用这些，写错名字会静默降级）

```html
<figure class="sim" data-sim="bandit"      data-arms="10" data-steps="1000" data-runs="200"></figure>
<figure class="sim" data-sim="gridworld"   data-rows="4"  data-cols="4" data-gamma="0.9" data-mode="policy"></figure>
<figure class="sim" data-sim="random-walk" data-states="5" data-runs="100"></figure>
```

| `data-sim` | 作用 | 可用属性 |
|---|---|---|
| `bandit` | 对比 ε-greedy / 乐观初始值 / UCB 的平均收益曲线 | `arms`(默认10) `steps`(1000) `runs`(200) |
| `gridworld` | 网格世界：价值迭代结果 + 策略箭头；`data-mode="q-learning"` 显示 Q-learning 学到的策略 | `rows` `cols` `gamma` `mode`(`policy`\|`q-learning`) |
| `random-walk` | Sutton &amp; Barto 例 6.2 风格的随机游走，对比 MC 与 TD 的价值估计 | `states`(默认5) `runs`(100) |

每个 sim 自己会渲染标题、控件、图注与一段"你该看到什么"的说明。
**不要**在教学正文里手写 `<canvas>` 或 JS —— 需要新组件就说明你想加什么，交给主控。

## 9. 语气与风格

- 面向一个聪明的成年人，**平等、直接、不吹**。不用"众所周知""简单来说"这类填充词。
- 多用**具体数字例子**（"假设 γ=0.9，那么 10 步之后的奖励只剩 0.35 的权重"）。
- 主动暴露**常见误解**（"很多人以为 Q-learning 学的是当前策略的价值，其实……"）。
- 排版从简：层级不超过 `<h2>`/`<h3>`；一段不超过 5 行；多留白。
- 不要写"本课小结"这种凑数段落；用 `objectives` + 练习完成闭环即可。

## 10. 交付前自检清单

- [ ] 文件名与 `manifest.json` 中的编号/slug 一致
- [ ] `data-number` / `data-slug` / `data-part` 与文件名、manifest 一致
- [ ] 5 道选择题，每题 4 项，`data-answer` 在 0–3 且位置打散，选项长度相近
- [ ] 每题都有 `mcq-explain`
- [ ] 2 道代码题，各有 `starter` / `tests` / `solution`
- [ ] 已确认 `starter` 让 tests 失败、`solution` 让 tests 通过（**必须实际跑过**）
- [ ] 代码只用标准库 + numpy
- [ ] 正文引用了 ≥1 个 `RESOURCES.md` 的 `[✓可达]` 来源
- [ ] 有 `primary-source` 与"问你的 AI 老师"提醒
- [ ] 没有外部网络依赖（无 CDN、无外链图片/字体）
- [ ] 正文长度在 1200–2000 字之间（**零基础版按 §15 放宽到 2000–4600**）

---

# 11. 文风：去掉「AI 味」（所有正文改写必须遵守）

课程第一版由多路并行撰写，中文带上了一致的机器腔。下面这套规则用于改写，
**改完必须用 `python3 tools/scan-style.py <文件>` 复测**，并让 `check-lesson.py` 保持 0 错误 0 警告。

## 11.1 要打掉的六种腔调

| 病症 | 具体表现 | 处理 |
|---|---|---|
| **破折号成瘾** | 满篇 `——` 做补充说明。全课程原有 245 处（每千字 2.82），是最重的 AI 指纹 | **每课 ≤ 2 处**。改成句号断开、逗号、括号或直陈；只有真正的转折/停顿才留 |
| **加粗通胀** | 439 个 `<strong>`（每千字 5.05），几乎每段都有 | **每千字 ≤ 3 个**。只留给真正的术语首次定义和关键结论，一个自然段最多 1 个 |
| **强调通胀** | `正是`(58) `恰恰`(23) `其实`(7) `真正的`(7) | `正是` 全课程 ≤ 15、`恰恰` ≤ 5、`其实` ≤ 3。删掉这些词，句子照样成立就直接删 |
| **对立句式** | `不是X，而是Y` `并非X而是Y` `不在于X而在于Y`（18 处） | 全课程 ≤ 6。改成正面直述：先说 X 错在哪，再说 Y |
| **模板腔** | 27 课开头全用「学完这一课，你能…」；`这一课` 自指 38 处；`你该看到什么`；`常见误解` | 开场白**每课说法不同**（但必须保留"学完能做到什么"这个功能）；自指换成具体名词（"本课""这一节"混用，或直接说内容） |
| **营销腔** | `白费` `致命` `最贵` `最要命` `灾难`（24 处）；`深度/彻底/全面/系统` 形容词通胀（38 处） | 夸张词全课程 ≤ 5。用具体代价代替形容词："白费三个月"→"三个月做完才发现建模错了" |

## 11.2 改写手法（按优先级）

1. **优先删，而不是换词**。`值得注意的是，X` → `X`。`简单来说，X` → `X`。
2. **长句拆短**。AI 腔爱用"由于……因此……而且……"的长链，拆成两三个短句，主语提前。
3. **把抽象判断换成具体动作或数字**。"收敛较慢" → "γ=0.99 时误差每轮只缩 1%，要 200 轮才能降到小数点后 9 位"。
4. **少用"我们"和"你"做主语填充**。能省略就省略。
5. **同一段里不要连续三段都是"总—分"结构**，节奏要有长短变化。
6. **保留术语的英文原文与 `<span class="term">` 标注**，这是课程要求，不是 AI 味。

## 11.3 改写实例（照这个手感来）

**例 1 —— 去破折号 + 去对立句式**
- 原：`真实项目里的失败，多数不是选错了算法，而是 MDP 写错了：状态漏掉关键信息、奖励和你真正想要的东西不一致 —— 算法可以换，建模错了换什么都没用。`
- 改：`项目失败，多数时候问题出在 MDP 本身：状态漏了关键信息，奖励和想要的东西对不上，决策周期设成业务根本执行不了的粒度。算法可以换；建模错了，换什么都没用。`

**例 2 —— 去段末升华**
- 原：`这类问题的共同结构是：你的决策会改变你接下来看到的数据，而你只能拿到一个评价性的反馈信号，拿不到标准答案。这正是强化学习要解决的事。`
- 改：`这类问题有同一个结构：你的决策会改变你接下来看到的数据，而你只能拿到评价性的反馈信号，没有标准答案。强化学习处理的就是这种结构。`

**例 3 —— 去强调通胀**
- 原：`注意这里的 r 通常只是即时的。真正想最大化的东西是长期累积收益，而中间隔着一长串决策 —— 这就是下一节要说的第一个难点。`
- 改：`注意 r 通常只是即时奖励。要最大化的其实是长期累积收益，中间隔着一长串决策，麻烦就出在这里。`

**例 4 —— 去营销腔**
- 原：`奖励写错，RL 只会高效地学坏。``真实项目里失败最多的不是算法选错，而是奖励设计和不能安全试错。`
- 改：`奖励写错，算法会非常高效地学会错误行为。``实际项目翻车，原因多在奖励设计和无法安全试错，而不在算法选型。`

**例 5 —— 开场白去模板**
- 原（27 课统一）：`学完这一课，你能判断一个业务问题到底该不该用强化学习，并说清它与监督学习最本质的三点区别 —— 这决定了你后面会不会在错误的问题上浪费三个月。`
- 改：`这一节只解决一个问题：什么情况下不该用强化学习。判断标准有三条，都来自 RL 与监督学习的结构差异。`

**例 6 —— 去"首先/其次"与"让我们"**
- 原：`让我们先看看线性逼近。首先我们把特征构造出来，其次……`
- 改：`先看线性逼近。特征构造如下。`

## 11.4 红线（改文风时绝对不许动）

- **`data-answer` 的值、选项顺序、选项个数** —— 改了会导致答案错位。
- **`<script type="text/x-python">` 里的 starter / tests / solution** —— 一个字符都不能动。
- **公式内容与编号**：`<div class="eq">` 里的符号、`(5.1)` 这类编号不能改（改措辞可以，改数学不行）。
- **HTML 标签、class、data-* 属性、文件与 manifest 的一致性**。
- **事实**：章节号、论文编号、URL、阈值、数字。可以改说法，不能改事实。
- **`<span class="term">` 标注、`.cite` 链接、primary-source 段落、"问你的 AI 老师"提醒** —— 这些是课程要求，必须保留
  （其中"问你的 AI 老师"那句话可以换措辞，但必须还在）。

## 11.5 验收标准（对每个文件）

```bash
python3 tools/check-lesson.py <文件>     # 必须仍是 0 错误 0 警告
python3 tools/scan-style.py  <文件>      # 看「每千字」列是否降到 3.0 以下
```

- `scan-style.py` 的**每千字命中 ≤ 3.0**（全课程原为 6.04）
- **破折号每千字 ≤ 1.0**（原为 2.82）
- **加粗每千字 ≤ 3.0**（原为 5.05）
- 全课程 `正是` ≤ 15 处、`恰恰` ≤ 5 处、`其实` ≤ 3 处、对立句式 ≤ 6 处、营销腔夸张词 ≤ 5 处
- **正文字数不应大幅缩水**：改写后每课可见字数变化控制在 −15% 以内（删套话会缩短，但别把内容删没了）

---

# 12. 缩写与符号：首次出现必须给出解释

学习者会直接从侧栏跳到任意一课，所以**每课都要自成一体**：本课用到的每个缩写和数学符号，
都要在**本课内**第一次出现的地方给出简短解释，不能指望读者记得前面某课讲过。

## 12.1 缩写

在本课第一次出现时，二选一：

- **`缩写（英文全称，中文全称）`**
  `GAE（generalized advantage estimation，广义优势估计）`
  `DQN（deep Q-network，深度 Q 网络）`
  `PER（prioritized experience replay，优先经验回放）`
- **`中文全称（缩写）`** —— 当中文全称在本句里已经出现时用这个，更自然
  `强化学习（RL）`、`时序差分（TD）`

**只在首次出现处解释**，同一课后面再出现就写裸缩写。

## 12.2 数学符号

在本课**正文**第一次出现时给出简短释义，格式 `符号（含义）`：

- `γ（折扣因子）`、`α（学习率）`、`ε（探索率）`
- `ρ_t（重要性采样比）`、`δ_t（TD 误差）`、`τ（软更新系数）`

**公式块 `<div class="eq">` 内的一个字都不能改。** 如果一个符号只出现在公式里，
就在公式**后面**补一句「式中」说明：

```html
<div class="eq"><span class="eq-body">V(s) ← V(s) + α [ r + γV(s′) − V(s) ]</span><span class="eq-num">(8.1)</span></div>
<p>式中 α 是学习率，γ 是折扣因子，r 是即时奖励。</p>
```

注意用「，」连接，**不要用破折号**（那会破坏 §11 的文风规范）。

## 12.3 边界与禁忌

- 页脚「问你的 AI 老师」是固定提醒，其中的 **AI 不要解释**。
- 解释要**短**：缩写解释 ≤ 20 字，符号解释 ≤ 8 字。写成句子就会变成新的填充感。
- 不要加「也就是说」「换句话说」「简单来说」这类过渡。
- 不要每处都链术语表；一课链一次就够，多了是噪音。
- 不要为了塞解释而重排段落，也不要动 `data-answer`、选项、脚本块、公式内容。

## 12.4 验收（每课都要过）

```bash
python3 tools/audit-terms.py   lessons/00XX-xxx.html   # 必须「待补 0」
python3 tools/check-lesson.py  lessons/00XX-xxx.html   # 必须 0 错误 0 警告
python3 tools/scan-style.py    lessons/00XX-xxx.html   # 每千字 ≤3.0、破折号/千 ≤1.0
```

`audit-terms.py` 的判定口径：以**正文**的首次出现为准（公式块内不算），
已被 `<span class="term">` 定义过的术语视为已解释。

---

# 13. 代码题题干：必须让人看完就能动手

反馈原话：「有些代码题的题目描述很不清晰，我都不知道要干什么。」
所以题干的验收标准是：**一个刚读完本课正文的人，只看题干就能写出函数**，不需要猜。

## 13.1 每道题的题干必须回答这六件事

1. **要实现哪个（哪些）函数** —— 函数名**照抄 starter 里的拼写**，不要用「实现一个……的方法」这种模糊说法。
   starter 里有两个函数就写两个，不能只提一个。
2. **签名** —— 参数顺序与默认值。可以直接写 `f(a, b, c=0.1)`，让读者不必回看代码框。
3. **每个参数是什么** —— 含义 + 类型/形状。例：
   `phi` 形状 `(T+1, d)` 的特征矩阵；`rewards` 长度 `T` 的奖励数组；`gamma` 折扣因子。
4. **返回什么** —— 类型、形状、含义。例：返回「更新后的参数 `w`，形状 `(d,)`」；
   或「长度为 7 的 `np.ndarray`，下标 `1..5` 是各状态的价值」。
5. **会被检验的关键行为** —— 从 `tests` 反推，用行为语言写出来，但**不要写出解法**。例：
   「测试会检查终止状态那一项不含自举」「会检查未被选中的动作梯度为 0」。
   读一遍 `tests` 再写这一条，保证题干与测试**不矛盾**（数量、形状、边界都要对得上）。
6. **必要的约定** —— 原地改还是返回新对象、随机数从哪来（如「用传入的 `rng`，不要用全局 `np.random`」）、
   是否允许额外依赖（只许标准库 + numpy）。

## 13.2 长度与写法

- **150–600 字（目标约 300）**。短于 150 字基本说不清楚；超过 700 字说明你在写正文，该挪回正文。
  实测全课程中位数 303 字、最长 565 字：**需要逐个方法/逐个参数说明的题（如回放缓冲区有 4 个方法）
  写到 500 多字是正常的**，不要为了凑"400 字以内"而砍掉必要的签名与形状说明——
  那会把题重新变得说不清。判定标准是"读完能否动手"，不是字数。
- 允许用 `<ul>` 列参数，用 `<div class="eq">` 放必要的公式，用 `<code>` 标标识符。
- **不许剧透解法**：题干说明"要满足什么"，不说明"怎么一步步算"。
  正文已经讲过的推导可以引用（「按式 (12.1)」），但不要把答案写出来。
- 遵守 §11 文风规范：不用破折号、`正是`、`值得注意的是`。

## 13.3 `h3` 标题

标题写成「代码题 N · <动词短语>」，让人一眼知道这题干什么，例如
「代码题 2 · 用粗编码特征观察外推失效」，不要只写「代码题 2 · 粗编码」。

## 13.4 红线

- **`<script type="text/x-python">` 里的 starter / tests / solution 一个字符都不许动。**
  你只改题干与标题。题干是给人读的，测试是判分依据，两者不能互相迁就。
- `data-code`、`data-answer`、选项、公式块内容、HTML 结构不动。
- 改完必须仍然：`check-lesson.py` 0 错 0 警、`scan-style.py` 每千字 ≤3.0、`audit-terms.py` 该文件无待补。

## 13.5 验收

```bash
python3 tools/audit-prompts.py lessons/00XX-xxx.html   # 该文件应无「未提函数名 / 未提参数 / 无返回说明 / 无类型形状 / 题干过短」
python3 tools/check-lesson.py  lessons/00XX-xxx.html   # 0 错误 0 警告
python3 tools/scan-style.py    lessons/00XX-xxx.html   # 每千字 ≤3.0
python3 tools/audit-terms.py   lessons/00XX-xxx.html   # 待补 0
```

---

# 14. 代码题题干的统一结构（背景 / 输入 / 输出）

反馈原话：「每一个代码题请先给我一个背景，让我知道我写这个代码是干什么用的，
然后分别介绍输入、输出代表了什么。」

所以从今往后，**每道代码题都用同一套四段结构**，读者不必在散文里找信息。

## 14.1 模板（照抄这个结构）

```html
<div class="code-prompt">
  <p><span class="cp-label">背景</span>这一课在解决什么问题，你写的这段代码在算法里处在哪一步、
    会被谁调用，输入与输出在现实场景或算法里对应什么。2–3 句，不要复述正文推导。</p>
  <p>请实现 <code>f(a, b, c=0.1)</code>。<span class="cp-label">签名与 starter 保持一致。</span></p>

  <p class="cp-sub">输入</p>
  <ul>
    <li><code>a</code>：形状 <code>(B,)</code> 的 float 数组，表示 ……</li>
    <li><code>b</code>：0 到 1 之间的 float，表示 ……</li>
  </ul>

  <p class="cp-sub">输出</p>
  <ul>
    <li>返回 <code>np.ndarray</code>，形状 <code>(B,)</code>：第 <code>i</code> 个元素是 ……</li>
  </ul>

  <p class="cp-note"><span class="cp-label">会被检验</span>……（从 tests 反推的行为，不写解法）</p>
</div>
```

## 14.2 四段各自必须回答什么

| 段 | 必须回答 | 不许写什么 |
|---|---|---|
| **背景** | ① 这段代码在算法/业务里是干什么的 ② 它在整条流程的哪一步、被谁调用 ③ 输入输出对应现实或算法里的什么 | 不要复述正文的推导过程，不要写"本节将……" |
| **输入** | 逐个参数：**名字、类型/形状、代表什么**。starter 里有几个参数就写几条 | 不要漏参数，不要把两个参数挤进一条 |
| **输出** | 返回**什么类型**、**什么形状**、**每个位置代表什么**；多函数题按函数分开写 | 不要只写"返回更新后的数组"而不说形状 |
| **会被检验** | 从 `tests` 反推的关键行为（数值、边界、退化情形） | **不许写出解法步骤** |

**多函数题**：背景里一次列全所有函数；输入/输出两节里用「`f1` 的输入」「`f2` 返回」这样以函数名开头，避免混淆。

## 14.3 长度与格式

- **300–1300 字**（目标约 550）。四段结构天然比散文长，这是允许的。
  实测需要逐个方法/逐个函数说明的题（如两三个函数、每个都有形状与检验点）会到 1200 字左右，
  这是**规格**而非正文，不要为了压字数删掉签名、形状或检验点。超过 1300 字才需要压缩措辞。
- 用 `<span class="cp-label">背景</span>` / `<span class="cp-label">会被检验</span>` 和
  `<p class="cp-sub">输入</p>` / `<p class="cp-sub">输出</p>` —— **不要用 `<strong>`**
  （会撑爆 §11 的加粗预算，也会让 54 道题看起来像模板填空）。
- 公式可以放，但放在对应段里；`<div class="eq">` 内的数学一个字都不许改。
- 仍然遵守 §11 文风规范：不用破折号、`正是`、`值得注意的是`。

## 14.4 验收

```bash
python3 tools/audit-prompts.py lessons/00XX-xxx.html   # 不应出现「缺背景 / 缺输入节 / 缺输出节」等
python3 tools/check-lesson.py  lessons/00XX-xxx.html   # 0 错误 0 警告
python3 tools/scan-style.py    lessons/00XX-xxx.html   # 每千字 ≤3.0（加粗不得因新结构上升）
python3 tools/audit-terms.py   lessons/00XX-xxx.html   # 待补 0
```

---

# 15. 零基础改写规范（27 课正文）

读者画像：**会一点 Python，没用过 numpy，没学过概率**，完全不懂强化学习。
反馈原话：「专有名词太多而且还没有解释，我根本看不懂在讲什么。」

## 15.1 每课要"慢"下来

- **开头先说人话**：用一个生活场景说清"这一课解决什么问题"，且**开头 100 字内不出现未解释的术语**。
- **一节只推进一步**。原文常有"一段里塞三个新概念"，要拆成三段。
- **句子拆短**。少用"因而""从而""鉴于"这类书面连接词；一句话超过 40 字就断开。
- **结论前置**：先说"要干什么/会得到什么"，再说为什么。

## 15.2 概念术语：首次出现必须给白话

照抄 `docs/plain-terms.md` 的统一解释（27 课说法必须一致）。**只给英文全称不算解释**：

- 不合格：`折扣因子（discount factor）` ← 零基础的人看英文等于没解释
- 合格：`折扣因子（越往后的奖励，算进总分时权重越小，相当于给它打了个折）`

若某个概念本课不展开，**必须显式推迟**：
`贝尔曼方程（后面 0004 课会讲，现在只要知道它是把"下一步的价值"倒推回"这一步"的等式）`。

## 15.3 数学记号：第一次出现要"读"出来

| 记号 | 必须写成 |
|---|---|
| `Σ` | `Σ（求和号，把后面那串东西全加起来）` |
| `argmax` | `argmax（挑出让后面那个式子最大的选择）` |
| `𝔼` / `E[...]` | `𝔼（期望，同一件事重复很多次之后的平均结果）` |
| `γ^k` | `γ 的 k 次方（连乘 k 次）` |
| 下标 `x_t` | `x` 右下角的 `t` 表示"第 t 步的 x"` |
| `←` | 写成"更新为"或"赋值成" |

## 15.4 概率与 numpy：零基础的两个缺口，必须补

**概率直觉**（读者没学过）：
- 概率 = "平均一百次里大约发生几次"
- 期望 = "长期重复之后的平均值"，用抛硬币、掷骰子举例
- 随机数 = "计算机生成的假随机数"，**同一个种子必然给同一串数**（这是测试能复现的原因）

**numpy 基础**（读者没用过）：
- 数组 = "一排数字的容器"，`np.array([1.0, 5.0, 2.0])` 就是装了三个数
- 形状 = "这个容器几行几列"，`(4,)` 表示 4 个数的一维数组
- 下标从 **0** 开始
- 广播 = "形状不同的两个数组也能逐项运算，numpy 会自动把小的那个铺开"
- 第一次用到 `np.argmax` / `np.zeros` / `rng.random()` 时，**一句话说明它返回什么**

## 15.5 代码题：题干与提示要"点名每一步"

保留代码题，但：
- 题干按 §14 四段结构；**「背景」段要说清这段代码在算法里干什么**。
- `<details class="hints">` 的提示**不许只给方向**，要点名到"用哪个函数、先算什么、循环怎么写"。
  例：不合格「用一个累乘变量」；合格「先设 `g = 1.0`，第 k 次循环时把 `g * rewards[k]` 累加进总和，然后 `g = g * gamma`」。
- 若用到读者没见过的 numpy/概率概念，在提示里补一句基础说明。

## 15.6 红线（一律不变）

- `<script type="text/x-python">` 的 starter / tests / solution **一个字符都不许动**。
- `data-answer`、选项个数与顺序、`<div class="eq">` 内的数学与编号、题数、`data-*` 一律不动。
- 每课仍是 5 道选择题 + 2 道代码题；manifest 的 `data-number`/`data-slug`/`data-part` 不变。
- 改写后必须过：`check-lesson` 0 错 0 警、`check-html` OK、`scan-style` 每千字 ≤3.0、
  `audit-terms` 待补 0、`audit-prompts` 无缺陷、`check-invariants` 不变、**`audit-jargon` 本课无待补**。

## 15.7 验收命令

```bash
python3 tools/audit-jargon.py lessons/00XX-xxx.html   # 本轮新增：概念术语白话
python3 tools/check-lesson.py lessons/00XX-xxx.html
python3 tools/check-html.py   lessons/00XX-xxx.html
python3 tools/scan-style.py   lessons/00XX-xxx.html
python3 tools/audit-terms.py  lessons/00XX-xxx.html
python3 tools/audit-prompts.py lessons/00XX-xxx.html
python3 tools/check-invariants.py
```

---

## §16 数学课规范（主线：对齐《Mathematical Foundations of Reinforcement Learning》）

主线与进阶篇是**两种不同的课**，规范不同。主线课程页必须在 `<article>` 上标
`data-kind="math"`，闸门据此走数学分支。

### 16.1 与进阶篇的差别

| | 进阶篇（白话应用向） | 主线（数学原理） |
|---|---|---|
| 标记 | 无 `data-kind` | `data-kind="math"` |
| 代码题 | 2 道，真实判题 | **无** |
| 选择题 | 5 道 | **恰好 10 道** |
| 数学渲染 | HTML + Unicode | **KaTeX**（`$…$` / `$$…$$`） |
| 文风 | 生活比喻优先 | **定义—定理—证明—例子**优先 |
| 首要检查 | 术语白话 | 公式配平 + 结构元素 |

### 16.2 必备结构

```html
<article class="lesson" data-number="0001" data-slug="probability-basics"
         data-part="数学预备篇" data-kind="math">
  <header class="lesson-head">
    <p class="eyebrow">数学预备 1</p>
    <h1>概率论基础：随机变量、分布、期望、方差</h1>
    <p class="lede">一到两句话说明这一课解决什么问题。</p>
    <div class="objectives"><h2>学完这一课你会</h2><ul>…</ul></div>
  </header>
  <section>…</section>
  <section class="exercises">
    <h2>课后练习</h2>
    <div class="mcq" data-answer="N">…</div>   ← 恰好 10 个
  </section>
</article>
<script src="assets/math.js"></script>
```

**页脚**在 `</body>` 前引入：
```html
<link rel="stylesheet" href="assets/katex/katex.min.css">
<script src="assets/katex/katex.min.js"></script>
<script src="assets/katex/contrib/auto-render.min.js"></script>
<script src="assets/math.js"></script>
```

### 16.3 四种内容框

数学内容用这四个 class 承载，视觉上互相区分（定义蓝、定理黑、证明灰、例子浅）：

| class | 用途 | 写法 |
|---|---|---|
| `def` | 定义 | `<div class="def"><span class="label">定义 1.1（随机变量）</span><p>…</p></div>` |
| `thm` | 定理/命题/引理 | `<div class="thm"><span class="label">定理 1.1</span><p>…</p></div>` |
| `proof` | 证明 | `<div class="proof"><span class="label">证明</span><p>…</p><span class="qed">∎</span></div>` |
| `eg` | 例子 | `<div class="eg"><span class="label">例 1.1</span><p>…</p></div>` |

还有 `rem`（注记），用于「为什么这样定义」「与后面哪一课呼应」。

**证明必须完整**：主线要求真的讲证明，不能写「证明略」或「可以证明」。
若某步较长，先给思路（`<p>思路：…</p>`），再给推导。

### 16.4 公式写法

- 行内：`$V_\pi(s)$`；独立成行：`$$v_\pi=(I-\gamma P_\pi)^{-1}r_\pi$$`
- 多行对齐用 `aligned`：
  ```
  $$\begin{aligned} v_{k+1}(s) &= \max_{a}\big[r(s,a)+\gamma\sum_{s'}p(s'|s,a)v_k(s')\big]\\ &= (Tv_k)(s)\end{aligned}$$
  ```
- **不要**用 `<var>`、`<sub>` 手写公式——那是进阶篇的做法。
- 可用宏（已在 `assets/math.js` 定义）：`\E`（期望）、`\R`、
  `\var`（方差）、`\argmax`、`\argmin`、`\d`（微分 d）。
- 定界符必须成对，闸门会数 `$` 与 `$$` 的奇偶。

### 16.5 符号约定（全课程统一，与原著一致）

| 符号 | 含义 |
|---|---|
| $s, a, r$ | 状态、动作、奖励 |
| $S_t, A_t, R_t$ | 第 $t$ 步的状态、动作、奖励（随机变量，大写） |
| $\pi(a\|s)$ | 策略：在状态 $s$ 下选动作 $a$ 的概率 |
| $p(s'\|s,a)$ | 状态转移概率 |
| $r(s,a)$ | 奖励的期望 $\E[R_{t+1}\mid S_t{=}s,A_t{=}a]$ |
| $\gamma$ | 折扣因子 |
| $v_\pi(s), q_\pi(s,a)$ | 策略 $\pi$ 下的状态值、动作值 |
| $v^*(s), q^*(s,a)$ | 最优状态值、最优动作值 |
| $P_\pi, r_\pi$ | 策略 $\pi$ 下的状态转移矩阵、奖励向量 |
| $T$ | 贝尔曼算子（$Tv$、$T_\pi v$） |
| $\|\cdot\|_\infty$ | 无穷范数（最大分量绝对值） |

**首次出现必须解释**（沿用 §12 与第 7 关的口径）。

### 16.6 10 道选择题的覆盖要求

每课 10 道，按下述配比（允许上下浮动 1 道）：

| 类型 | 数量 | 例子 |
|---|---|---|
| 定义辨析 | 2 | 「下面哪个是随机变量，哪个是它的取值」 |
| 推导中间步骤 | 3 | 「从 (2.3) 到 (2.4) 用了哪条性质」 |
| 反例/边界判断 | 2 | 「若 $\gamma=1$ 且状态数无限，结论还成立吗」 |
| 结论应用 | 2 | 给一个具体小例子算结果 |
| 为什么这样设计 | 1 | 「为什么贝尔曼方程要写成期望形式」 |

- 选项固定 4 个，`data-answer` 指向正确项（0 基），**正确答案位置要分散**。
- 每题必须有 `.mcq-explain`，解析要说清**错项为什么错**，不只是重复正确项。
- 选项长度要接近，避免正确答案靠长度露馅（闸门会警告）。

### 16.7 文风仍受约束

主线是数学课，但**语言仍要说人话**：术语首次出现给白话（§12），
不用 `——`（≤1.0/千字），不用 `<strong>`，不写「值得注意的是」「也就是说」这类套话。
数学课更容易写成翻译腔，务必自查。

### 16.8 插图规范

数学课要为抽象概念配**能一眼看懂**的图。用**内联 SVG**，不用位图、不用外部库。

```html
<figure class="fig">
  <svg viewBox="0 0 520 200" role="img" aria-label="一句话说明这张图画了什么">
    <line x1="70" y1="150" x2="470" y2="150" class="axis-b"/>
    <rect x="100" y="100" width="42" height="50" class="bar"/>
    <text x="112" y="166" class="lbl">1</text>
  </svg>
  <figcaption class="fig-cap"><span class="fig-num">图 1.4</span>
    正文里解释这张图在说什么，一到三句。</figcaption>
</figure>
```

**SVG 内部只能用 Unicode 数学符号，绝不能用 `$...$`。**
KaTeX 的 auto-render 无法把 HTML 标签塞进 SVG 的 `<text>` 节点，
写 `$\Omega$` 的结果是公式被吃掉或留成半截文字，而且**页面上不会报任何错**。
闸门已经堵住这条（`check-lesson` 第 1 关会报「第 N 张插图里出现了 $」）。

常用 Unicode 备查：Ω μ ε σ γ Σ ∫ ± ≤ ≥ ≠ ≈ ∈ ⊆ → × · √ ∞

**可用的语义 class**（配色随主题自动切换，不要在 SVG 里写死颜色）：

| class | 用途 |
|---|---|
| `axis` / `axis-b` | 坐标轴（细 / 粗） |
| `grid` | 网格线 |
| `lbl` | 图内小字（灰） |
| `val` / `val-b` | 数值标注（深 / 加粗） |
| `bar` / `bar-hi` | 柱子（半透明 / 实心） |
| `area` | 曲线下阴影 |
| `curve` / `curve2` | 实线 / 虚线曲线 |
| `mark` | 虚线标记（如均值位置） |
| `dot` / `dot-a` | 实心点 |
| `box` / `box-a` | 空心框 / 强调框 |
| `arrow` / `arrow-a` | 箭头（灰 / 蓝） |

**要求**：
- 必须有 `viewBox`（否则不能自适应缩放）、`role="img"` 与 `aria-label`。
- 必须有 `<figcaption>`，编号格式 `图 <课号>.<序号>`，按出现顺序递增。
- 图要**自解释**：单看图不看正文也能懂大意；不要放纯装饰性的图形。
- 每课建议 **4–7 张**：概念图（定义处）、对比图（两个易混概念）、过程图
  （算法怎么一步步走）、反例图（边界情况会怎样）。
