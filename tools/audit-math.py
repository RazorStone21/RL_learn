#!/usr/bin/env python3
"""数学课跨课一致性检查。

30 课由多个作者分头写，最容易走偏的三件事：
  ① 交叉引用指向不存在的课（"见 0009 课"，但那课没写或编号错）
  ② 证明块没有结束标记（读者不知道证完了没有）
  ③ 公式编号没用本课前缀（0008 课出现 (3.7)，与第 3 课混在一起）

这三项都能客观判定。符号一致性另用报告形式给出（供人工判断，不做硬判据）。

用法：
    python3 tools/audit-math.py                # 扫全部课程页
    python3 tools/audit-math.py --check        # 只报错，有问题时退出码非 0
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def course_files():
    import glob
    out = []
    for pat in ('lessons/[0-9]*.html', 'advanced/[A-Z]*.html'):
        out += [f for f in glob.glob(os.path.join(ROOT, pat)) if '/._' not in f]
    return sorted(out)


def load_manifest(rel_dir):
    p = os.path.join(ROOT, rel_dir, 'manifest.json')
    if not os.path.exists(p):
        return []
    with io.open(p, encoding='utf-8') as f:
        return json.load(f).get('lessons', [])


def known_numbers():
    """全课程里真实存在的课号。"""
    nums = set()
    for d in ('lessons', 'advanced'):
        for L in load_manifest(d):
            nums.add(L['number'])
    # 也接受纯数字形式（"见 0009 课" 里的 0009）
    return nums


def strip_scripts(html):
    html = re.sub(r'<script\b[^>]*>.*?</script>', ' ', html, flags=re.S | re.I)
    return re.sub(r'<style\b[^>]*>.*?</style>', ' ', html, flags=re.S | re.I)


def balanced_div(html, start, cls):
    """取出 class 含 cls 的那个 <div> 的完整内容（含嵌套 div）。

    不能用非贪婪的 (.*?)</div>：证明块里常常嵌着 <div class="eq">，
    那样会在 eq 的 </div> 处提前截断，把「缺少 ∎」误报成错误。
    这个坑在 audit-jargon / audit-prompts 里已经踩过两次了。
    """
    open_m = re.compile(r'<div\b[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>', re.I)
    m = open_m.search(html, start)
    if not m:
        return None
    depth = 0
    for t in re.finditer(r'<div\b[^>]*>|</div\s*>', html[m.start():], re.I):
        if t.group(0).lower().startswith('</'):
            depth -= 1
            if depth == 0:
                return html[m.start(): m.start() + t.end()]
        else:
            depth += 1
    return html[m.start():]


def find_blocks(html, cls):
    """按出现顺序返回所有 class 含 cls 的 div 的完整 HTML。"""
    out, pos = [], 0
    open_m = re.compile(r'<div\b[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>', re.I)
    while True:
        m = open_m.search(html, pos)
        if not m:
            break
        blk = balanced_div(html, m.start(), cls)
        if not blk:
            break
        out.append(blk)
        pos = m.start() + len(blk)
    return out


def text_of(html):
    s = re.sub(r'<[^>]+>', ' ', strip_scripts(html))
    s = re.sub(r'&[a-zA-Z#0-9]+;', ' ', s)
    return re.sub(r'\s+', ' ', s)


def audit_file(path, nums):
    html = io.open(path, encoding='utf-8').read()
    base = os.path.basename(path)
    is_math = 'data-kind="math"' in html
    errors, warns, notes = [], [], []

    # ---- ① 交叉引用 ----
    # 只认「00XX 课」这种明确写法，避免把普通数字当引用
    for m in re.finditer(r'(\d{4})\s*课', text_of(html)):
        n = m.group(1)
        if n not in nums:
            ctx = text_of(html)[max(0, m.start() - 30): m.end() + 20]
            # 同一课自己引用自己也算错
            errors.append("交叉引用「%s 课」不存在（上下文：…%s…）" % (n, ctx.strip()))

    # ---- ② 证明块的结束标记 ----
    if is_math:
        for i, body in enumerate(find_blocks(html, 'proof'), 1):
            if 'qed' not in body and '∎' not in body and '□' not in body:
                label = re.search(r'class="label">([^<]*)<', body)
                errors.append("第 %d 个证明块没有结束标记（∎）：%s"
                              % (i, label.group(1) if label else '无标题'))

    # ---- ③ 公式编号前缀 ----
    if is_math:
        num = re.match(r'([0-9A-Z]+)-', base)
        num = num.group(1) if num else None
        if num and num.isdigit():
            want = str(int(num))          # 0008 -> 8
            eqs = re.findall(r'class="eq-num">\s*\(([\d.]+)\)', html)
            bad = [e for e in eqs if e.split('.')[0] != want]
            if bad:
                errors.append("公式编号前缀应为 (%s.x)，实际出现：%s"
                              % (want, "、".join("(%s)" % b for b in bad)))
            if eqs:
                notes.append("公式 %d 条，编号 %s" % (len(eqs), "、".join("(%s)" % e for e in eqs)))

    # ---- ④ 插图序号前缀（顺带查） ----
    if is_math:
        num = re.match(r'([0-9A-Z]+)-', base)
        if num and num.group(1).isdigit():
            want = str(int(num.group(1)))
            figs = re.findall(r'fig-num">图\s*([\d.]+)<', html)
            bad = [f for f in figs if f.split('.')[0] != want]
            if bad:
                errors.append("插图编号前缀应为 图 %s.x，实际出现：%s"
                              % (want, "、".join("图 %s" % b for b in bad)))

    # ---- ⑤ 符号一致性（报告，不做硬判据）----
    if is_math:
        # 折扣因子统一用 \gamma
        if re.search(r'折扣因子[^。]{0,24}lambda', text_of(html)):
            warns.append("折扣因子似乎写成了 lambda，规范用 \\gamma")
        # 状态值/动作值统一小写 v/q
        if re.search(r'\$V_\\pi|\$Q_\\pi|\$V\^\*|\$Q\^\\?\*', html):
            warns.append("状态值/动作值建议用小写 v/q（规范：$v_\\pi$、$q_\\pi$）")
        # 宏大小写：本项目在 math.js 里定义 \\E \\R \\var \\argmax \\argmin \\d
        # 只报「会渲染失败」的写法。\mathbb{E} 与 \E 等价，属于风格差异，不报。
        # \Var 没有定义（本项目的宏是小写 \var），KaTeX 会渲染成红色报错。
        for wrong, right in [(r'\\Var\b', r'\var'), (r'\\Argmax\b', r'\argmax'),
                             (r'\\Argmin\b', r'\argmin'), (r'\\Exp\b', r'\E')]:
            if re.search(wrong, html):
                warns.append("用了未定义的宏 %s（应写 %s，否则 KaTeX 渲染报错）"
                             % (wrong.replace('\\', '\\'), right))

    return base, errors, warns, notes


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    nums = known_numbers()
    files = args or course_files()
    tot_e = tot_w = 0
    rows = []
    for p in files:
        base, e, w, n = audit_file(p, nums)
        tot_e += len(e); tot_w += len(w)
        rows.append((base, e, w, n))
    for base, e, w, n in rows:
        if not (e or w):
            continue
        print("=" * 70)
        print(base)
        for x in e:
            print("  [错误] %s" % x)
        for x in w:
            print("  [警告] %s" % x)
        for x in n:
            print("  ·      %s" % x)
    if not check:
        print()
        print("-" * 70)
        for base, e, w, n in rows:
            if n and not (e or w):
                print("%-42s %s" % (base, "；".join(n)))
    print()
    print("=" * 70)
    print("检查 %d 个文件：%d 个错误，%d 个警告" % (len(rows), tot_e, tot_w))
    if check and (tot_e or tot_w):
        print("数学一致性不通过。")
        return 1
    if tot_e:
        return 1
    print("数学一致性检查通过。")
    return 0


if __name__ == '__main__':
    sys.exit(main())
