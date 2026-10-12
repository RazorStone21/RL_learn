#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""对照 tools/lesson-invariants.json 检查「红线内容」有没有被改掉。

教训：题干改写时若整块替换 <div class="code-prompt">…</div>，会把嵌在题干里的
<div class="eq"> 公式块一起删掉，而 check-lesson / check-html / 文风 / 术语
四道闸门全都发现不了（判题不看公式，标签依然配平）。
所以必须单独把公式数量、data-answer、题数固定成不变量来核对。

用法:
    python3 tools/check-invariants.py            # 全部课程
    python3 tools/check-invariants.py --check    # 有不符则返回非零
"""
import glob, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(ROOT, 'tools', 'lesson-invariants.json')


def main():
    check = '--check' in sys.argv
    base = json.load(io.open(BASELINE, encoding='utf-8'))
    bad = 0
    rows = []
    for num in sorted(base):
        g = (glob.glob(os.path.join(ROOT, 'lessons', '%s-*.html' % num)) +
             glob.glob(os.path.join(ROOT, 'advanced', '%s-*.html' % num)))
        g = [f for f in g if '/._' not in f]
        if not g:
            rows.append((num, '缺文件'))
            bad += 1
            continue
        s = io.open(g[0], encoding='utf-8').read()
        exp = base[num]
        cur = {
            'data_answer': ",".join(re.findall(r'data-answer="(\d)"', s)),
            'eq_num': len(re.findall(r'class="eq-num"', s)),
            'mcq': len(re.findall(r'class="mcq"', s)),
            'code_ex': len(re.findall(r'class="code-ex"', s)),
            'x_python': len(re.findall(r'type="text/x-python"', s)),
        }
        probs = []
        # 标题必须与 manifest 一致（改写正文时别顺手改课名）
        t = re.search(r'<title>(.*?)</title>', s, re.S)
        want = base[num].get('title')
        if want and t and want not in t.group(1):
            probs.append('标题与 manifest 不一致：%s' % t.group(1).strip()[:40])
        for k, v in cur.items():
            if v != exp[k]:
                if k == 'eq_num' and isinstance(v, int) and v < exp[k]:
                    probs.append('公式少了 %d 个（%d -> %d）' % (exp[k] - v, exp[k], v))
                elif k == 'eq_num':
                    probs.append('公式多了 %d 个（%d -> %d）' % (v - exp[k], exp[k], v))
                else:
                    probs.append('%s: %s -> %s' % (k, exp[k], v))
        if probs:
            bad += 1
            rows.append((num, "；".join(probs)))
    if rows:
        print("以下课程的红线内容与基线不符：")
        for num, why in rows:
            print("   %s  %s" % (num, why))
        print("\n不符课程：%d / %d" % (bad, len(base)))
    else:
        print("红线不变量核对通过：%d 课（公式编号数、data-answer、题数、脚本数）" % len(base))
    if check and bad:
        print("红线不变量验收不通过。")
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
