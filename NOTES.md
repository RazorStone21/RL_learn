# Notes

## 学习者偏好（已确认）
- 目标：**应用向**：把 RL 用到自己的工作上，不做研究也不应付考试
- 代码题语言：**Python + numpy**，浏览器内 Pyodide 执行
- 规模：**22 课以上**，主流算法逐一细分
- 语言：中文讲解，术语保留英文原文

## 教学偏好（来自 `teach` skill）
- 每课要有一个"具体的胜利"，且在最近发展区内
- 知识用于**习得**，难度是敌人；技能用于**保持**，难度是工具
- 习题靠**检索练习**，不是重读；答案字数要一致、正确项位置要打散
- 每课都要推荐一个**一手权威来源**
- 复用优先：新组件写进 `assets/`，不要每课内联重复

## 环境坑（本机实测）
- 工作区 `/Volumes/RAZOR` 是 **exFAT**：
  - **不支持硬链接** → 原子写工具（临时文件 + link）会报 `ENOTSUP`，写文件需用重定向
  - 会为每个文件生成 AppleDouble 旁车 `._*`；这曾让 skills CLI 误判"技能带 supporting files"
  - 簇大小 128 KB，小文件极占空间
- 网络是**选择性封锁**（见 `RESOURCES.md` 顶部的可达性标注）
- `skills.sh` 被本地 DNS 判为 `NXDOMAIN`，但公共 DNS 正常；用
  `curl --resolve skills.sh:443:64.239.109.193` 可绕过，`npx skills find/use` 则不行

## 待办
- [ ] 确认具体业务领域，替换 `MISSION.md` 中的"待确认"段

---

## 工具链（本项目自带，改完课一定要跑）

```bash
./tools/validate-all.sh        # 三道关卡一次跑完
```

1. `tools/check-lesson.py`：结构 / 题目完整性 / **真的执行判题**
   （断言：starter 必须失败、solution 必须连续 3 次通过）
2. `tools/check-html.py`：标签平衡（会跳过 exFAT 的 `._*` 二进制旁车文件）
3. `tools/smoke-pyodide.mjs`：用**真实的 Pyodide 运行时（Python 3.12 + numpy 1.26）**跑所有代码题，
   与浏览器里是同一个运行时。判题 harness 直接从 `assets/runner.js` 里抽取，保证测的就是线上那份。

## 真实的浏览器验证（重要）

静态检查与 Node 里的 Pyodide 测试都**测不到 DOM 行为**。用无头 Chrome 实测后抓到两个严重 bug：

1. **iframe 路径少了前缀**：`manifest.json` 里 `file` 是裸文件名（`0001-….html`），
   而 iframe 位于站点根目录，直接赋给 `src` 会被解析成 `/0001-….html` → 404。
   修法：`index.html` 里统一走 `resolveSrc()` 补 `lessons/` 前缀。
2. **进度对象未初始化就下标访问**：课程页首次上报题数后，`lessonDone()` 会去读 `p.mcq[...]`，
   但进度对象在**第一题被作答之前根本没有 `mcq`/`code` 子对象** → TypeError 中断整个目录渲染，
   表现是侧栏只剩一个分部标题。修法：加 `mcqDone()/codeDone()` 安全访问。
   这个 bug 在每次打开课程时都会触发，光看静态文件完全看不出来。

### 无头 Chrome 的正确用法（踩过的坑）

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --no-sandbox --disable-crash-reporter \
  --user-data-dir=/tmp/cr --virtual-time-budget=6000 --dump-dom URL
