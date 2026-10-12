#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描「AI 味」中文表达，给出可量化的基线。

用法:
    python3 tools/scan-style.py lessons reference MISSION.md
    python3 tools/scan-style.py --top 20 lessons/*.html
"""
import io, os, re, sys

# 每项: (标签, 正则, 说明)
PATTERNS = [
    ("对立句式",   r"不是[^。；\n]{0,25}?而是",        "不是X而是Y —— 最典型的 AI 腔"),
    ("对立句式",   r"并非[^。；\n]{0,25}?而是",        "并非X而是Y"),
    ("对立句式",   r"不在于[^。；\n]{0,20}?而在于",     "不在于X而在于Y"),
    ("破折号插入", r"——",                              "中文破折号做补充说明，密度高就很像 AI"),
    ("套话过渡",   r"值得注意的是|需要注意的是|需要强调的是", "教科书式提醒"),
    ("套话过渡",   r"简单来说|简而言之|一言以蔽之",       "空转的过渡词"),
    ("套话过渡",   r"换句话说|也就是说",                 "同一意思重说一遍"),
    ("套话过渡",   r"总的来说|总而言之|综上",            "结尾总结腔"),
    ("套话过渡",   r"接下来[，,]?\s*(我们|你)?\s*(来看|看|讲|说)", "播报式过渡"),
    ("套话过渡",   r"让我们",                            "让我们… —— 直译腔"),
    ("强调腔",     r"其实",                              "其实 —— 高频出现即 AI 味"),
    ("强调腔",     r"恰恰",                              "恰恰"),
    ("强调腔",     r"这正是",                            "这正是… —— 自我总结"),
    ("强调腔",     r"正是",                              "正是"),
    ("强调腔",     r"本质上",                            "本质上"),
    ("强调腔",     r"真正(的|想要)",                     "真正的X"),
    ("排比递进",   r"不仅[^。；\n]{0,25}?而且",          "不仅…而且…"),
    ("排比递进",   r"首先[^。]{0,60}?其次",              "首先…其次… 机械分段"),
    ("模板腔",     r"学完这一课[，,]?\s*你能",            "27 课同一句开场白"),
    ("模板腔",     r"你该看到什么",                       "演示图注固定句"),
    ("模板腔",     r"常见误解",                           "固定栏目名"),
    ("模板腔",     r"这一课",                             "自指口吻"),
    # 「致命三元组」是 deadly triad 的标准译名，是术语不是夸张用词，必须排除
    ("营销腔",     r"白费|最贵|最要命|灾难|致命(?!三元组)",  "夸张用词"),
    ("营销腔",     r"非常(重要|关键)|极其(重要|关键)",     "强调通胀"),
    # 注意：不要匹配裸的「深度」与「系统性」—— 在 RL 语境里
    # 「深度 RL / 深度强化学习」是术语，「系统性高估 / 系统性偏差」是统计学本义，
    # 都是合法用法，算进来就是误报。
    ("营销腔",     r"彻底|全面地|系统性地|全方位|深层次",   "形容词通胀"),
    ("总结腔",     r"这(正是|就是)[^。]{0,20}的(体现|含义|意义)", "段末强行升华"),
    ("总结腔",     r"这就是为什么",                        "这就是为什么"),
]

BOLD = re.compile(r"<(strong|b)\b", re.I)


def visible_text(html):
    """只取正文可见文本：去掉 script/style/标签。"""
    s = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.S | re.I)
    s = re.sub(r"<style\b[^>]*>.*?</style>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"&[a-zA-Z#0-9]+;", "", s)
    return s


def scan(path):
    html = io.open(path, encoding="utf-8").read()
    text = visible_text(html)
    # 去掉代码块之外的英文，中文计数更准
    n_cjk = len(re.findall(r"[\u4e00-\u9fff]", text))
    hits = []
    for label, pat, why in PATTERNS:
        n = len(re.findall(pat, text))
        if n:
            hits.append((label, n, why))
    # 破折号密度：每千汉字
    dash = len(re.findall(r"——", text))
    bold = len(BOLD.findall(html))
    per_k = (lambda x: round(x / n_cjk * 1000, 2) if n_cjk else 0.0)
    return {
        "path": path, "cjk": n_cjk, "hits": hits,
        "dash": dash, "dash_per_k": per_k(dash),
        "bold": bold, "bold_per_k": per_k(bold),
        "total": sum(n for _, n, _ in hits),
        "total_per_k": per_k(sum(n for _, n, _ in hits)),
    }


def files_from(args):
    out = []
    for a in args:
        if os.path.isdir(a):
            for root, _, fs in os.walk(a):
                for f in fs:
                    if f.endswith((".html", ".md")) and not f.startswith("._"):
                        out.append(os.path.join(root, f))
        elif os.path.exists(a):
            out.append(a)
    return sorted(out)


def main():
    args = [a for a in sys.argv[1:]]
    top = None
    if "--top" in args:
        i = args.index("--top")
        top = int(args[i + 1]); del args[i:i + 2]
    if not args:
        print(__doc__); return 2

    rows = [scan(p) for p in files_from(args)]
    rows.sort(key=lambda r: -r["total_per_k"])

    label_w = 12
    print("%-38s %6s %6s %7s %7s" % ("文件", "汉字", "命中", "每千字", "破折号/千"))
    print("-" * 72)
    for r in rows[:top] if top else rows:
        print("%-38s %6d %6d %7.2f %7.2f"
              % (os.path.relpath(r["path"]), r["cjk"], r["total"],
                 r["total_per_k"], r["dash_per_k"]))

    # 全局汇总
    tot_cjk = sum(r["cjk"] for r in rows)
    tot_hit = sum(r["total"] for r in rows)
    agg = {}
    for r in rows:
        for label, n, why in r["hits"]:
            agg[(label, why)] = agg.get((label, why), 0) + n
    print("\n" + "=" * 72)
    print("合计：%d 个文件，%d 汉字，%d 处命中（每千字 %.2f）"
          % (len(rows), tot_cjk, tot_hit, tot_hit / tot_cjk * 1000 if tot_cjk else 0))
    print("=" * 72)
    print("\n按模式汇总：")
    for (label, why), n in sorted(agg.items(), key=lambda kv: -kv[1]):
        print("  %-10s %5d   %s" % (label, n, why))
    print("\n全局破折号: %d 处（每千字 %.2f）"
          % (sum(r["dash"] for r in rows), sum(r["dash"] for r in rows) / tot_cjk * 1000 if tot_cjk else 0))
    print("全局加粗标签: %d 处（每千字 %.2f）"
          % (sum(r["bold"] for r in rows), sum(r["bold"] for r in rows) / tot_cjk * 1000 if tot_cjk else 0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
