#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""文风改写验收报告：对比 docs/style-baseline.txt 与当前实测，并检查硬指标。

用法:
    python3 tools/style-report.py            # 打印前后对比
    python3 tools/style-report.py --check    # 未达标则退出码 1（用于验收）
"""
import io, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(ROOT, 'docs', 'style-baseline.txt')

# 硬指标（口径见 COURSE-SPEC.md 第 11.5 节）
TARGETS = {
    'hit_per_k': 3.0,      # 每千字 AI 味命中
    'dash_per_k': 1.0,     # 每千字破折号
    'bold_per_k': 3.0,     # 每千字加粗
    'cjk_drop': 0.15,      # 汉字数相对基线的最大跌幅
}


def parse_baseline():
    rows = {}
    if not os.path.exists(BASELINE):
        return rows
    for line in io.open(BASELINE, encoding='utf-8'):
        m = re.match(r'^(\S+\.(?:html|md))\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s*$', line.strip())
        if m:
            rows[m.group(1)] = {
                'cjk': int(m.group(2)),
                'hits': int(m.group(3)),
                'per_k': float(m.group(4)),
                'dash_per_k': float(m.group(5)),
            }
    return rows


def current_scan():
    out = subprocess.run(
        [sys.executable, os.path.join(ROOT, 'tools', 'scan-style.py'),
         'lessons', 'advanced', 'reference', 'MISSION.md'],
        capture_output=True, text=True, cwd=ROOT).stdout
    rows = {}
    for line in out.splitlines():
        m = re.match(r'^(\S+\.(?:html|md))\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s*$', line.strip())
        if m:
            rows[m.group(1)] = {
                'cjk': int(m.group(2)), 'hits': int(m.group(3)),
                'per_k': float(m.group(4)), 'dash_per_k': float(m.group(5)),
            }
    return rows, out


def main():
    base = parse_baseline()
    cur, raw = current_scan()

    print("=" * 88)
    print("文风改写验收报告")
    print("=" * 88)
    print("%-38s %16s %16s %10s" % ("文件", "每千字(前→后)", "破折号/千(前→后)", "汉字变化"))
    print("-" * 88)
    worst = []
    for name in sorted(cur, key=lambda n: -cur[n]['per_k']):
        c = cur[name]
        b = base.get(name)
        if b:
            chg = (c['cjk'] - b['cjk']) / b['cjk'] * 100 if b['cjk'] else 0.0
            print("%-38s %6.2f → %-6.2f %6.2f → %-6.2f %+7.1f%%"
                  % (name, b['per_k'], c['per_k'], b['dash_per_k'], c['dash_per_k'], chg))
        else:
            print("%-38s %6s → %-6.2f %6s → %-6.2f %7s"
                  % (name, "—", c['per_k'], "—", c['dash_per_k'], "—"))
        if c['per_k'] > TARGETS['hit_per_k']:
            worst.append((name, '命中', c['per_k'], TARGETS['hit_per_k']))
        if c['dash_per_k'] > TARGETS['dash_per_k']:
            worst.append((name, '破折号', c['dash_per_k'], TARGETS['dash_per_k']))

    # 汇总
    tb = sum(v['cjk'] for v in base.values())
    th = sum(v['hits'] for v in base.values())
    tc = sum(v['cjk'] for v in cur.values())
    thc = sum(v['hits'] for v in cur.values())
    print("-" * 88)
    print("%-38s %6.2f → %-6.2f  (汉字 %d → %d, %+.1f%%)"
          % ("合计 每千字",
             th / tb * 1000 if tb else 0, thc / tc * 1000 if tc else 0,
             tb, tc, (tc - tb) / tb * 100 if tb else 0))
    print()

    # 从原始输出里取全局破折号/加粗
    gd = re.search(r'全局破折号: (\d+) 处（每千字 ([\d.]+)）', raw)
    gb = re.search(r'全局加粗标签: (\d+) 处（每千字 ([\d.]+)）', raw)
    if gd:
        print("全局破折号: %s 处（每千字 %s，目标 ≤ %.1f）"
              % (gd.group(1), gd.group(2), TARGETS['dash_per_k']))
    if gb:
        print("全局加粗  : %s 处（每千字 %s，目标 ≤ %.1f）"
              % (gb.group(1), gb.group(2), TARGETS['bold_per_k']))

    problems = list(worst)
    if gb and float(gb.group(2)) > TARGETS['bold_per_k']:
        problems.append(('（全局）', '加粗', float(gb.group(2)), TARGETS['bold_per_k']))
    if tb and (tc - tb) / tb * 100 < -TARGETS['cjk_drop'] * 100:
        problems.append(('（全局）', '汉字数跌幅', (tc - tb) / tb * 100, -TARGETS['cjk_drop'] * 100))

    print()
    if problems:
        print("未达标项：")
        for name, kind, got, want in problems:
            print("  x %-38s %s = %.2f（目标 %.2f）" % (name, kind, got, want))
    else:
        print("全部指标达标。")

    if '--check' in sys.argv and problems:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