```

- **不要**给 `--screenshot` 配 `--virtual-time-budget`：会永久挂起（本机实测两次）。
  截图只用 `--screenshot`，并在外面套一个"若干秒后 kill -9"的守护循环。
- `--dump-dom` 配 `--virtual-time-budget` 正常，且能完整拿到 JS 执行后的 DOM，
  验证侧栏/TOC/交互组件装配的首选手段。
- `crashpad` / `CVDisplayLinkCreateWithCGDisplay` 的报错是噪音，可以忽略。
- 用 `--enable-logging=stderr` 抓 `Uncaught`/`TypeError`，比肉眼找问题快得多。
- **不需要放宽沙箱权限**：默认 workspace-write 下无头 Chrome 就能工作（早先的挂起是参数问题，不是权限问题）。

## 已知的小偏差

- `COURSE-SPEC.md` 建议正文 1200–2000 字，而 `check-lesson.py` 的告警窗口是 700–3600
  （因为 `visible_len` 会把表格文字也计入）。实际有 4 课落在 2000–2300 之间
  （0014 / 0016 / 0017 / 0026），属于"表格承载信息多"的课，是有意保留的，不是漏检。

## 采用与弃用的 skill（find-skills 检索结果）

本课程按 `mattpocock/skills@teach` 的教学法搭建（仓库 282,062★、778,952 次安装；
通过 `skills.sh` 检索并核验，支持文件含 MISSION / RESOURCES / LEARNING-RECORD / GLOSSARY 四个格式规范）。
它规定的 `MISSION.md` / `RESOURCES.md` / `reference/` / `learning-records/` / 可复用 `assets/` 都已落地。
唯一偏离：skill 规定"一课一个独立 HTML"，而用户要的是"一个学习程序"，
因此课程页仍是**可独立打开的完整 HTML**，只是额外被 `index.html` 以 iframe 承载成一个程序
（每个课程页都自带导航，单独打开也完全可用）。

检索中还命中 `omer-metin/skills-for-antigravity@reinforcement-learning`（162★、176 次安装），
但其 frontmatter 已损坏（`GRPOUse when ", " mentioned.`），`references/patterns.md` 只有
"Reward shaping is critical" 这类无公式无代码的空泛条目，**未采用**。
按 find-skills 的 Step 4「不得仅凭搜索结果推荐」，低信任来源不进课程。

## 去 AI 味改写（已完成一轮）

第一版课程由多路并行撰写，中文带上了统一的机器腔。已按 `COURSE-SPEC.md` 第 11 节做了一轮全量改写。

**结果**（`docs/style-baseline.txt` 为改前基线）：

| 指标 | 改前 | 改后 | 降幅 |
|---|---|---|---|
| AI 味命中 | 525 处（每千字 6.03） | 15 处（每千字 0.18） | −97% |
| 破折号 `——` | 244 处（每千字 2.81） | 11 处（每千字 0.13） | −96% |
| `<strong>` 加粗 | 439 处（每千字 5.05） | 93 处（每千字 1.09） | −79% |
| 汉字总数 | 86,915 | 85,459（−1.7%） | 内容基本保全 |

**改完两道闸门都通过**：`./tools/validate-all.sh`（27 课 0 错 0 警 · 31 页标签平衡 · 54/54 真实 Pyodide 判题）
与 `python3 tools/style-report.py --check`（exit 0）。

### 工具

- `tools/scan-style.py` —— 量化扫描 AI 味，输出「每千字」密度。**注意它有两个已知误报已排除**：
  `深度 RL` 的「深度」（术语）与 `系统性高估` 的「系统性」（统计学本义）不算形容词通胀；
  `致命三元组`（deadly triad 标准译名）不算夸张用词。
- `tools/style-report.py` —— 前后对比 + 硬指标验收，`--check` 未达标返回非零。
- `tools/final-style-pass.py` —— 机械清理（逐题重复的 `<strong>为什么：</strong>`）并报告受保护脚本块内的残留。

### 改文风时必须守住的红线（已在实测中验证）

`data-answer` 值、选项个数与顺序、`<script type="text/x-python">` 全块、`<div class="eq">` 的数学与编号、
所有 HTML 标签与 `data-*` 属性、`.term` / `.cite` / primary-source / 「问你的 AI 老师」提醒。
最有效的回归防线是 **Pyodide 端到端判题**：任何对 starter/tests/solution 的误伤都会让它当场失败。

### 一次值得记住的返工

改写过程中有 agent 为了满足扫描器的「营销腔」规则，把标准术语 **`致命三元组` 改成了 `三者叠加`**，
导致参考文档与正文（0008/0012/0013/0022 仍在用原术语）出现术语分裂。
**根因是扫描器误报，不是文案问题** —— 修扫描器并还原术语才是对的。
教训：自动指标一旦与领域术语冲突，先怀疑指标。
