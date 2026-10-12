#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成「题干 ↔ 测试」人工核对清单。

题干是给人读的，判分靠 tests。两者对不上时，任何自动闸门都发现不了
（tests 没变，所以永远通过）。这个脚本把两边并排打印，并把
**题干里出现、但测试里找不到的数字**标出来，供人工判断。

用法:
    python3 tools/prompt-test-review.py > docs/prompt-test-review.txt
    python3 tools/prompt-test-review.py lessons/0013-dqn.html
"""
import glob, io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE_EX = re.compile(r'<div\b[^>]*class="[^"]*\bcode-ex\b[^"]*"[^>]*data-code="([^"]+)"[^>]*>(.*?)(?=<div\b[^>]*class="[^"]*\bcode-ex\b|</section>)', re.S | re.I)
SCRIPT = re.compile(r'<script\b[^>]*type="text/x-python"[^>]*data-role="(starter|tests|solution)"[^>]*>(.*?)</script>', re.S | re.I)
NUM = re.compile(r'\d+(?:\.\d+)?')
# 形状只在「形状 / shape / 返回」这类关键词附近才算声明，
# 否则会把 (s, a, r, s_next, done) 这种参数表也当成形状 —— 那是误导。
SHAPE_CTX = re.compile(r'(?:形状|shape|返回|长度)[^。；\n]{0,14}?[（(]([^）)]{1,24})[）)]')
SHAPE_TUPLE = re.compile(r'[（(]\s*(?:[A-Za-z_]\w*|\d+)?\s*,\s*[）)]')
# 「返回长度为 7 的数组」这类用文字写的长度声明
LEN_CTX = re.compile(r'长度(?:为|是)?\s*(\d+)')


def shapes_in(prompt):
    out = []
    for m in SHAPE_CTX.finditer(prompt):
        out.append(m.group(1).strip())
    for m in SHAPE_TUPLE.finditer(prompt):
        t = m.group(0)
        if t not in out:
            out.append(t)
    for m in LEN_CTX.finditer(prompt):
        t = '长度 %s' % m.group(1)
        if t not in out:
            out.append(t)
    return out



def balanced_div(html, start):
    """从 start 处的 <div 开始，返回到与之配对的 </div> 为止。
    题干里允许嵌套 <div class="eq">，用非贪婪正则会在第一个 </div> 就截断，
    导致把完整题干误判成"没写返回说明"—— 这是测量工具自己的 bug。"""
    depth = 0
    for m in re.finditer(r'<div\b|</div\s*>', html[start:], re.I):
        if m.group(0).lower().startswith('</'):
            depth -= 1
            if depth == 0:
                return html[start:start + m.end()]
        else:
            depth += 1
    return html[start:]


def prompt_html(chunk):
    """取出 code-prompt 的完整 HTML（配平 div），失败时退回原正则。"""
    m = re.search(r'<div\b[^>]*class="[^"]*code-prompt[^"]*"[^>]*>', chunk)
    if not m:
        return ''
    return balanced_div(chunk, m.start())

def text_of(fragment):
    s = re.sub(r'<[^>]+>', ' ', fragment)
    s = re.sub(r'&[a-zA-Z#0-9]+;', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def main():
    args = [a for a in sys.argv[1:]]
    files = args or sorted(f for f in glob.glob(os.path.join(ROOT, 'lessons', '[0-9]*.html'))
                           if '/._' not in f)
    susp = 0
    for path in files:
        html = io.open(path, encoding='utf-8').read()
        for m in CODE_EX.finditer(html):
            cid, chunk = m.group(1), m.group(2)
            h3 = re.search(r'<h3[^>]*>(.*?)</h3>', chunk, re.S)
            pr = prompt_html(chunk)
            title = text_of(h3.group(1)) if h3 else ''
            prompt = text_of(pr) if pr else ''
            roles = {mm.group(1): mm.group(2) for mm in SCRIPT.finditer(chunk)}
            tsrc = roles.get('tests', '')
            pnums = set(NUM.findall(prompt))
            tnums = set(NUM.findall(tsrc))
            only_prompt = sorted(pnums - tnums, key=lambda x: (len(x), x))
            # 过滤掉明显是编号/公式号/年份的数字
            only_prompt = [n for n in only_prompt if n not in ('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')
                           and not re.match(r'^(19|20)\d\d$', n) and not re.match(r'^\d+\.\d+$', n)]
            print("=" * 100)
            print("### %s  %s" % (cid, title))
            print("文件: %s" % os.path.relpath(path, ROOT))
            print("-" * 100)
            print("【题干】%s" % prompt)
            print()
            print("【题干里的形状声明】%s" % ("、".join(shapes_in(prompt)) or "（无）"))
            if only_prompt:
                susp += 1
                print("【! 题干提到但 tests 里找不到的数字】%s   ← 人工确认是否矛盾" % "、".join(only_prompt))
            else:
                print("【题干数字与 tests 一致】")
            print()
            print("【tests 关键断言/常量】")
            shown = 0
            for line in tsrc.splitlines():
                if any(k in line for k in ('check(', 'shape', 'assert', 'zeros(', 'ones(', 'arange', 'dtype')):
                    print("    " + line.strip()[:150])
                    shown += 1
                    if shown >= 12:
                        print("    …")
                        break
            print()
    print("=" * 100)
    print("需要人工确认数字的题目数：%d" % susp)


if __name__ == '__main__':
    main()
