#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""审计「缩写与符号是否在每课首次出现处给出解释」。

判定口径（重要）：
  - 公式块 <div class="eq">…</div> 内部是红线，不能塞解释。所以「首次出现」
    指的是**正文中的首次出现**；只在公式里用到的符号，必须有「式中 …」这类
    正文说明，否则也算未解释。
  - 页脚「问你的 AI 老师」是固定提醒，不算正文，其中的 AI 不要求解释。
  - 术语若已被 <span class="term"> 定义过，视为已解释。

用法:
    python3 tools/audit-terms.py                     # 全课程汇总
    python3 tools/audit-terms.py lessons/0013-dqn.html   # 单课明细（给改稿用）
    python3 tools/audit-terms.py --json
"""
import glob, io, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _textutil import protect_math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STOP = {
    'HTML','CSS','JS','JSON','URL','PDF','API','GPU','CPU','HTTP','ID','OK','TODO',
    'A','B','C','D','E','I','V','Q','S','R','N','K','T','X','Y','Z','P','M','U','W',
    'AND','OR','NOT','II','III','IV','VI',
    'OpenAI','PyTorch','TensorFlow','Keras','Gym','Gymnasium','arXiv','GitHub',
    'CS234','CS188','CS285','XX','TZ','RMSProp','LaTeX','NumPy','SciPy','Pandas',
    'ReplayBuffer','DQNReplay','Adam','SGD','YAML','WSL',
    # 系统名 / 会议名：是专名，不需要展开
    'AlphaGo','AlphaZero','AlphaStar','MuJoCo','NeurIPS','ICML','ICLR','NIPS',
}

ACRO = re.compile(r'\b(?:[A-Z][A-Z0-9]{1,7}|[A-Z][a-z]+[A-Z][A-Za-z]*|\d?[A-Z]{1,4}\d{1,3})\b')
# 「单字母+数字」既可能是真缩写（C51），也可能只是带下标的数学变量（R1、Q2、V1）。
# 变量不该被要求"展开"，所以除白名单外一律跳过。
LETTER_DIGIT = re.compile(r'^[A-Z]\d{1,3}$')
LETTER_DIGIT_ALLOW = {'C51'}
GREEK = re.compile(r'[αβγδεζηθικλμνξπρστυφχψω]')
# 允许短下标再跟释义：δt（TD 误差）、rt（…）、At（…）
GLOSS_AFTER = re.compile(r'^\s*[A-Za-z0-9]{0,3}\s*[（(]')
# 「式中 γ 是折扣因子」这种同位语说明同样是合格解释
# 允许「术语 + 短中文类别词 + 逗号 + 解释」：如「RMS 误差，意思是把……」
GLOSS_DEF = re.compile(r'^\s*[A-Za-z0-9]{0,3}[\u4e00-\u9fff]{0,4}\s*[，,、]?\s*(?:意思?是|就是|指的是|是指|是|为|表示|记作|指|即|也就是)')
EQ_BLOCK = re.compile(r'<div class="eq">.*?</div>', re.S)
ASK_BLOCK = re.compile(r'<p class="ask">.*?</p>', re.S)
TERM_SPAN = re.compile(r'<span class="term">(.*?)</span>', re.S)


# 行内标签：去掉后**不插分隔符**。否则 <var>ε</var>（探索率）会被拆成 ε\x00（探索率），
# 紧邻判定失效，逼得作者把中文释义塞进 <var> 里（渲染成斜体），那是工具在逼人写坏排版。
INLINE = ('var', 'code', 'sub', 'sup', 'em', 'strong', 'b', 'i', 'u', 's', 'span',
          'a', 'abbr', 'small', 'mark', 'cite', 'q', 'kbd', 'samp', 'time', 'wbr')



# 形如 A<sub>T</sub>、ε<sub>p</sub>、R<sub>1</sub> 的「基字符 + 下标」在去标签后会粘成
# AT / εp / R1，被误当成缩写或符号要求「解释」。这类是数学变量的下标，不是缩写。
SUB_FUSE = re.compile(r'([A-Za-z\u0370-\u03ff])<su[bp]>(.*?)</su[bp]>', re.S | re.I)


def fused_subscript_tokens(html):
    """找出所有「基字符+下标」粘合后的 token（下标里的标签先剥掉）。"""
    out = set()
    for m in SUB_FUSE.finditer(html):
        base = m.group(1)
        sub = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        if not sub:
            continue
        out.add(base + sub)
        out.add((base + sub).upper())
    return out

def to_text(fragment):
    """把一段 HTML 变成纯文本：行内标签直接去掉，块级标签换成占位符。"""
    # 先保护 $...$ 里的裸 <，否则会被当成标签开头吞掉正文（详见 tools/_textutil.py）
    fragment = protect_math(fragment)
    s = re.sub(r'<script\b[^>]*>.*?</script>', ' ', fragment, flags=re.S | re.I)
    # 插图里的 SVG 文本是图形标签，不是正文散文（解释写在 figcaption，那部分照常被扫）
    s = re.sub(r'<svg\b[^>]*>.*?</svg>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<style\b[^>]*>.*?</style>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'</?(?:%s)\b[^>]*>' % '|'.join(INLINE), '', s, flags=re.I)
    s = re.sub(r'<[^>]*>', '\x00', s).replace('\x01', '<')
    s = re.sub(r'&[a-zA-Z#0-9]+;', ' ', s)
    return s


def build(html):
    """返回 (全文文本, 去掉公式块后的正文文本, 已定义的术语集合)"""
    body = ASK_BLOCK.sub(' ', html)
    # 课名与页眉也是「名字」：`0006 · 把你的工作问题建模成 MDP` 里出现 MDP，
    # 不代表讲解过，而课名里塞不进括注。这与 audit-jargon.py 的口径保持一致。
    body = re.sub(r'<title\b[^>]*>.*?</title>', ' ', body, flags=re.S | re.I)
    body = re.sub(r'<p\b[^>]*class="[^"]*\beyebrow\b[^"]*"[^>]*>.*?</p>', ' ', body, flags=re.S | re.I)
    body = re.sub(r'<h[1-6]\b[^>]*>.*?</h[1-6]>', ' ', body, flags=re.S | re.I)
    full = to_text(body)
    prose = to_text(EQ_BLOCK.sub(' \x00 ', body))
    defined = set(re.sub(r'<[^>]+>', '', m.group(1)).strip() for m in TERM_SPAN.finditer(html))
    return full, prose, defined


def first_pos(text, token):
    i = text.find(token)
    return i


def has_gloss(text, pos, token):
    """判断 token 在 pos 处是否**紧邻**一个释义。

    曾经写成「±60 字内出现任意（…）」，结果 0001 的裸 γ 被上一行无关的
    「折扣回报（discounted return）」蒙混过关 —— 那是个假合格。现在只认四种紧邻形态：
      A. 缩写（全称…）        → 尾巴以（开头
      B. 式中 γ 是折扣因子     → 尾巴以 是/为/表示/记作/指/即 开头
      C. 中文（ABBR）         → 符号紧跟在左括号后
      D. vπ、qπ（π 是策略）    → 近处有以该符号开头的释义括注
    """
    tail = text[pos + len(token): pos + len(token) + 70]
    if GLOSS_AFTER.match(tail):                      # A
        return True
    if GLOSS_DEF.match(tail):                        # B
        return True
    # B2.「通常写作 α，α 是学习率」——符号重复一遍再解释，也是合格的写法
    if re.match(r'^\s*[，,、：:]\s*' + re.escape(token) + r'\s*(?:是|为|表示|就是|指)', tail):
        return True
    # B3.「为什么不用 α？因为 α 是学习率」——符号在同句稍后再被解释
    # 下标也要能跨过：`更新量是 δt 乘 Et(s,a)，其中 δt 是 TD 误差` 里的 δ 后面跟着 t
    if re.search(r'[^。！？]{0,24}' + re.escape(token) + r'[A-Za-z0-9]{0,3}\s*(?:是|为|表示|就是|指)', tail[:46]):
        return True
    head = text[max(0, pos - 45): pos]
    if re.search(r'(称为|叫做|记为|记作|指的是|是指|全称|即)\s*$', head):
        return True
    if head.endswith('（') or head.endswith('('):     # C
        if '）' in tail[:40] or ')' in tail[:40]:
            return True
    if re.search(r'[（(]\s*' + re.escape(token) + r'\s*[是为，,]', text[pos: pos + 30]):   # D
        return True
    # D3. 术语由紧随其后的等式定义，如「δt = r + γV(s') − V(s)」
    if re.match(r'^[A-Za-z0-9]{0,3}\s*=', tail):
        return True
    # D2. 术语被写在括注内部并被解释，如「折扣因子（就是 γ，取值 0 到 1）」里的 γ
    if re.search(r'[（(][^）)]{0,24}(?:就是|是|为|即|指|写作|记作|读作)[^）)]{0,20}$', head):
        return True
    # E. 中文全称（英文全称，缩写）—— 符号位于括注末尾，如「动态规划（dynamic programming，DP）」
    m = re.search(r'[（(]([^（）()]{2,45})$', head)
    if m and re.match(r'^\s*[）)]', tail) and re.search(r'[，,]', m.group(1)):
        return True
    return False


def audit(path):
    if os.sep + 'reference' + os.sep in os.path.abspath(path):
        return audit_reference(path)
    html = io.open(path, encoding='utf-8').read()
    full, prose, defined = build(html)

    def scan(rx, text, min_len=2, fused=frozenset()):
        first, count = {}, {}
        for m in rx.finditer(text):
            w = m.group(0)
            if w in STOP or len(w) < min_len:
                continue
            if LETTER_DIGIT.match(w) and w not in LETTER_DIGIT_ALLOW:
                continue
            if w in fused:
                continue
            count[w] = count.get(w, 0) + 1
            first.setdefault(w, m.start())
        return first, count

    def in_defined(word):
        return any(word in d for d in defined)

    fused = fused_subscript_tokens(html)
    a_first, a_cnt = scan(ACRO, full, fused=fused)
    bare_acro = {}
    for w, p in a_first.items():
        if in_defined(w) or has_gloss(full, p, w):
            continue
        bare_acro[w] = p

    g_all, _ = scan(GREEK, full, min_len=1, fused=fused)
    g_prose, _ = scan(GREEK, prose, min_len=1, fused=fused)
    bare_greek, only_formula = {}, []
    for w in g_all:
        if in_defined(w):
            continue
        if w in g_prose:
            p = g_prose[w]
            # 正文里要能解释；但「用等式定义符号」也算，例如
            # 「TD 误差（TD 目标减去当前估计）：δt = r + γV(s') − V(s)」——
            # 等式在 prose 里被剥掉了，所以要回头用 full 再判一次。
            if not has_gloss(prose, p, w) and not has_gloss(full, g_all.get(w, p), w):
                bare_greek[w] = p
        else:
            # 只在公式里出现：需要正文有「式中 …」说明
            if not re.search(re.escape(w) + r'[^\n]{0,12}(是|为|表示|记作)', prose):
                only_formula.append(w)

    return {
        'file': os.path.relpath(path, ROOT),
        'acro_total': len(a_first), 'acro_bare': sorted(bare_acro),
        'greek_total': len(g_all), 'greek_bare': sorted(bare_greek),
        'greek_formula_only': sorted(only_formula),
        'acro_cnt': a_cnt,
        'dups': find_duplicate_glosses(html),
    }



# ---------------------------------------------------------------- 参考文档
# 参考文档基本是表格/定义列表：一行就是一条定义（符号 | 读法 | 含义）。
# 用「紧邻释义」去量它会得到 21 处假阳性（连符号表本身都被判为没解释）。
# 所以对 reference/ 下的文档改用**行级**判定：某个 token 只要在
# 「含描述性文字的那一行/那一条」里出现过，就算解释过。
ROW_UNIT = re.compile(r'<tr\b.*?</tr>|<dt\b.*?</dt>\s*(?:<dd\b.*?</dd>)?', re.S | re.I)


def has_description(txt, token):
    rest = txt.replace(token, ' ')
    rest = re.sub(r'\s+', ' ', rest).strip()
    cjk = len(re.findall(r'[\u4e00-\u9fff]', rest))
    latin = len(re.findall(r'[A-Za-z]{4,}', rest))
    return cjk >= 6 or latin >= 1



# 同一处释义被写两遍（如 θ（网络参数）（网络参数））—— 多轮改写叠加时的典型事故
# 两种形态：完全相同，以及第二处是第一处的「加长版」
#   参数 θ（网络参数）（网络参数）
#   TL（transfer learning）（transfer learning，迁移学习）
DUP_GLOSS = re.compile(r'（([^）]{2,60})）（\1(?:[^）]{0,60})）')


def find_duplicate_glosses(html):
    body = re.sub(r'<script\b[^>]*>.*?</script>', ' ', html, flags=re.S | re.I)
    body = re.sub(r'<[^>]+>', '', body)
    out = []
    for m in DUP_GLOSS.finditer(body):
        ctx = re.sub(r'\s+', ' ', body[max(0, m.start() - 40): m.end() + 20]).strip()
        out.append('重复括注：…%s…' % ctx)
    return out

def audit_reference(path):
    html = io.open(path, encoding='utf-8').read()
    body = ASK_BLOCK.sub(' ', html)
    full = to_text(body)
    units = [to_text(u) for u in ROW_UNIT.findall(body)]

    def scan(rx, text, min_len=2, fused=frozenset()):
        first, count = {}, {}
        for m in rx.finditer(text):
            w = m.group(0)
            if w in STOP or len(w) < min_len:
                continue
            if LETTER_DIGIT.match(w) and w not in LETTER_DIGIT_ALLOW:
                continue
            if w in fused:
                continue
            count[w] = count.get(w, 0) + 1
            first.setdefault(w, m.start())
        return first, count

    def explained(token, units_):
        # 该 token 是否至少在一处「有描述」的行里出现过
        for u in units_:
            if token in u and has_description(u, token):
                return True
        return False

    fused = fused_subscript_tokens(html)
    a_first, a_cnt = scan(ACRO, full, fused=fused)
    g_all, _ = scan(GREEK, full, min_len=1, fused=fused)

    bare_acro = [w for w in a_first if not explained(w, units)]
    bare_greek = [w for w in g_all if not explained(w, units)]
    return {
        'file': os.path.relpath(path, ROOT),
        'acro_total': len(a_first), 'acro_bare': sorted(bare_acro),
        'greek_total': len(g_all), 'greek_bare': sorted(bare_greek),
        'greek_formula_only': [], 'acro_cnt': a_cnt,
        'dups': find_duplicate_glosses(html),
    }

def ctx(path, word):
    full, _, _ = build(io.open(path, encoding='utf-8').read())
    i = full.find(word)
    if i < 0:
        return ''
    return full[max(0, i - 55): i + len(word) + 65].replace('\x00', '').replace('\n', ' ')


def main():
    args = [a for a in sys.argv[1:]]
    as_json = '--json' in args
    check = '--check' in args
    if as_json:
        args.remove('--json')
    if check:
        args.remove('--check')
    if args:
        files = args
    else:
        # 默认覆盖 objective 的全部范围：27 课 + 3 份参考文档
        files = sorted(f for f in
                       glob.glob(os.path.join(ROOT, 'lessons', '[0-9]*.html')) +
                       glob.glob(os.path.join(ROOT, 'advanced', '[A-Z]*.html')) +
                       glob.glob(os.path.join(ROOT, 'reference', '*.html'))
                       if '/._' not in f)
    rows = [audit(f) for f in files]

    if as_json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0

    if len(files) == 1:
        r = rows[0]
        print("文件：%s" % r['file'])
        print("\n【缩写】共 %d 个，首次出现没有解释的 %d 个：" % (r['acro_total'], len(r['acro_bare'])))
        for w in r['acro_bare']:
            print("   %-12s …%s…" % (w, ctx(files[0], w)))
        print("\n【希腊符号】正文中有出现但没解释的 %d 个：" % len(r['greek_bare']))
        for w in r['greek_bare']:
            print("   %-4s …%s…" % (w, ctx(files[0], w)))
        print("\n【只出现在公式里、正文缺「式中」说明】%d 个：%s"
              % (len(r['greek_formula_only']), "、".join(r['greek_formula_only']) or "无"))
        return 0

    print("%-42s %8s %8s %8s %8s" % ("文件", "缩写数", "无解释", "符号数", "无解释"))
    print("-" * 78)
    n = 0
    ndup = 0
    for r in rows:
        bad = len(r['acro_bare']) + len(r['greek_bare']) + len(r['greek_formula_only'])
        dup = len(r.get('dups', []))
        ndup += dup
        n += bad + dup
        note = ""
        if bad:
            note += "   <== 待补 %d" % bad
        if dup:
            note += "   <== 重复括注 %d" % dup
        print("%-42s %8d %8d %8d %8d%s"
              % (r['file'].replace('lessons/', ''), r['acro_total'], len(r['acro_bare']),
                 r['greek_total'], len(r['greek_bare']),
                 note if note else "   OK"))
        for d in r.get('dups', []):
            print("        %s" % d)
    print("-" * 78)
    print("合计待补：%d 处（含重复括注 %d 处）" % (n, ndup))
    if check and n:
        print("\n有未解释的缩写/符号，验收不通过。")
        return 1
    if check:
        print("\n所有缩写与符号在每课首次出现处都有解释。")
    return 0


if __name__ == '__main__':
    sys.exit(main())
