#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
课程自检器：结构 + 习题完整性 + 代码题判题（真的跑一遍）。

用法:
    python3 tools/check-lesson.py lessons/0007-monte-carlo.html
    python3 tools/check-lesson.py lessons/*.html        # 批量
    python3 tools/check-lesson.py --no-exec lessons/*.html   # 只查结构，不跑代码

判定规则（来自 COURSE-SPEC.md）:
    - solution + tests 必须通过（连跑 3 次都通过，以排除随机性）
    - starter  + tests 必须失败（否则这题没有意义）
"""
import io
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _textutil import protect_math
import re
import sys
import json
import signal
import contextlib
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# 主线（数学原理课）与进阶篇（原课程存档）各自有自己的 manifest，
# 检查时按文件所在目录选择，避免用错目录的编号表。
MANIFESTS = {
    "lessons": os.path.join(ROOT, "lessons", "manifest.json"),
    "advanced": os.path.join(ROOT, "advanced", "manifest.json"),
}
MANIFEST = MANIFESTS["lessons"]


def pick_manifest(path):
    """按文件路径选 manifest：advanced/ 下的用 advanced 的，其余用主线的。"""
    ap = os.path.abspath(path)
    for key, mf in MANIFESTS.items():
        if os.sep + key + os.sep in ap:
            if os.path.exists(mf):
                with io.open(mf, encoding="utf-8") as f:
                    return json.load(f)
            return None
    if os.path.exists(MANIFEST):
        with io.open(MANIFEST, encoding="utf-8") as f:
            return json.load(f)
    return None
TIMEOUT = 25  # 秒/次判题

OK, WARN, ERR = "ok", "warn", "err"


class Report:
    def __init__(self, path):
        self.path = path
        self.items = []

    def add(self, level, msg):
        self.items.append((level, msg))

    def error(self, msg):
        self.add(ERR, msg)

    def warn(self, msg):
        self.add(WARN, msg)

    def ok(self, msg):
        self.add(OK, msg)

    @property
    def errors(self):
        return [m for lv, m in self.items if lv == ERR]

    @property
    def warns(self):
        return [m for lv, m in self.items if lv == WARN]

    def dump(self, verbose=True):
        name = os.path.relpath(self.path, ROOT)
        if self.errors:
            head = "FAIL"
        elif self.warns:
            head = "WARN"
        else:
            head = " OK "
        print("[%s] %s" % (head, name))
        if verbose:
            for lv, m in self.items:
                if lv == OK and not verbose:
                    continue
                mark = {OK: "  ·", WARN: "  !", ERR: "  x"}[lv]
                print("%s %s" % (mark, m))


# ---------------------------------------------------------------- 工具

def strip_scripts(html):
    """把 script 块换成同长度的空白，避免正文命中代码里的东西。"""
    out = list(html)
    for m in re.finditer(r"<script\b[^>]*>.*?</script>", html, re.S | re.I):
        for i in range(m.start(), m.end()):
            out[i] = " "
    return "".join(out)


def text_of(fragment):
    # 同上：数学里的裸 < 不能被当成标签开头
    t = re.sub(r"<[^>]*>", " ", protect_math(fragment)).replace("\x01", "<")
    t = re.sub(r"&[a-zA-Z#0-9]+;", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def extract_balanced_div(html, start):
    """从 start 处的 <div 开始，返回到与之匹配的 </div> 为止的子串。"""
    depth = 0
    for m in re.finditer(r"<div\b|</div\s*>", html[start:], re.I):
        if m.group(0).lower().startswith("</"):
            depth -= 1
            if depth == 0:
                return html[start:start + m.end()]
        else:
            depth += 1
    return html[start:]


def divs_with_class(html, token):
    """返回 class 属性中恰好含有该 class token 的 <div> 起始位置。"""
    out = []
    for m in re.finditer(r'<div\b[^>]*\bclass="([^"]*)"[^>]*>', html, re.I):
        if token in m.group(1).split():
            out.append(m.start())
    return out


def visible_len(html):
    body = re.search(r"<article\b.*?</article>", html, re.S | re.I)
    frag = body.group(0) if body else html
    # 先保护 $...$ 里的裸 <：否则 <\infty 这类写法会被当成标签开头，
    # 一路吞到下一个 >，把中间的正文删掉（实测全课程丢过 5000+ 字，
    # 导致字数闸门长期低报）。
    frag = protect_math(frag)
    frag = re.sub(r"<script\b[^>]*>.*?</script>", " ", frag, flags=re.S | re.I)
    frag = re.sub(r"<section\b[^>]*class=\"[^\"]*exercises[^\"]*\"[^>]*>.*?</section>", " ", frag,
                  flags=re.S | re.I)
    frag = re.sub(r"<(header|footer)\b.*?</\1>", " ", frag, flags=re.S | re.I)
    return len(text_of(frag))


# ---------------------------------------------------------------- 结构

REF_MARK = [False]


def check_structure(html, rep, manifest):
    art = re.search(r"<article\b([^>]*)>", html, re.I)
    if not art:
        rep.error("缺少 <article class=\"lesson\">")
        return None
    attrs = art.group(1)

    # 没有 data-number 的页面按「参考文档」处理：只查通用项，不要求课程页结构
    if 'data-number' not in attrs:
        rep.ok("参考文档（不要求课程页结构：选择题/代码题/lesson.js）")
        REF_MARK[0] = True
        if 'assets/course.css' not in html:
            rep.error("没有链接 assets/course.css")
        if 'reference/' not in rep.path and os.path.basename(os.path.dirname(rep.path)) == 'reference':
            pass
        for m in re.finditer(r'<(script|img|iframe|link)\b[^>]*?(?:src|href)="(https?://[^"]+)"', html, re.I):
            rep.error("存在外部资源依赖：%s" % m.group(2))
        n = visible_len(html)
        if n < 300:
            rep.warn("内容偏少（约 %d 字）" % n)
        return None
    num = re.search(r'data-number="([^"]*)"', attrs)
    slug = re.search(r'data-slug="([^"]*)"', attrs)
    part = re.search(r'data-part="([^"]*)"', attrs)
    num = num.group(1) if num else None
    slug = slug.group(1) if slug else None
    part = part.group(1) if part else None

    if not num:
        rep.error("article 缺少 data-number")
    if not slug:
        rep.error("article 缺少 data-slug")
    if not part:
        rep.error("article 缺少 data-part")

    base = os.path.basename(rep.path)
    if num and not base.startswith(num + "-"):
        rep.error("文件名 %s 与 data-number=%s 不一致" % (base, num))
    if num and slug and base != "%s-%s.html" % (num, slug):
        rep.error("文件名应为 %s-%s.html，实际 %s" % (num, slug, base))

    if manifest and num:
        found = [l for l in manifest["lessons"] if l["number"] == num]
        if not found:
            rep.error("manifest 中没有编号 %s" % num)
        else:
            L = found[0]
            if L["slug"] != slug:
                rep.error("slug 与 manifest 不一致：%s vs %s" % (slug, L["slug"]))
            if L["part"] != part:
                rep.error("part 与 manifest 不一致：%s vs %s" % (part, L["part"]))
            if L["file"] != base:
                rep.error("文件名与 manifest 不一致：%s vs %s" % (base, L["file"]))

    for cls, label in (("lesson-head", "lesson-head"), ("objectives", "objectives"),
                       ("exercises", "exercises"), ("lesson-foot", "lesson-foot"),
                       ("primary-source", "primary-source"), ("ask", "ask 提醒")):
        if 'class="%s' % cls not in html and "class=\"%s" % cls not in html:
            if cls not in html:
                rep.error("缺少 .%s（%s）" % (cls, label))

    if 'assets/course.css' not in html:
        rep.error("没有链接 assets/course.css")
    if 'assets/lesson.js' not in html:
        rep.error("没有引入 assets/lesson.js")

    # 外部网络依赖
    for m in re.finditer(r'<(script|img|iframe|link)\b[^>]*?(?:src|href)="(https?://[^"]+)"', html, re.I):
        rep.error("存在外部资源依赖：%s" % m.group(2))

    # 正文长度。数学课要完整写证明，篇幅天然比白话课长，
    # 因此主线（data-kind="math"）用更宽的上限。
    n = visible_len(html)
    is_math = re.search(r'data-kind="math"', html) is not None
    # 数学课上限：原为 7600。像 0011（压缩映射定理）这类理论核心课要放
    # 巴拿赫不动点定理的完整证明（存在性/唯一性/速度/事后估计四条），
    # 实测 8379 字且内容密度很高（5 个证明块、6 张图、7 个注记）。
    # 删证明步骤或砍插图都会违背「真的讲数学与证明」的目标，
    # 因此把数学课上限上调到 8800，而不是削内容。
    # 数学课上限：7600 → 8800 → 9600。
    # 上调的直接原因是修好了「数学里的裸 < 被当成标签、静默吞掉正文」这个 bug：
    # 修正后 0011（压缩映射）实测 9187 字、0018（Dvoretzky）9095 字，
    # 此前被低报了 800+ 字才显得没超。
    # 这两课恰好是全书证明最重的理论核心（巴拿赫不动点定理、Dvoretzky 定理），
    # 目标明确要求「真的讲数学与证明」，删证明步骤不是可选项。故定为 9600。
    hi = 9600 if is_math else 4600
    if n < 700:
        rep.warn("正文可见字数偏少（约 %d 字）" % n)
    elif n > hi:
        # 白话课阈值原为 3600，因「零基础改写」要求每个概念首次出现都给白话，
        # 每课要加 40–60 处解释，长度必然上升（实测 3000–4100 字），故上调到 4600。
        # 数学课再放宽到 7600：定义、定理、证明、例子四类内容都要占篇幅。
        rep.warn("正文可见字数偏多（约 %d 字），建议上限 %d（%s）"
                 % (n, hi, "数学课" if is_math else "白话课"))

    return num


# ---------------------------------------------------------------- 选择题

MATH_MCQ_COUNT = 10      # 主线数学课每课固定 10 道选择题


def check_math_extras(html, rep):
    """数学课专属检查：KaTeX 引入、公式定界符配平、无残留未渲染标记。"""
    if 'assets/katex/katex.min.css' not in html:
        rep.error("数学课没有引入 assets/katex/katex.min.css")
    if 'assets/math.js' not in html:
        rep.error("数学课没有引入 assets/math.js（公式不会被渲染）")
    # $$ 成对、$ 成对
    n_disp = html.count('$$')
    if n_disp % 2:
        rep.error("块级公式定界符 $$ 数量为奇数（%d），有未闭合的公式" % n_disp)
    body = re.sub(r'<script\b[^>]*>.*?</script>', ' ', html, flags=re.S | re.I)
    body = re.sub(r'<style\b[^>]*>.*?</style>', ' ', body, flags=re.S | re.I)
    stripped = body.replace('$$', '')
    n_inline = stripped.count('$')
    if n_inline % 2:
        rep.error("行内公式定界符 $ 数量为奇数（%d），有未闭合的公式" % n_inline)
    if not re.search(r'class="(def|thm|proof|eg)"', html):
        rep.warn("没有出现定义/定理/证明/例子框之一，数学课通常需要它们")

    # 插图检查。SVG <text> 里写 $...$ 是静默失效的：KaTeX 的 auto-render
    # 无法把 HTML 标签塞进 SVG 文本节点，公式会被吃掉或留成半截文字。
    # 这个坑必须堵住，否则每课都会悄悄出错。
    figs = re.findall(r'<figure class="fig">.*?</figure>', html, re.S)
    for fi, fig in enumerate(figs, 1):
        if 'figcaption' not in fig:
            rep.error("第 %d 张插图缺少 <figcaption>" % fi)
        # 只查 <svg> 内部：题注（figcaption）是 HTML，用 $...$ 是合法的，
        # 而 SVG 的 <text> 里写 $...$ 会被 KaTeX 静默吃掉。
        svg = re.search(r'<svg\b.*?</svg>', fig, re.S)
        if svg and '$' in svg.group(0):
            rep.error("第 %d 张插图的 <svg> 里出现了 $（SVG 文本不支持 KaTeX，请改用 Unicode 符号）" % fi)
        if 'viewBox' not in fig:
            rep.error("第 %d 张插图缺少 viewBox（无法自适应缩放）" % fi)
        if 'role="img"' not in fig or 'aria-label' not in fig:
            rep.warn("第 %d 张插图缺少 role=\"img\" 或 aria-label（无障碍）" % fi)
    if figs:
        nums = re.findall(r'fig-num">图\s*([\d.]+)<', html)
        if len(nums) != len(figs):
            rep.warn("插图 %d 张，但编号只找到 %d 个" % (len(figs), len(nums)))
        else:
            # 编号应按出现顺序递增（图 1.1、1.2、…）
            keys = [tuple(int(x) for x in n.split('.')) for n in nums]
            if keys != sorted(keys):
                rep.warn("插图编号顺序不对：%s" % "、".join(nums))
        rep.ok("插图 %d 张（编号 %s）" % (len(figs), "、".join(nums)))


def check_mcq(html, rep):
    idxs = divs_with_class(html, "mcq")
    if not idxs:
        rep.error("没有找到任何选择题（.mcq）")
        return []
    answers = []
    from collections import Counter
    for i, start in enumerate(idxs):
        chunk = extract_balanced_div(html, start)
        qno = i + 1
        tag = re.search(r'data-answer="(\d+)"', chunk[:400])
        if not tag:
            rep.error("选择题 %d 缺少 data-answer" % qno)
            continue
        a = int(tag.group(1))
        answers.append(a)

        opts = re.findall(r"<li\b[^>]*>(.*?)</li>", chunk, re.S)
        opts = [o for o in opts if text_of(o)]
        if len(opts) != 4:
            rep.error("选择题 %d 有 %d 个选项（应为 4）" % (qno, len(opts)))
        if not (0 <= a <= 3):
            rep.error("选择题 %d 的 data-answer=%d 越界" % (qno, a))
        elif a >= len(opts):
            rep.error("选择题 %d 的 data-answer=%d 指向不存在的选项" % (qno, a))

        if "mcq-explain" not in chunk:
            rep.error("选择题 %d 缺少 mcq-explain" % qno)

        lens = [len(text_of(o)) for o in opts]
        if len(lens) >= 2 and min(lens) > 0:
            ratio = max(lens) / max(1, min(lens))
            if ratio > 2.2:
                rep.warn("选择题 %d 选项长度差异过大（%s），正确答案可能靠长度露馅"
                         % (qno, " / ".join(str(x) for x in lens)))

    if answers:
        c = Counter(answers)
        # 原判据是 max(counts) >= 3。10 道题分 4 个位置时必然有位置 >= 3
        # （10/4 = 2.5），数学课会永远报警。改成判断「是否明显偏斜」：
        # 位置覆盖不全，或最多与最少相差 2 及以上。
        if len(answers) >= 4:
            counts = [c.get(i, 0) for i in range(4)]
            if min(counts) == 0 or max(counts) - min(counts) >= 2:
                rep.warn("正确项位置分布不均：%s" % dict(sorted(c.items())))
    rep.ok("选择题 %d 道" % len(idxs))
    return answers


# ---------------------------------------------------------------- 代码题

SCRIPT_RE = re.compile(
    r'<script\b[^>]*type="text/x-python"[^>]*data-role="(starter|tests|solution)"[^>]*>(.*?)</script>',
    re.S | re.I)


def check_code_structure(html, rep):
    codes = []
    for start in divs_with_class(html, "code-ex"):
        m = re.search(r'data-code="([^"]+)"', html[start:start + 400])
        codes.append((start, m.group(1) if m else None))

    if not codes:
        # 数学课没有代码题是正常的；非数学课由 check_code_structure 之外的分支兜底
        return []

    for pos, cid in codes:
        if not cid:
            rep.error("有一个 .code-ex 缺少 data-code 属性")
    blocks = []
    for pos, cid in codes:
        if not cid:
            continue
        chunk = extract_balanced_div(html, pos)
        scripts = {}
        for m in SCRIPT_RE.finditer(chunk):
            scripts[m.group(1)] = m.group(2)
        missing = [r for r in ("starter", "tests", "solution") if r not in scripts]
        if missing:
            rep.error("代码题 %s 缺少：%s" % (cid, "、".join(missing)))
            continue
        for role, body in scripts.items():
            if "</script" in body.lower():
                rep.error("代码题 %s 的 %s 里出现了 </script>" % (cid, role))
        blocks.append((cid, scripts))
    rep.ok("代码题 %d 道" % len(codes))
    return blocks


# ---------------------------------------------------------------- 判题

class Timeout(Exception):
    pass


def _alarm(signum, frame):
    raise Timeout()


def run_case(user_code, tests, with_check=True):
    ns = {"__name__": "__main__"}
    try:
        import numpy as np
        ns["np"] = np
    except Exception:
        pass

    def check(cond, msg="断言不成立"):
        if not cond:
            raise AssertionError(msg)

    ns["check"] = check
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(user_code, "<你的代码>", "exec"), ns)
            exec(compile(tests, "<测试>", "exec"), ns)
        return True, ""
    except Timeout:
        return False, "超时（>%ds）" % TIMEOUT
    except AssertionError as e:
        return False, "AssertionError: %s" % (e,)
    except Exception as e:
        return False, "%s: %s" % (type(e).__name__, e)


def exec_blocks(blocks, rep, runs=3):
    has_alarm = hasattr(signal, "SIGALRM")
    if has_alarm:
        signal.signal(signal.SIGALRM, _alarm)

    for cid, scripts in blocks:
        starter, tests, solution = scripts["starter"], scripts["tests"], scripts["solution"]

        # 1) starter 应当是合法 Python（语法层面），且必须让测试失败
        try:
            compile(starter, "<starter>", "exec")
        except SyntaxError as e:
            rep.error("%s 的 starter 有语法错误：第 %s 行 %s" % (cid, e.lineno, e.msg))
            continue
        try:
            compile(tests, "<tests>", "exec")
        except SyntaxError as e:
            rep.error("%s 的 tests 有语法错误：第 %s 行 %s" % (cid, e.lineno, e.msg))
            continue
        try:
            compile(solution, "<solution>", "exec")
        except SyntaxError as e:
            rep.error("%s 的 solution 有语法错误：第 %s 行 %s" % (cid, e.lineno, e.msg))
            continue

        if has_alarm:
            signal.alarm(TIMEOUT)
        try:
            s_ok, s_err = run_case(starter, tests)
        finally:
            if has_alarm:
                signal.alarm(0)

        if s_ok:
            rep.error("%s：starter 竟然通过了测试 —— 这题没有意义，测试太弱" % cid)

        # 2) solution 必须稳定通过（连跑 runs 次）
        fails = []
        for k in range(runs):
            if has_alarm:
                signal.alarm(TIMEOUT)
            try:
                ok, err = run_case(solution, tests)
            finally:
                if has_alarm:
                    signal.alarm(0)
            if not ok:
                fails.append("第 %d 次: %s" % (k + 1, err))
        if fails:
            rep.error("%s：solution 未通过测试 -> %s" % (cid, "；".join(fails[:2])))
        else:
            rep.ok("%s：starter 失败、solution 连续 %d 次通过" % (cid, runs))


# ---------------------------------------------------------------- main

def check_file(path, manifest, do_exec=True, verbose=True):
    with io.open(path, encoding="utf-8") as f:
        html = f.read()
    rep = Report(path)
    REF_MARK[0] = False
    num = check_structure(html, rep, manifest)
    if not REF_MARK[0]:
        check_mcq(html, rep)
        is_math = re.search(r'data-kind="math"', html) is not None
        if is_math:
            check_math_extras(html, rep)
            n = len(divs_with_class(html, "mcq"))
            if n != MATH_MCQ_COUNT:
                rep.error("数学课应有 %d 道选择题，实际 %d 道" % (MATH_MCQ_COUNT, n))
        else:
            blocks = check_code_structure(html, rep)
            if do_exec and blocks:
                exec_blocks(blocks, rep)
    rep.dump(verbose)
    return rep


def main():
    args = [a for a in sys.argv[1:]]
    do_exec = True
    verbose = True
    if "--no-exec" in args:
        do_exec = False
        args.remove("--no-exec")
    if "--quiet" in args:
        verbose = False
        args.remove("--quiet")
    if not args:
        print(__doc__)
        return 2

    reps = [check_file(p, pick_manifest(p), do_exec, verbose) for p in args]
    n_err = sum(len(r.errors) for r in reps)
    n_warn = sum(len(r.warns) for r in reps)
    print("\n" + "=" * 64)
    print("检查 %d 个文件：%d 个错误，%d 个警告" % (len(reps), n_err, n_warn))
    bad = [r for r in reps if r.errors]
    if bad:
        print("有错误的文件：")
        for r in bad:
            print("  - %s (%d)" % (os.path.relpath(r.path, ROOT), len(r.errors)))
    print("=" * 64)
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main())
