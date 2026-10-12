#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""独立的 HTML 标签平衡检查（不依赖课程结构），用于抓未闭合/错配标签。

用法: python3 tools/check-html.py 文件或目录 ...
"""
import io, os, re, sys
from html.parser import HTMLParser

VOID = {'area','base','br','col','embed','hr','img','input','link','meta',
        'param','source','track','wbr'}

class Checker(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.stack = []
        self.problems = []
        self.raw = 0   # 处在 script/style 原始文本里

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.raw += 1
        if tag in VOID:
            return
        self.stack.append((tag, self.getpos()))

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.raw = max(0, self.raw - 1)
        if tag in VOID:
            return
        if not self.stack:
            self.problems.append('多余的 </%s> 于第 %d 行' % (tag, self.getpos()[0]))
            return
        open_tag, pos = self.stack.pop()
        if open_tag != tag:
            self.problems.append(
                '标签错配：第 %d 行 <%s> 被 </%s> 关闭（第 %d 行）'
                % (pos[0], open_tag, tag, self.getpos()[0]))

# 块级元素不能嵌在 <p> 里。浏览器会自动把 <p> 提前闭合，导致
# 结构与作者本意不符（.eq 公式块尤其容易犯：作者想让它跟在句子后面，
# 就写成了 <p>…<div class="eq">…</div></p>）。
P_FORBIDDEN = {'div', 'p', 'section', 'article', 'figure', 'table', 'ul', 'ol',
               'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}


def check_nesting(src):
    """找 <p> 里嵌块级元素的写法（标签平衡检查抓不到这类问题）。"""
    out = []
    for m in re.finditer(r'<p\b[^>]*>', src, re.I):
        # 从 <p> 开始找它「应该」的结束位置之前，有没有出现块级开标签
        rest = src[m.end():]
        end = rest.lower().find('</p>')
        window = rest if end < 0 else rest[:end]
        for t in P_FORBIDDEN:
            if re.search(r'<%s\b' % t, window, re.I):
                line = src.count('\n', 0, m.start()) + 1
                out.append('<p> 里嵌了块级元素 <%s>（第 %d 行的 <p>）：'
                           '浏览器会自动提前闭合 <p>，请把它写成 <p> 的兄弟节点'
                           % (t, line))
                break
    return out


def check(path):
    src = io.open(path, encoding='utf-8').read()
    c = Checker(path)
    c.feed(src)
    c.close()
    for tag, pos in c.stack:
        c.problems.append('未闭合的 <%s>（起始于第 %d 行）' % (tag, pos[0]))
    c.problems.extend(check_nesting(src))
    return c.problems

def main():
    targets = []
    for a in sys.argv[1:]:
        if os.path.isdir(a):
            for root, _, files in os.walk(a):
                for f in files:
                    # 跳过 exFAT 生成的 AppleDouble 旁车文件（二进制）
                    if f.endswith('.html') and not f.startswith('._'):
                        targets.append(os.path.join(root, f))
        else:
            targets.append(a)
    bad = 0
    for t in sorted(targets):
        probs = check(t)
        name = os.path.relpath(t)
        if probs:
            bad += 1
            print('[FAIL] %s' % name)
            for p in probs[:6]:
                print('   x %s' % p)
        else:
            print('[ OK ] %s' % name)
    print('\n%d 个文件，%d 个有问题' % (len(targets), bad))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main())
