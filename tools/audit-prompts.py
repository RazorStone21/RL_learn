#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""审查代码题题干是否说清楚了「要做什么」。

判据（机械可查的）：
  1. 题干是否提到 starter 里的**函数名**？不提，读者不知道要写哪个函数。
  2. 是否覆盖 starter 的**参数名**？不提，读者不知道参数是什么。
  3. 是否说明**返回什么**（返回/return/给出/输出）？
  4. 是否说明**类型或形状**（数组/长度/float/int/bool/列表/形状）？
  5. 题干是否过短（< 120 字）？
  6. 是否提到**边界/特例**（空、0、终止、全零…）？

用法:
    python3 tools/audit-prompts.py                # 全部课程页汇总
    python3 tools/audit-prompts.py --json
    python3 tools/audit-prompts.py lessons/0013-dqn.html   # 单课明细
"""
import glob, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE_EX = re.compile(r'<div\b[^>]*class="[^"]*\bcode-ex\b[^"]*"[^>]*data-code="([^"]+)"[^>]*>(.*?)(?=<div\b[^>]*class="[^"]*\bcode-ex\b|</section>)', re.S | re.I)
SCRIPT = re.compile(r'<script\b[^>]*type="text/x-python"[^>]*data-role="(starter|tests|solution)"[^>]*>(.*?)</script>', re.S | re.I)
DEF = re.compile(r'^\s*def\s+(\w+)\s*\(([^)]*)\)', re.M)
RETURN_HINT = re.compile(r'返回|return|给出|输出|算出|得到')
TYPE_HINT = re.compile(r'形状|shape|数组|长度|float|int|bool|布尔|列表|list|整数|浮点|标量|元组|tuple|字典|dict|numpy|np\.')
EDGE_HINT = re.compile(r'空|边界|特例|为 0|等于 0|= 0|终止|全零|None|不合法|越界')



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



# tests 里被调用的、非内置的名字 = 真正被判分的函数。
# 题干必须把这些名字都写出来，否则读者不知道该实现哪个。
BUILTIN = {
    'len','range','abs','min','max','sum','sorted','list','dict','set','tuple','float','int',
    'bool','str','enumerate','zip','print','isinstance','round','all','any','map','filter',
    'check','np','numpy','type','reversed','divmod','pow','format','repr','Exception',
    'AssertionError','ValueError','math','itertools','copy','deepcopy','defaultdict','Counter',
    'array','zeros','ones','arange','linspace','asarray','array_equal','allclose','shape',
}
CALL = re.compile(r'\b([a-z_][a-z0-9_]*)\s*\(')


def test_functions(tests_src):
    """从 tests 里提取被判分的函数名（排除内置与 numpy 调用）。"""
    out = []
    for m in CALL.finditer(tests_src):
        name = m.group(1)
        if name in BUILTIN:
            continue
        # 排除 numpy 方法调用（前面紧跟点号）与已定义的局部变量
        pre = tests_src[:m.start()].rstrip()
        if pre.endswith('.') or pre.endswith('def '):
            continue
        if name not in out:
            out.append(name)
    return out

def audit_file(path):
    html = io.open(path, encoding='utf-8').read()
    out = []
    for m in CODE_EX.finditer(html):
        cid, chunk = m.group(1), m.group(2)
        h3 = re.search(r'<h3[^>]*>(.*?)</h3>', chunk, re.S)
        pr = prompt_html(chunk)
        title = text_of(h3.group(1)) if h3 else ''
        prompt = text_of(pr) if pr else ''
        roles = {mm.group(1): mm.group(2) for mm in SCRIPT.finditer(chunk)}
        starter = roles.get('starter', '')
        tests = roles.get('tests', '')
        defs = DEF.findall(starter)
        fnames = [d[0] for d in defs]
        # 只检查「要你实现」的函数的参数：starter 里可能还放着已给出的辅助函数
        # （题干会写「已在 starter 里给出，不用你写」），那种函数的参数不该被要求。
        mreq = re.search(r'请实现(.*?)。', prompt, re.S)
        implement = set()
        for fn in (d[0] for d in defs):
            if fn in (mreq.group(1) if mreq else ''):
                implement.add(fn)
        if not implement:
            implement = set(d[0] for d in defs)

        params = []
        for fname, ps in defs:
            if fname not in implement:
                continue
            for p in ps.split(','):
                p = p.strip().split('=')[0].strip()
                if p and p not in ('self',):
                    params.append(p)

        flags = []
        if fnames and not any(f in prompt for f in fnames):
            flags.append('未提函数名(%s)' % '、'.join(fnames))
        # 交叉校验：tests 实际调用的函数，题干是否都提到
        tfuncs = [f for f in test_functions(tests) if f in [d[0] for d in defs]]
        tmiss = [f for f in tfuncs if f not in prompt]
        if tmiss:
            flags.append('测试调用但题干未提(%s)' % '、'.join(tmiss))

        missing = [p for p in params if p not in prompt]
        if params and len(missing) > len(params) / 2:
            flags.append('未提参数(%s)' % '、'.join(missing[:5]))

        # 「分别介绍输入、输出」——参数必须出现在「输入」节里，只出现在题干别处不算。
        # 必须按**标记**切分：背景段常常自己写「输入是…，输出是…」，
        # 若按裸词找「输入」，会把背景那句话当成输入节，造成大批假警报。
        mi = re.search(r'cp-sub"[^>]*>\s*输入(.*?)(?=cp-sub"[^>]*>\s*输出|cp-note|\Z)', pr or '', re.S)
        mo = re.search(r'cp-sub"[^>]*>\s*输出(.*?)(?=cp-note|\Z)', pr or '', re.S)
        in_sec = text_of(mi.group(1)) if mi else ''
        out_sec = text_of(mo.group(1)) if mo else ''
        off_in = [p for p in params if p not in in_sec]
        if in_sec and off_in:
            flags.append('参数不在「输入」节(%s)' % '、'.join(off_in[:5]))
        # 允许两种写法：含「返回/输出/给出」，或者用「名称：类型说明」逐项列出返回值
        if out_sec and not (re.search(r'返回|输出|给出', out_sec)
                            or re.search(r'[\w\u4e00-\u9fff]\s*[:：]', out_sec)):
            flags.append('「输出」节未说明返回什么')
        # §14 四段结构。
        # 必须按**真实标记**判定，不能按裸词：散文里出现「输入」「输出」二字
        # 不代表真有那两节（如「你把输入喂进去，它输出一个数」会被误判为合格）。
        raw = pr or ''
        if not re.search(r'cp-label"[^>]*>\s*背景', raw):
            flags.append('缺背景段')
        if not re.search(r'cp-sub"[^>]*>\s*输入', raw):
            flags.append('缺输入节')
        if not re.search(r'cp-sub"[^>]*>\s*输出', raw):
            flags.append('缺输出节')
        if not re.search(r'(会被检验|测试会检查|测试会验证|会被验证)', prompt):
            flags.append('缺会被检验段')
        if '<strong' in (pr or ''):
            flags.append('用了<strong>（应用 .cp-label/.cp-sub）')

        if not RETURN_HINT.search(prompt):
            flags.append('无返回说明')
        if not TYPE_HINT.search(prompt):
            flags.append('无类型/形状说明')
        if len(prompt) < 300:
            flags.append('题干过短(%d字，四段结构至少 300)' % len(prompt))
        if len(prompt) > 1300:
            flags.append('题干过长(%d字，疑写入正文)' % len(prompt))
        # 边界提示单独记录：并非每题都有边界情形，不作为「不合格」判据
        edge = bool(EDGE_HINT.search(prompt))

        out.append({
            'file': os.path.relpath(path, ROOT), 'id': cid, 'title': title,
            'prompt': prompt, 'fnames': fnames, 'params': params,
            'prompt_len': len(prompt), 'flags': flags, 'nflags': len(flags),
            'edge_hint': edge, 'test_funcs': tfuncs,
        })
    return out


def main():
    args = [a for a in sys.argv[1:]]
    as_json = '--json' in args
    check = '--check' in args
    if as_json:
        args.remove('--json')
    if check:
        args.remove('--check')
    files = args or sorted(f for f in (glob.glob(os.path.join(ROOT, 'lessons', '[0-9]*.html')) +
                           glob.glob(os.path.join(ROOT, 'advanced', '[A-Z]*.html')))
                           if '/._' not in f)
    rows = []
    for f in files:
        rows.extend(audit_file(f))

    if as_json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0

    if len(files) == 1:
        for r in rows:
            print("── %s  %s" % (r['id'], r['title']))
            print("   函数: %s   参数: %s" % ("、".join(r['fnames']) or '（无）', "、".join(r['params']) or '（无）'))
            print("   题干(%d字): %s" % (r['prompt_len'], r['prompt'][:300]))
            print("   问题: %s" % ("；".join(r['flags']) if r['flags'] else '无明显问题'))
            print()
        return 0

    rows.sort(key=lambda r: -r['nflags'])
    print("%-42s %-14s %5s %5s  %s" % ("文件", "题号", "字数", "问题数", "主要问题"))
    print("-" * 110)
    for r in rows:
        print("%-42s %-14s %5d %5d  %s"
              % (r['file'].replace('lessons/', ''), r['id'], r['prompt_len'], r['nflags'],
                 "；".join(r['flags'])[:60]))
    print("-" * 110)
    n = len(rows)
    clean = sum(1 for r in rows if not r['flags'])
    print("共 %d 道代码题；无明显问题 %d 道，有问题 %d 道" % (n, clean, n - clean))
    ne = sum(1 for r in rows if not r.get('edge_hint'))
    print("（另有 %d 道未提边界情形 —— 仅供提示，不算不合格）" % ne)
    from collections import Counter
    c = Counter()
    for r in rows:
        for f in r['flags']:
            c[re.sub(r'\(.*', '', f)] += 1
    print("\n问题分布：")
    for k, v in c.most_common():
        print("   %-16s %d 道" % (k, v))
    if check and (n - clean):
        print("\n有 %d 道代码题题干不合格，验收不通过。" % (n - clean))
        return 1
    if check:
        print("\n全部代码题题干合格。")
    return 0


if __name__ == '__main__':
    sys.exit(main())
