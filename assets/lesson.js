/* ==========================================================================
   课程页启动器
   读取声明式的课程 HTML，装配：交互演示 / 选择题 / 代码题 / 上下课导航 / 进度。
   课程页只写内容，交互全部由这里提供。
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     资源自举：课程页只需要写一个 <script src="../assets/lesson.js">。
     其余组件（进度存储 / 选择题 / 代码运行器 / 交互演示）由这里按顺序装载，
     避免每一课都要记得抄 4 个 script 标签。
     ------------------------------------------------------------------ */
  var scriptSrc = (document.currentScript && document.currentScript.src) || '';
  var BASE = scriptSrc ? scriptSrc.replace(/lesson\.js(\?.*)?$/, '') : '../assets/';
  var PYODIDE_URL = scriptSrc ? BASE.replace(/assets\/$/, '') + 'pyodide/' : '../pyodide/';

  var DEPS = ['store.js', 'quiz.js', 'runner.js', 'sim.js'];

  // 页面骨架节点：boot() 与 injectRefLinks() 都要用，所以放在 IIFE 作用域
  var article = document.querySelector('.lesson');

  function loadOne(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('无法加载 ' + src)); };
      document.head.appendChild(el);
    });
  }

  function boot() {
    if (!article) return;

  var LESSON = article.dataset.number || '';
  var SLUG = article.dataset.slug || '';
  var inFrame = (function () { try { return window.parent && window.parent !== window; } catch (e) { return false; } })();

  /* ---------- 代码题 ---------- */

  function pythonBlock(ex, role) {
    var s = ex.querySelector('script[type="text/x-python"][data-role="' + role + '"]');
    if (!s) return null;
    return s.textContent.replace(/^\s*\n/, '').replace(/\s+$/, '\n');
  }

  function initCodeExercise(ex) {
    if (ex.dataset.wired === '1') return;
    ex.dataset.wired = '1';

    var cid = ex.dataset.code || (LESSON + '-code');
    var starter = pythonBlock(ex, 'starter');
    var tests = pythonBlock(ex, 'tests');
    var solution = pythonBlock(ex, 'solution');

    if (starter === null || tests === null || solution === null) {
      var warn = document.createElement('p');
      warn.className = 'warn';
      warn.textContent = '这道题的 starter/tests/solution 有缺失，无法运行。';
      ex.appendChild(warn);
      return;
    }

    var editor = document.createElement('textarea');
    editor.className = 'code-editor';
    editor.spellcheck = false;
    editor.value = starter;
    editor.setAttribute('aria-label', '代码编辑器');

    var actions = document.createElement('div');
    actions.className = 'code-actions';

    var runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.className = 'btn btn-primary';
    runBtn.textContent = '运行';

    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn';
    resetBtn.textContent = '重置';

    var solBtn = document.createElement('button');
    solBtn.type = 'button';
    solBtn.className = 'btn btn-ghost';
    solBtn.textContent = '显示参考答案';

    var status = document.createElement('span');
    status.className = 'code-status';

    if (window.RLStore && window.RLStore.isCodePassed(cid)) {
      status.className = 'code-status is-pass';
      status.textContent = '✓ 之前已通过';
    }

    actions.appendChild(runBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(solBtn);
    actions.appendChild(status);

    var out = document.createElement('pre');
    out.className = 'code-output';

    var solBox = document.createElement('div');
    solBox.className = 'solution-box';
    var solPre = document.createElement('pre');
    var solCode = document.createElement('code');
    solCode.textContent = solution;
    solPre.appendChild(solCode);
    solBox.appendChild(solPre);

    ex.appendChild(editor);
    ex.appendChild(actions);
    ex.appendChild(out);
    ex.appendChild(solBox);

    function setStatus(kind, text) {
      status.className = 'code-status' + (kind ? ' is-' + kind : '');
      status.textContent = text || '';
    }

    var busy = false;

    async function run() {
      if (busy) return;
      busy = true;
      runBtn.disabled = true;
      setStatus('busy', '运行中…');
      out.textContent = '';

      var t0 = Date.now();
      try {
        var res = await window.RLRunner.run({ code: editor.value, tests: tests });
        var ms = Date.now() - t0;
        var lines = [];

        if (res.output && res.output.trim()) {
          lines.push(res.output.replace(/\s+$/, ''));
        }

        if (res.passed) {
          lines.push('✓ 全部通过  (' + ms + ' ms)');
          out.innerHTML = '';
          var okP = document.createElement('span');
          okP.className = 'ok';
          okP.textContent = lines.join('\n');
          out.appendChild(okP);
          setStatus('pass', '✓ 通过');
          if (window.RLStore) window.RLStore.recordCode(cid, true);
        } else {
          lines.push('✗ 未通过\n' + (res.error || '（没有给出错误信息）'));
          out.innerHTML = '';
          var errP = document.createElement('span');
          errP.className = 'err';
          errP.textContent = lines.join('\n');
          out.appendChild(errP);
          setStatus('fail', '✗ 未通过');
          if (window.RLStore) window.RLStore.recordCode(cid, false);
        }
      } catch (e) {
        out.innerHTML = '';
        var p = document.createElement('span');
        p.className = 'err';
        p.textContent = '运行环境出错：' + (e && e.message ? e.message : e) +
          '\n\n如果一直卡在这里，检查页面是否通过本地服务器打开（见 README）。';
        out.appendChild(p);
        setStatus('fail', '环境错误');
      } finally {
        busy = false;
        runBtn.disabled = false;
      }
    }

    runBtn.addEventListener('click', run);
    resetBtn.addEventListener('click', function () {
      editor.value = starter;
      out.textContent = '';
      setStatus('', '');
    });
    solBtn.addEventListener('click', function () {
      var open = solBox.classList.toggle('is-open');
      solBtn.textContent = open ? '收起参考答案' : '显示参考答案';
    });

    editor.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        run();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = editor.selectionStart, t = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + '    ' + editor.value.slice(t);
        editor.selectionStart = editor.selectionEnd = s + 4;
      }
    });
  }

  function initAllCode(root) {
    var list = root.querySelectorAll('.code-ex');
    Array.prototype.forEach.call(list, initCodeExercise);
    return list.length;
  }

  /* ---------- 运行环境状态提示 ---------- */

  function wireRunnerStatus(root) {
    var bars = root.querySelectorAll('[data-pyodide-status]');
    if (!bars.length || !window.RLRunner) return;
    window.RLRunner.onStatus(function (state, detail) {
      Array.prototype.forEach.call(bars, function (b) {
        b.textContent = detail || state;
        b.style.display = state === 'ready' ? 'none' : '';
      });
    });
  }

  /* ---------- 上下课导航（独立打开时） ---------- */

  function injectNav() {
    if (inFrame) return;
    fetch('../lessons/manifest.json')
      .then(function (r) { return r.json(); })
      .then(function (m) {
        var i = m.lessons.findIndex(function (l) { return l.number === LESSON; });
        if (i < 0) return;
        var prev = m.lessons[i - 1], next = m.lessons[i + 1];
        var nav = document.createElement('nav');
        nav.className = 'lesson-nav';
        var a = document.createElement('a');
        a.href = '../index.html#/' + (prev ? prev.file : '');
        a.textContent = prev ? '← ' + prev.number + ' ' + prev.title : '← 课程目录';
        var b = document.createElement('a');
        b.href = '../index.html#/' + (next ? next.file : '');
        b.textContent = next ? next.number + ' ' + next.title + ' →' : '课程目录 →';
        nav.appendChild(a);
        nav.appendChild(b);
        document.body.insertBefore(nav, article);
      })
      .catch(function () { /* 独立打开且没有服务器时静默 */ });
  }

  /* ---------- 在外壳里点击站内链接 → 让外壳导航 ---------- */

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!inFrame) return;
    if (/^\d{4}-[a-z0-9-]+\.html$/.test(href) || href === '../index.html') {
      e.preventDefault();
      try { window.parent.postMessage({ rl: 'navigate', href: href }, '*'); } catch (err) {}
    }
  });

  /* ---------- 启动 ---------- */

  if (window.RLSim) window.RLSim.init(document);

  if (window.RLQuiz) {
    window.RLQuiz.init(article, LESSON, function (qid, correct) {
      if (window.RLStore) window.RLStore.recordMcq(qid, correct);
    });
  }

  initAllCode(article);
  wireRunnerStatus(document);
  injectRefLinks();
  injectNav();

  // 让外壳知道这一课已经装配完成（用于统计题数）
  if (inFrame) {
    try {
      window.parent.postMessage({
        rl: 'lesson-ready',
        number: LESSON,
        slug: SLUG,
        mcq: article.querySelectorAll('.mcq').length,
        code: article.querySelectorAll('.code-ex').length,
      }, '*');
    } catch (e) {}
  }
  }

  /* ---------- 统一的参考文档入口（每课都要能一键查符号/术语） ---------- */
  function injectRefLinks() {
    var foot = article.querySelector('.lesson-foot');
    if (!foot || foot.querySelector('.ref-links')) return;
    var root = BASE.replace(/assets\/$/, '');
    var wrap = document.createElement('p');
    wrap.className = 'ref-links';
    wrap.appendChild(document.createTextNode('本课用到的缩写与符号，可在参考文档里集中查阅：'));
    [['glossary.html', '术语表'], ['notation.html', '符号表'], ['algorithms.html', '算法速查']]
      .forEach(function (pair, i) {
        if (i) wrap.appendChild(document.createTextNode(' · '));
        var a = document.createElement('a');
        a.href = root + 'reference/' + pair[0];
        a.textContent = pair[1];
        wrap.appendChild(a);
      });
    foot.insertBefore(wrap, foot.firstChild);
  }

  /* 串行装载（quiz.js 在求值时就引用 window.RLStore，顺序不能乱），然后启动 */
  (async function () {
    for (var i = 0; i < DEPS.length; i++) {
      await loadOne(BASE + DEPS[i]);
    }
  })().then(function () {
    if (window.RLRunner && window.RLRunner.setIndexURL) {
      window.RLRunner.setIndexURL(PYODIDE_URL);
    }
    boot();
  }).catch(function (e) {
    // 某个组件装载失败：仍然尝试启动，让页面其余部分可用
    console.error('[lesson] 组件装载失败：', e);
    boot();
  });
})();
