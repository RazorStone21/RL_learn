#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""改文风收尾：机械化的、全课程统一的清理。

**必须在所有并行改写结束后再跑**（否则会与改写相互覆盖）。

1. 去掉 135 处逐题重复的 `<strong>为什么：</strong>` 模板加粗。
2. 报告（不修改）位于受保护 Python 代码块里的 AI 味注释，供人工判断。

用法:
    python3 tools/final-style-pass.py --apply
    python3 tools/final-style-pass.py            # 只报告，不写
"""
import glob, io, re, sys

APPLY = '--apply' in sys.argv
FILES = sorted(f for f in glob.glob('lessons/[0-9]*.html') if '/._' not in f)

TEMPLATE = '<strong>为什么：</strong>'
REPLACEMENT = '为什么：'

PY_BLOCK = re.compile(r'<script\b[^>]*type="text/x-python"[^>]*>(.*?)</script>', re.S | re.I)
TELLS = ('——', '正是', '恰恰', '其实', '值得注意', '换句话说')

total_fixed = 0
for f in FILES:
    s = io.open(f, encoding='utf-8').read()
    n = s.count(TEMPLATE)
    if n:
        total_fixed += n
        if APPLY:
            s = s.replace(TEMPLATE, REPLACEMENT)
            io.open(f, 'w', encoding='utf-8').write(s)
        print("%-46s 去模板加粗 x%d" % (f, n))

print()
print("模板加粗共 %d 处%s" % (total_fixed, "，已清理" if APPLY else "（未写入，加 --apply 生效）"))

print()
print("以下位置的 AI 味标记位于受保护的 Python 代码块内（多为 # 注释），")
print("需人工确认只改注释文字、不改代码逻辑，改完必须重跑 validate-all.sh：")
found = 0
for f in FILES:
    s = io.open(f, encoding='utf-8').read()
    for m in PY_BLOCK.finditer(s):
        code = m.group(1)
        for sym in TELLS:
            if sym in code:
                for line in code.splitlines():
                    if sym in line:
                        print("  %s | %s" % (f.replace('lessons/', ''), line.strip()[:78]))
                        found += 1
print("共 %d 行。" % found)
