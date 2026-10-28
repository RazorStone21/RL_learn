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

  var DEPS = ['store.js', 'quiz.js', 'runner.js', 'sim.js', 'manifests.js'];

  // 页面骨架节点：boot() 与 injectRefLinks() 都要用，所以放在 IIFE 作用域
  var article = document.querySelector('.lesson');

  // 进度按「文件名」存：课号在主线/进阶篇里各自编号，文件名全局唯一。
  var FILE = (function () {
    var m = (location.pathname || '').match(/([^/]+\.html)$/i);
    return m ? m[1] : '';
  })();

  // 双击打开（file://）时浏览器禁止加载 Python 运行时：fetch 读本地 wasm 会被拒。
  // 这跟课程内容无关，代码题要降级成「可读、可看答案、不可运行」。
  var CAN_RUN_PY = location.protocol !== 'file:';

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

  // 题目状态变了才通知外壳重绘目录（滚动位置由 initReadingPosition 单独发 'pos'）
  function tellParent() {
    if (!inFrame) return;
    try { window.parent.postMessage({ rl: 'progress' }, '*'); } catch (e) {}
  }

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
          tellParent();
        } else {
          lines.push('✗ 未通过\n' + (res.error || '（没有给出错误信息）'));
          out.innerHTML = '';
          var errP = document.createElement('span');
          errP.className = 'err';
          errP.textContent = lines.join('\n');
          out.appendChild(errP);
          setStatus('fail', '✗ 未通过');
          if (window.RLStore) window.RLStore.recordCode(cid, false);
          tellParent();
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

    /* file:// 打开：不假装能跑，给出可操作的说明（用户可能只是没起服务） */
    if (!CAN_RUN_PY) {
      runBtn.disabled = true;
      runBtn.title = '直接打开 HTML 时浏览器不允许加载 Python 运行时';

      var note = document.createElement('p');
      note.className = 'code-offline';
      note.innerHTML = '这道题需要浏览器内的 Python 运行时。你现在是直接打开这个 HTML，' +
        '浏览器不允许它加载本地运行时——不是课程坏了。' +
        '要看运行结果，请用 <code>./start.sh</code> 起本地服务，或访问 GitHub Pages 上的版本；' +
        '也可以点「显示参考答案」，把代码复制到本机跑。';
      ex.appendChild(note);

      var mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'btn btn-ghost';
      mark.textContent = '我在本机跑通了';
      if (window.RLStore && window.RLStore.isCodePassed(cid)) {
        mark.disabled = true;
        mark.textContent = '✓ 已标记完成';
      }
      mark.addEventListener('click', function () {
        if (window.RLStore) window.RLStore.recordCode(cid, true);
        mark.disabled = true;
        mark.textContent = '✓ 已标记完成';
        setStatus('pass', '✓ 已标记');
        tellParent();
      });
      actions.insertBefore(mark, status);
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

  // 课表来自 assets/manifests.js。以前这里 fetch('../lessons/manifest.json')，
  // 双击打开（file://）读本地 JSON 会被浏览器拒绝，导航就永远不出现。
  function pickManifest() {
    var all = window.RL_MANIFESTS || {};
    var keys = Object.keys(all);
    for (var k = 0; k < keys.length; k++) {
      var m = all[keys[k]];
      if (!m || !m.lessons) continue;
      for (var i = 0; i < m.lessons.length; i++) {
        if (m.lessons[i].number === LESSON) return m;
      }
    }
    return null;
  }

  function injectNav() {
    if (inFrame) return;
    var m = pickManifest();
    if (!m) return;

    var i = -1;
    for (var k = 0; k < m.lessons.length; k++) {
      if (m.lessons[k].number === LESSON) { i = k; break; }
    }
    if (i < 0) return;

    var prev = m.lessons[i - 1];
    var next = m.lessons[i + 1];

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
      tellParent();
    });
  }

  initAllCode(article);
  wireRunnerStatus(document);
  injectRefLinks();
  injectNav();
  initReadingPosition();

  // 让外壳知道这一课已经装配完成（用于统计题数）
  if (inFrame) {
    try {
      window.parent.postMessage({
        rl: 'lesson-ready',
        number: LESSON,
        slug: SLUG,
        file: FILE,
        mcq: article.querySelectorAll('.mcq').length,
        code: article.querySelectorAll('.code-ex').length,
      }, '*');
    } catch (e) {}
  }
  }

  /* ---------- 阅读位置：记住本课停在哪、停了多久 ---------- */

  function initReadingPosition() {
    var store = window.RLStore;
    if (!store || !FILE) return;

    var framed = (function () {
      try { return window.parent && window.parent !== window; } catch (e) { return false; }
    })();

    var restored = false;
    var settled = false;
    var userMoved = false;
    var lastSave = 0;
    // 外壳里等它把位置发过来；单独打开时直接读本机存的
    var wantRatio = framed ? null : store.positionOf(FILE);

    function ratio() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / h));
    }

    /* KaTeX 渲染会改变文档高度。渲染完再滚，否则位置会偏。
       进阶篇（advanced/）没有引入 KaTeX，这时不必等，直接开始。 */
    function whenSettled(fn) {
      function go() {
        requestAnimationFrame(function () { requestAnimationFrame(fn); });
      }
      if (typeof window.renderMathInElement !== 'function') { go(); return; }

      var tries = 0;
      (function tick() {
        var m = document.documentElement.getAttribute('data-math');
        if (m === 'ready' || m === 'failed' || tries++ > 80) { go(); return; }
        setTimeout(tick, 25);
      })();
    }

    function maybeRestore() {
      if (restored || !settled) return;
      restored = true;
      if (userMoved) return;                       // 用户已经自己滚了，别把他拽回去
      var r = wantRatio;
      if (typeof r !== 'number' || r < 0.02) return;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0) window.scrollTo(0, Math.round(r * h));
    }

    ['wheel', 'touchmove', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, function () {
        if (!restored) userMoved = true;
      }, { passive: true });
    });

    window.addEventListener('scroll', function () {
      if (!restored) return;
      var t = Date.now();
      if (t - lastSave < 700) return;
      lastSave = t;
      var r = ratio();
      store.savePos(FILE, r);
      if (framed) {
        try { window.parent.postMessage({ rl: 'pos', file: FILE, ratio: r }, '*'); } catch (e) {}
      }
    }, { passive: true });

    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || d.rl !== 'restore') return;
      if (d.file && d.file !== FILE) return;
      if (typeof d.ratio === 'number') wantRatio = d.ratio;
      maybeRestore();
    });

    /* 停留时长：只在页面可见时累加，后台标签页开着不算学习 */
    var lastTick = Date.now();
    setInterval(function () {
      var t = Date.now();
      var delta = (t - lastTick) / 1000;
      lastTick = t;
      if (document.hidden) return;
      store.addSeconds(FILE, delta);
    }, 5000);

    function flush() {
      if (restored) store.savePos(FILE, ratio());
    }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) flush();
      else lastTick = Date.now();
    });

    whenSettled(function () {
      settled = true;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      // 一屏就能读完的短页面：滚不动，按「读完」处理，否则永远停在 0%
      if (h <= 40) { store.markRead(FILE); restored = true; return; }
      maybeRestore();
    });

    // 告诉外壳「我准备好了，把上次的位置发给我」
    if (framed) {
      try { window.parent.postMessage({ rl: 'hello', file: FILE }, '*'); } catch (e) {}
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
