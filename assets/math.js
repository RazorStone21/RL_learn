/* 数学公式渲染引导（离线 KaTeX）。
 *
 * 用法：课程页在 </body> 前引入本文件即可，页面里直接用：
 *   行内   $V_\pi(s)$
 *   块级   $$v_\pi=(I-\gamma P_\pi)^{-1}r_\pi$$
 *   多行   $$\begin{aligned} a &= b \\ &= c \end{aligned}$$
 *
 * 注意：KaTeX 的 auto-render 默认【不认】单 $ 定界符，必须显式声明，
 * 否则 $...$ 会原样留在页面上（这个坑踩过）。
 */
(function () {
  var DELIMS = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false }
  ];

  var OPTS = {
    delimiters: DELIMS,
    throwOnError: false,
    errorColor: '#c0392b',
    // 公式里的中文与常见记号不走 KaTeX 的严格模式，避免误报
    strict: false,
    trust: false,
    macros: {
      '\\E': '\\mathbb{E}',
      '\\R': '\\mathbb{R}',
      '\\var': '\\operatorname{Var}',
      '\\argmax': '\\operatorname*{arg\\,max}',
      '\\argmin': '\\operatorname*{arg\\,min}',
      '\\d': '\\mathrm{d}'
    }
  };

  function ready() {
    if (typeof renderMathInElement !== 'function') { return false; }
    renderMathInElement(document.body, OPTS);
    document.documentElement.setAttribute('data-math', 'ready');
    return true;
  }

  function boot() {
    if (ready()) { return; }
    // 脚本按顺序同步加载时一般已就绪；这里兜底等一小会儿。
    var tries = 0;
    var t = setInterval(function () {
      if (ready() || ++tries > 40) {
        clearInterval(t);
        if (tries > 40) {
          document.documentElement.setAttribute('data-math', 'failed');
        }
      }
    }, 25);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
