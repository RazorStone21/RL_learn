# -*- coding: utf-8 -*-
"""取「可见正文」的公共工具。

**为什么要单独抽出来**：数学公式里的裸 `<`（例如 `<\\infty`、`<1`、`<n`）
不是 HTML 标签开头，浏览器会把它当普通文本正常渲染；但工具用 `<[^>]+>` 剥标签时，
会从那个 `<` 一路匹配到后面某个标签的 `>`，**把中间的正文整段删掉**。

实测：全课程有 5000+ 字被这样静默吞掉（0018 丢 1647 字、0011 丢 828 字），
后果是字数闸门低报、术语检查漏检。

修法：在剥标签**之前**先把 `$...$` 与 `$$...$$` 里的 `<` 换成占位符，
剥完再把占位符换回来（统计字数时按原样计入，因为它们确实是在页面上可见的文本）。
"""
import re

PLACE = '\x01'   # 不可能出现在正文里的占位符

_MATH_DISPLAY = re.compile(r'\$\$[\s\S]*?\$\$')
_MATH_INLINE = re.compile(r'(?<!\$)\$[^$\n]{1,600}?\$(?!\$)')


def protect_math(html):
    """把数学定界符内部的 < 换成占位符，避免被当成标签。"""
    def _p(m):
        return m.group(0).replace('<', PLACE)
    s = _MATH_DISPLAY.sub(_p, html)
    s = _MATH_INLINE.sub(_p, s)
    return s


def strip_tags(html, keep_math=True):
    """剥掉 HTML 标签，返回正文文本。

    keep_math=True 时，公式内容保留为文本（它们在页面上是可见的）；
    False 时把公式整体删掉（只想看纯散文时用）。
    """
    s = re.sub(r'<script\b[^>]*>.*?</script>', ' ', html, flags=re.S | re.I)
    s = re.sub(r'<style\b[^>]*>.*?</style>', ' ', s, flags=re.S | re.I)
    if keep_math:
        s = protect_math(s)
    else:
        s = _MATH_DISPLAY.sub(' ', s)
        s = _MATH_INLINE.sub(' ', s)
    s = re.sub(r'<[^>]*>', ' ', s)
    s = s.replace(PLACE, '<')
    return s


def visible_len(html):
    """可见字数（按空白折叠后的字符数计）。"""
    return len(re.sub(r'\s+', '', strip_tags(html)))
