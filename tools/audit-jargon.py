#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查「概念术语」在每课首次出现时有没有白话解释。

与 audit-terms.py 的分工：
  - audit-terms.py  管缩写（DQN）与希腊符号（γ）
  - 本脚本          管概念（自举、马尔可夫性、时序差分、资格迹…）
后者才是零基础读者真正的拦路虎。

判定：术语首次出现处，紧跟其后 45 字内要有
  ① 括注解释   术语（…）
  ② 定义句式   术语，意思是/指的是/就是/即/所谓…/通俗地说…
  ③ 术语本身就是白话（在 WHITELIST 里）
"""
import glob, io, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _textutil import protect_math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 需要被解释的概念术语（按课程进程逐步引入）
TERMS = [
    "马尔可夫性", "马尔可夫决策过程", "状态转移", "转移概率", "折扣因子", "折扣回报", "回报", "策略",
    "价值函数", "动作价值", "状态价值", "贝尔曼方程", "贝尔曼最优",
    "探索", "利用", "贪心", "自举", "时序差分", "蒙特卡洛", "轨迹", "回合", "智能体",
    "环境", "策略迭代", "价值迭代", "收敛", "泛化", "函数逼近", "梯度", "策略梯度",
    "优势", "优势函数", "基线", "资格迹", "熵", "熵正则", "经验回放", "目标网络",
    "分位数", "离线", "模仿学习", "偏好", "奖励模型", "期望", "方差", "偏差",
    "学习率", "超参", "剪裁", "信赖域", "状态空间", "动作空间", "随机策略",
    "确定性策略", "策略评估", "策略改进", "压缩映射", "不动点", "重要性采样",
    "多臂老虎机", "探索率", "温度", "温度系数", "交叉熵", "似然", "对数概率",
    "软更新", "延迟更新", "双 Q", "过估计", "最大化偏差", "轨迹回放",
    "监督学习", "信用分配", "数据分布", "样本效率", "稀疏奖励", "奖励塑形",
]
# 术语本身已是白话、或已在同句里自带解释的，不必再括注
# 「贪心」曾被加入白名单以消除一处误报，但那是错的：
# 0025 课其实已经给了白话「贪心（在当前估计里挑看起来最好的那个）」，
# 加白名单等于让这个词在全课程永远不被检查，是无谓地削弱闸门。已撤掉。
WHITELIST = {"环境", "探索", "利用", "梯度", "期望", "方差", "偏差", "温度", "回合", "轨迹"}

# 术语与括注之间允许夹一个收尾引号或书名号，例如「期望回报"（就是从…）」
GLOSS_PAREN = re.compile(r'^\s*["\u201d\u300b\u3009]*\s*[（(]([^）)]{2,80})[）)]')
GLOSS_DEF = re.compile(r'^\s*[，,、]?\s*(?:(?:意思)?是|指的是|是指|就是|即|所谓|通俗地说|通俗讲|也可以叫|又叫|也叫|说白了|等于|读作|记作)')
GLOSS_HEAD = re.compile(r'(称为|叫做|叫|记为|读作|所谓|即)\s*$')
# 术语在括注内部且括注在给它下定义，如「（ε 是探索率）」
GLOSS_INSIDE = re.compile(r'[（(][^）)]{0,20}(?:是|为|即|指)[^）)]{0,20}$')


def to_text(fragment):
    # 数学里的裸 <（如 <\infty）会被 <[^>]+> 当成标签开头，静默吞掉整段正文。
    # 实测全课程因此丢过 5000+ 字。先把 $...$ 里的 < 换成占位符，剥完标签再还原。
    fragment = protect_math(fragment)
    s = re.sub(r'<script\b[^>]*>.*?</script>', ' ', fragment, flags=re.S | re.I)
    # 插图里的 SVG 文本是图形标签，不是正文散文（解释写在 figcaption，那部分照常被扫）
    s = re.sub(r'<svg\b[^>]*>.*?</svg>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<style\b[^>]*>.*?</style>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<[^>]*>', '', s).replace('\x01', '<')
    s = re.sub(r'&[a-zA-Z#0-9]+;', ' ', s)
    return s


def _plain(content):
    """括注内容算不算「白话」：必须含中文。

    这是本脚本存在的理由 —— 只给英文全称（`折扣因子（discount factor）`）
    对零基础读者等于没解释，不能算合格。
    """
    return bool(re.search(r'[\u4e00-\u9fff]', content))


def has_plain_gloss(text, pos, term):
    tail = text[pos + len(term): pos + len(term) + 45]
    head = text[max(0, pos - 25): pos]
    m = GLOSS_PAREN.match(tail)
    if m and _plain(m.group(1)):
        return True
    # 「智能体（agent）：做决策的一方」——英文全称本身不算解释，
    # 但紧跟其后的中文说明算。所以跳过纯英文括注再看一次。
    if m and not _plain(m.group(1)):
        rest = tail[m.end():]
        if re.match(r'^\s*[：:，,]\s*\S', rest) or GLOSS_DEF.match(rest):
            return True
    if GLOSS_DEF.match(tail):
        return True
    if GLOSS_HEAD.search(head):
        return True
    if GLOSS_INSIDE.search(head):    # 术语被自己的括注解释，如「（ε 是探索率）」
        return True
    return False


def prose_only(html):
    """只保留「正文」，去掉两类「预告」性质的文字：

    ① <div class="objectives"> 学习目标预览块 —— 它只是把后面要教的词先列一遍，
       真正讲解释在后面正文里。
    ② <h1>…<h6> 标题 —— 标题是名字，定义在紧跟的段落里。
    否则「智能体」「信用分配」这类词会因为先出现在目标/标题里而被误判成没解释。
    """
    s = re.sub(r'<div class="objectives">.*?</div>', ' ', html, flags=re.S | re.I)
    s = re.sub(r'<h[1-6]\b[^>]*>.*?</h[1-6]>', ' ', s, flags=re.S | re.I)
    # <title> 与 .eyebrow 也是「名字」：课名里出现「确定性策略梯度」不代表讲解过，
    # 而且课名里根本塞不进白话括注（浏览器标签页会变长）。讲解在正文里。
    s = re.sub(r'<title\b[^>]*>.*?</title>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<p\b[^>]*class="[^"]*\beyebrow\b[^"]*"[^>]*>.*?</p>', ' ', s, flags=re.S | re.I)
    return s


def audit_file(path):
    html = io.open(path, encoding='utf-8').read()
    text = to_text(prose_only(html))
    out = []
    # 先把所有术语的出现位置收集起来，用于判断某个词是不是「更长术语的一部分」
    spans = []
    for t in TERMS:
        for mm in re.finditer(re.escape(t), text):
            spans.append((mm.start(), mm.end(), t))

    def part_of_longer(start, end, term):
        return any(s0 <= start and end <= e0 and t0 != term and len(t0) > len(term)
                   for s0, e0, t0 in spans)

    for term in TERMS:
        if term in WHITELIST:
            continue
        i = -1
        for mm in re.finditer(re.escape(term), text):
            if not part_of_longer(mm.start(), mm.end(), term):
                i = mm.start()
                break
        if i < 0:
            continue
        if not has_plain_gloss(text, i, term):
            ctx = re.sub(r'\s+', ' ', text[max(0, i - 45): i + 70]).strip()
            out.append({'term': term, 'ctx': ctx})
    return out


def main():
    args = [a for a in sys.argv[1:]]
    check = '--check' in args
    if check:
        args.remove('--check')
    as_json = '--json' in args
    if as_json:
        args.remove('--json')
    files = args or sorted(f for f in (glob.glob(os.path.join(ROOT, 'lessons', '[0-9]*.html')) +
                           glob.glob(os.path.join(ROOT, 'advanced', '[A-Z]*.html')))
                           if '/._' not in f)
    rows = []
    for f in files:
        for r in audit_file(f):
            r['file'] = os.path.relpath(f, ROOT)
            rows.append(r)
    if as_json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0
    if len(files) == 1:
        if not rows:
            print("本课没有「术语首次出现未解释」的问题。")
            return 0
        print("文件：%s\n" % os.path.relpath(files[0], ROOT))
        for r in rows:
            print("  %-12s …%s…" % (r['term'], r['ctx'][:96]))
        print("\n共 %d 处" % len(rows))
        return 0
    print("%-42s %s" % ("文件", "未解释的术语"))
    print("-" * 96)
    per = {}
    for r in rows:
        per.setdefault(r['file'], []).append(r['term'])
    total = 0
    for f in files:
        rel = os.path.relpath(f, ROOT)
        terms = per.get(rel, [])
        total += len(terms)
        print("%-42s %2d  %s" % (rel.replace('lessons/', ''), len(terms),
                                 "、".join(terms[:9]) + ("…" if len(terms) > 9 else "")))
    print("-" * 96)
    print("合计未解释术语：%d 处" % total)
    if check and total:
        print("\n有术语首次出现未解释，验收不通过。")
        return 1
    if check:
        print("\n所有概念术语首次出现处都有白话解释。")
    return 0


if __name__ == '__main__':
    sys.exit(main())
