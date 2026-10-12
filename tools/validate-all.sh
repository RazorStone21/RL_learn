#!/usr/bin/env bash
# 一键跑完全部检查：课程结构+判题、HTML 标签平衡、真实 Pyodide 端到端判题。
# 用法: ./tools/validate-all.sh
set -uo pipefail
cd "$(dirname "$0")/.."

FAILED=0

echo "############################################################"
echo "# 1/11  课程结构 + 习题完整性 + 判题（本机 python3）"
echo "############################################################"
COURSE_FILES="$(ls lessons/[0-9]*.html advanced/[A-Z]*.html 2>/dev/null | grep -v '/\._')"
if [ -z "$COURSE_FILES" ]; then
  echo '没有找到任何课程页（lessons/ 与 advanced/ 都为空）。'; FAILED=1
elif ! python3 tools/check-lesson.py $COURSE_FILES; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 2/11  HTML 标签平衡"
echo "############################################################"
if ! python3 tools/check-html.py lessons advanced reference index.html; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 3/11  真实 Pyodide 端到端判题（与浏览器同一运行时）"
echo "############################################################"
if ! node tools/smoke-pyodide.mjs; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 4/11  缩写与符号：每课（含 3 份参考文档）首次出现是否都有解释"
echo "############################################################"
if ! python3 tools/audit-terms.py --check; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 5/11  代码题题干：是否说清了要做什么"
echo "############################################################"
if ! python3 tools/audit-prompts.py --check; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 6/11  红线不变量：公式编号 / data-answer / 题数 / 脚本数"
echo "############################################################"
if ! python3 tools/check-invariants.py --check; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 7/11  概念术语：首次出现是否有白话解释"
echo "############################################################"
if ! python3 tools/audit-jargon.py --check; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 8/11  可读性：嵌套括号 / 未解释的小写英文词"
echo "############################################################"
if ! python3 tools/audit-readability.py --check; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 9/11  代码题提示：有没有点名每一步"
echo "############################################################"
if ! python3 tools/audit-hints.py --check; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 10/11  KaTeX 公式能否编译（用真 KaTeX 逐条渲染）"
echo "############################################################"
if ! node tools/check-katex.mjs; then
  FAILED=1
fi

echo
echo "############################################################"
echo "# 11/11  数学一致性：交叉引用 / 证明结束标记 / 公式与插图编号"
echo "############################################################"
if ! python3 tools/audit-math.py --check; then
  FAILED=1
fi

echo
if [ "$FAILED" -eq 0 ]; then
  echo "全部检查通过。"
else
  echo "有检查未通过，见上面的输出。"
fi
exit "$FAILED"
