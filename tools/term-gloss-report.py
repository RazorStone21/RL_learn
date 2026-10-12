#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把同一个术语在 27 课里的所有「白话解释」并排列出来，供人工核对说法是否漂移。

为什么需要它：改写是 7 个 agent 并行做的，术语解释虽然要求照抄
docs/plain-terms.md，但仍可能出现「折扣因子」在某课被解释成另一回事。
audit-jargon.py 只能查「有没有解释」，查不出「解释得对不对、一致不一致」。

用法:
    python3 tools/term-gloss-report.py                # 全部术语
    python3 tools/term-gloss-report.py 折扣因子 自举    # 只看指定术语
"""
import glob, io, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 与 audit-jargon.py 保持同一份术语表
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import importlib.util
spec = importlib.util.spec_from_file_location('aj', os.path.join(ROOT, 'tools', 'audit-jargon.py'))
AJ = importlib.util.module_from_spec(spec)
spec.loader.exec_module(AJ)
TERMS = [t for t in AJ.TERMS if t not in AJ.WHITELIST]

PAREN = re.compile(r'[（(]([^）)]{2,80})[）)]')


def prose_only(html):
    s = re.sub(r'<script\b[^>]*>.*?</script>', ' ', html, flags=re.S | re.I)
    s = re.sub(r'<div class="objectives">.*?</div>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<h[1-6]\b[^>]*>.*?</h[1-6]>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<title\b[^>]*>.*?</title>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<p\b[^>]*class="[^"]*\beyebrow\b[^"]*"[^>]*>.*?</p>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'&[a-zA-Z#0-9]+;', ' ', s)
    return re.sub(r'\s+', '', s)


def main():
    want = [a for a in sys.argv[1:] if not a.startswith('-')]
    files = sorted(f for f in glob.glob(os.path.join(ROOT, 'lessons', '[0-9]*.html'))
                   if '/._' not in f)
    found = defaultdict(list)          # term -> [(lesson, gloss)]
    for f in files:
        num = os.path.basename(f)[:4]
        text = prose_only(io.open(f, encoding='utf-8').read())
        for term in (want or TERMS):
            # 与 audit-jargon.py 一致：跳过「作为更长术语一部分」的位置
            # （否则「回报」会被「折扣回报」误配、「策略」会被「行为策略」误配）
            i = -1
            for mm in re.finditer(re.escape(term), text):
                st, en = mm.start(), mm.end()
                if any(o != term and len(o) > len(term) and text.find(o, max(0, st - len(o))) == st - len(o)
                       for o in TERMS):
                    continue
                i = st
                break
            if i < 0:
                continue
            tail = text[i + len(term): i + len(term) + 60]
            m = PAREN.match(tail)
            if not m:
                continue
            content = m.group(1).strip()
            # 括注若只有英文（如 `（discounted return）`），真正的解释往往跟在后面，
            # 如「折扣回报（discounted return）就是 RL 要最大化的那个总分」。
            # 那种情况下取后面的中文，而不是把它误报成「只有英文」。
            if not re.search(r'[\u4e00-\u9fff]', content):
                after = text[i + len(term) + m.end(): i + len(term) + m.end() + 34]
                if re.search(r'[\u4e00-\u9fff]', after):
                    content = content + ' → ' + after
                else:
                    content = '[仅英文] ' + content
            found[term].append((num, content))
    multi = {t: v for t, v in found.items() if len({g for _, g in v}) > 1}
    single = {t: v for t, v in found.items() if t not in multi and v}
    print("=" * 96)
    print("术语说法**不一致**的（同一术语在不同课解释不同，需要人工判断是否真的矛盾）：")
    print("=" * 96)
    if not multi:
        print("  （无）")
    for t, items in sorted(multi.items()):
        print("\n  【%s】出现 %d 种说法：" % (t, len({g for _, g in items})))
        seen = set()
        for num, g in items:
            if g in seen:
                continue
            seen.add(g)
            who = "、".join(n for n, gg in items if gg == g)
            print("     [%s]  %s" % (who, g[:74]))
    print()
    print("=" * 96)
    print("术语说法**一致**的：%d 个" % len(single))
    for t, items in sorted(single.items()):
        print("  %-12s %s  (%s)" % (t, items[0][1][:52], "、".join(n for n, _ in items)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
