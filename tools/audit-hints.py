#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查代码题提示（<details class="hints">）有没有「点名每一步」。

COURSE-SPEC §15.5 要求：提示不许只给方向，要点名到"用哪个函数、先算什么、循环怎么写"。
例：不合格「用一个累乘变量」；合格「先设 g = 1.0，每轮把 g * rewards[k] 累加进总和」。

此前没有任何工具检查这一条。本脚本用两个可量的信号：
  ① 提示里有没有出现 <code>…</code>（点名具体函数/变量）
  ② 提示的总字数够不够（少于 40 字基本说不出步骤）
"""
import glob, io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE_EX = re.compile(r'<div\b[^>]*class="[^"]*\bcode-ex\b[^"]*"[^>]*data-code="([^"]+)"[^>]*>(.*?)(?=<div\b[^>]*class="[^"]*\bcode-ex\b|</section>)', re.S | re.I)
HINTS = re.compile(r'<details\b[^>]*class="[^"]*hints[^"]*"[^>]*>(.*?)</details>', re.S | re.I)


def text_of(f):
    s = re.sub(r'<[^>]+>', ' ', f)
    s = re.sub(r'&[a-zA-Z#0-9]+;', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    files = args or sorted(f for f in (glob.glob(os.path.join(ROOT, 'lessons', '[0-9]*.html')) +
                           glob.glob(os.path.join(ROOT, 'advanced', '[A-Z]*.html')))
                           if '/._' not in f)
    print("%-42s %5s %6s %7s  %s" % ("文件", "题号", "提示字数", "点名处数", "判定"))
    print("-" * 88)
    bad = 0
    total = 0
    for f in files:
        html = io.open(f, encoding='utf-8').read()
        for m in CODE_EX.finditer(html):
            cid, chunk = m.group(1), m.group(2)
            total += 1
            hm = HINTS.search(chunk)
            if not hm:
                print("%-42s %5s %6s %7s  %s" % (os.path.relpath(f, ROOT).replace('lessons/', ''), cid, '-', '-', 'x 没有提示区'))
                bad += 1
                continue
            h = hm.group(1)
            txt = text_of(h)
            n_code = len(re.findall(r'<code>', h))
            probs = []
            if len(txt) < 40:
                probs.append('提示过短(%d字)' % len(txt))
            # 判据是「有没有点名具体函数/变量」，不是数量。1 处也够
            # （例如「五个分支写成一条 <code>if / elif</code> 链」+ 顺序说明）。
            if n_code < 1:
                probs.append('没点名任何具体函数/变量')
            if probs:
                bad += 1
            print("%-42s %5s %6d %7d  %s" % (
                os.path.relpath(f, ROOT).replace('lessons/', ''), cid, len(txt), n_code,
                "；".join(probs) if probs else "OK"))
    print("-" * 88)
    print("共 %d 道代码题；提示「没点名每一步」的 %d 道" % (total, bad))
    if '--check' in sys.argv and bad:
        print("\n有代码题提示没有点名每一步，验收不通过。")
        return 1
    if '--check' in sys.argv:
        print("\n所有代码题提示都点名了具体函数/变量。")
    return 0


if __name__ == '__main__':
    sys.exit(main())
