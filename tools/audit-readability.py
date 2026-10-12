#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""量「读起来累不累」：句长、术语密度、开头是否有生词。

COURSE-SPEC §15.1 要求「一句话超过 40 字就断开」「开头 100 字内不出现未解释的术语」，
但此前没有任何工具检查这两条。本脚本把「慢下来」变成可比的数字。

用法:
    python3 tools/audit-readability.py                 # 全部课程
    python3 tools/audit-readability.py lessons/0001-what-is-rl.html
"""
import glob, io, os, re, sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _textutil import protect_math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import importlib.util
spec = importlib.util.spec_from_file_location('aj', os.path.join(ROOT, 'tools', 'audit-jargon.py'))
AJ = importlib.util.module_from_spec(spec); spec.loader.exec_module(AJ)

CJK = re.compile(r'[\u4e00-\u9fff]')
SENT = re.compile(r'[^。！？；\n]+[。！？；]?')


def body_text(path):
    s = io.open(path, encoding='utf-8').read()
    s = protect_math(s)
    s = re.sub(r'<script\b[^>]*>.*?</script>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<svg\b[^>]*>.*?</svg>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<style\b[^>]*>.*?</style>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<div class="objectives">.*?</div>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<details\b.*?</details>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<div class="code-ex".*?(?=<div class="code-ex"|</section>)', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<h[1-6]\b[^>]*>.*?</h[1-6]>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'&[a-zA-Z#0-9]+;', ' ', s)
    return re.sub(r'[ \t]+', ' ', s)



# 小写英文术语：audit-terms.py 只查大写缩写（DQN/PPO），
# 但 `actor`、`critic`、`rollout` 这类小写词对零基础读者同样是天书，之前没人查。
ENG_TERMS = ['actor', 'critic', 'rollout', 'warmup', 'on-policy', 'off-policy',
             'softmax', 'logits', 'buffer', 'epoch', 'batch']

# 嵌套括号：`（temporal difference，时序差分（用…更新…））` 读起来最累
NESTED = re.compile(r'（[^（）]{0,80}（[^（）]{0,80}）[^（）]{0,40}）')


def eng_bare(text):
    """返回「出现多次却从没给过中文解释」的小写英文术语。"""
    out = []
    for w in ENG_TERMS:
        n = len(re.findall(r'\b' + re.escape(w) + r'\b', text))
        if n < 2:
            continue
        if re.search(re.escape(w) + r'\s*[（(][^）)]*[\u4e00-\u9fff]', text):
            continue
        out.append((w, n))
    return out


# 业务与技术外来词：既不是缩写（audit-terms 不管），也不在概念术语表里，
# 但零基础读者未必认识（反馈原话：「这个 banner 是什么东西？我根本不知道呀」）。
LOAN = ['banner', 'shadow', 'sum-tree', 'one-hot', 'logit', 'mini-batch', 'dropout',
        'NaN', 'gather', '小流量', '护栏指标']


def loan_bare(text):
    """返回首次出现处没有中文解释的外来词。"""
    out = []
    for w in LOAN:
        m = re.search(r'(?<![A-Za-z])' + re.escape(w) + r'(?![A-Za-z])', text)
        if not m:
            continue
        tail = text[m.end(): m.end() + 30]
        # 只认两种真解释形态：紧跟含中文的括注，或紧跟「是/就是/意思是…」。
        # 曾经写过「后面 16 字里有两个中文就算解释过」——那个兜底太松，
        # 任何中文都能让它通过，等于这条检查永远不报红（自检才发现的）。
        # 允许括注前夹 0–4 个字符，以覆盖「shadow 模式（…）」这种写法。
        ok = bool(re.search(r'^[\s\S]{0,7}?[（(][^）)]*[\u4e00-\u9fff]', tail)) or \
             bool(re.search(r'^\s*[，,]?\s*(是|就是|意思是|指的是|也就是|即|为)\s*[\u4e00-\u9fff]', tail)) or \
             bool(re.search(r'^\s*[：:]\s*[\u4e00-\u9fff]', tail))
        if not ok:
            out.append(w)
    return out

def measure(path):
    text = body_text(path)
    han = len(CJK.findall(text))
    sents = [s for s in SENT.findall(text) if len(CJK.findall(s)) >= 4]
    lens = [len(CJK.findall(s)) for s in sents]
    long_s = [l for l in lens if l > 60]
    terms = 0
    for t in AJ.TERMS:
        if t in AJ.WHITELIST:
            continue
        terms += len(re.findall(re.escape(t), text))
    nested = len(NESTED.findall(text))
    bare = eng_bare(text)
    loan = loan_bare(text)
    return {
        'han': han,
        'nested': nested,
        'bare': bare,
        'loan': loan,
        'n_sent': len(lens),
        'avg': (sum(lens) / len(lens)) if lens else 0,
        'p90': sorted(lens)[int(len(lens) * 0.9)] if lens else 0,
        'long60': len(long_s),
        'density': (terms / han * 1000) if han else 0,
    }


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    files = args or sorted(f for f in (glob.glob(os.path.join(ROOT, 'lessons', '[0-9]*.html')) +
                           glob.glob(os.path.join(ROOT, 'advanced', '[A-Z]*.html')))
                           if '/._' not in f)
    print("%-34s %6s %6s %5s %5s %5s %6s %5s  %s" % ("文件", "汉字", "句数", "均句长", "P90", ">60句", "术语/千", "嵌套括号", "未解释英文词"))
    print("-" * 104)
    rows = []
    for f in files:
        m = measure(f)
        rows.append((os.path.relpath(f, ROOT), m))
        if len(files) == 1:
            continue
    if len(files) == 1:
        n, m = rows[0]
        print("  %s：汉字 %d，句数 %d，平均句长 %.1f 字，P90 句长 %d 字，超 60 字的句子 %d 句，术语密度 %.1f/千字"
              % (n, m['han'], m['n_sent'], m['avg'], m['p90'], m['long60'], m['density']))
        return 0
    for n, m in sorted(rows, key=lambda x: -x[1]['avg']):
        flag = ""
        if m['avg'] > 32:
            flag += " ←平均句长偏长"
        if m['long60'] >= 8:
            flag += " ←长句多"
        bare = "、".join("%s×%d" % (w, c) for w, c in m['bare']) or "-"
        if m.get('loan'):
            bare += ("  " if bare != "-" else "") + "外来词未解释：" + "、".join(m['loan'])
        print("%-34s %6d %6d %5.1f %5d %5d %6.1f %5d  %s%s"
              % (n.replace('lessons/', ''), m['han'], m['n_sent'], m['avg'], m['p90'],
                 m['long60'], m['density'], m['nested'], bare, flag))
    print("-" * 82)
    total_nested = sum(m['nested'] for _, m in rows)
    total_bare = sum(len(m['bare']) for _, m in rows)
    total_loan = sum(len(m.get('loan', [])) for _, m in rows)
    print()
    print("嵌套括号合计 %d 处；未解释的小写英文词 %d 个；未解释的业务外来词 %d 个"
          % (total_nested, total_bare, total_loan))
    if '--check' in sys.argv:
        if total_nested or total_bare or total_loan:
            print("\n有嵌套括号或未解释的小写英文词，验收不通过。")
            return 1
        print("\n没有嵌套括号，也没有未解释的小写英文词与业务外来词。")
    avgs = [m['avg'] for _, m in rows]
    print("平均句长：中位 %.1f 字，最长 %.1f 字；术语密度：中位 %.1f/千字"
          % (sorted(avgs)[len(avgs)//2], max(avgs), sorted(m['density'] for _, m in rows)[len(rows)//2]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
