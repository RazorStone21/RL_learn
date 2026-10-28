/* ==========================================================================
   课程外壳：目录、路由、进度、与课程页通信
   --------------------------------------------------------------------------
   与旧版（逻辑内嵌在 index.html 里）的差别：
     1. 课表来自 assets/manifests.js（<script> 引入），不再 fetch ——
        这样双击 index.html（file://）也能正常启动。
     2. 删掉了「探测哪些课还没写」的 HEAD 请求：58 课全在，探测只会在
        file:// 下把每课都误标成「写作中」。
     3. 记住读到哪儿：继续上次 / 每课滚动位置 / 已读统计 / 停留时长。
   ========================================================================== */

(function () {
  'use strict';

  var store = window.RLStore;

  var view = document.getElementById('view');
  var toc = document.getElementById('toc');
  var crumb = document.getElementById('crumb');
  var pyStatus = document.getElementById('pystatus');
  var resumeBtn = document.getElementById('resume');
  var resumeHint = document.getElementById('resume-hint');
  var overallBar = document.getElementById('overall-bar');
  var overallText = document.getElementById('overall-text');
  var overallPct = document.getElementById('overall-pct');
  var overallTime = document.getElementById('overall-time');

  var SOURCES = [
    { key: 'lessons', dir: 'lessons/', name: '数学原理主线' },
    { key: 'advanced', dir: 'advanced/', name: '进阶篇 · 原课程存档' }
  ];

  var lessons = [];      // 扁平课表（含 dir）
  var parts = [];        // 分区（用于侧栏分组）
  var byFile = {};
  var byNumber = {};
  var current = null;
  var renderQueued = false;

  /* ---------- 小工具 ---------- */

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      renderAll();
    });
  }

  function fmtDur(ms) {
    var min = Math.round(ms / 60000);
    if (min < 1) return '不到 1 分钟';
    if (min < 60) return min + ' 分钟';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
  }

  function fmtAgo(ts) {
    if (!ts) return '';
    var d = Date.now() - ts;
    if (d < 60000) return '刚刚';
    if (d < 3600000) return Math.round(d / 60000) + ' 分钟前';
    if (d < 86400000) return Math.round(d / 3600000) + ' 小时前';
    if (d < 86400000 * 7) return Math.round(d / 86400000) + ' 天前';
    var dt = new Date(ts);
    return (dt.getMonth() + 1) + ' 月 ' + dt.getDate() + ' 日';
  }

  function shorten(s, n) {
    s = s || '';
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  /* ---------- 课表 ---------- */

  function build() {
    var manifests = window.RL_MANIFESTS || {};
    var title = '';
    var bits = [];

    SOURCES.forEach(function (src) {
      var m = manifests[src.key];
      if (!m) return;
      if (!title) title = m.title;
      bits.push((m.lessonCount || (m.lessons || []).length) + ' 课');

      (m.lessons || []).forEach(function (L) {
        var item = {
          number: L.number,
          file: L.file,
          slug: L.slug || '',
          title: L.title || '',
          dir: src.dir,
          section: src.name
        };
        lessons.push(item);
        byFile[item.file] = item;
        byNumber[item.number] = item;
      });

      (m.parts || []).forEach(function (p) {
        parts.push({ section: src.name, name: p.name, lessons: p.lessons || [] });
      });
    });

    return { title: title, bits: bits };
  }

  /* ---------- 进度 ----------
     渲染时只读一次 localStorage，把快照传下去。
     58 课挨个 store.isRead() 会触发 58 次 JSON.parse，滚动时要每秒重绘就更浪费。 */

  function counts(snap, n) { return (snap.counts && snap.counts[n]) || null; }
  function mcqDone(snap, qid) { return !!(snap.mcq && snap.mcq[qid] === true); }
  function codeDone(snap, cid) { return !!(snap.code && snap.code[cid] === true); }

  function readPct(snap, file) {
    var e = snap.nav.read[file];
    return e && typeof e.pct === 'number' ? e.pct : 0;
  }

  function isRead(snap, file) { return readPct(snap, file) >= store.READ_AT; }

  /** 这一课的题目是否全对（旧版唯一的「完成」定义，保留给目录绿点） */
  function allCorrect(snap, num) {
    var c = counts(snap, num);
    if (!c || !c.mcq || !c.code) return false;
    for (var i = 1; i <= c.mcq; i++) if (!mcqDone(snap, num + '-mcq-' + i)) return false;
    for (var k = 1; k <= c.code; k++) if (!codeDone(snap, num + '-code-' + k)) return false;
    return true;
  }

  function questionProgress(snap, num) {
    var c = counts(snap, num);
    if (!c || !c.mcq || !c.code) return '';
    var done = 0, total = c.mcq + c.code;
    for (var i = 1; i <= c.mcq; i++) if (mcqDone(snap, num + '-mcq-' + i)) done++;
    for (var k = 1; k <= c.code; k++) if (codeDone(snap, num + '-code-' + k)) done++;
    return total ? done + '/' + total : '';
  }

  /* ---------- 侧栏 ---------- */

  function renderToc(snap) {
    var lastFile = snap.nav.last || '';
    toc.innerHTML = '';
    var seenSection = null;

    parts.forEach(function (part) {
      if (part.section !== seenSection) {
        var sec = document.createElement('p');
        sec.className = 'toc-section';
        sec.textContent = part.section;
        toc.appendChild(sec);
        seenSection = part.section;
      }

      var h = document.createElement('p');
      h.className = 'toc-part';
      h.textContent = part.name;
      toc.appendChild(h);

      part.lessons.forEach(function (num) {
        var L = byNumber[num];
        if (!L) return;

        var a = document.createElement('a');
        a.className = 'toc-item';
        a.href = '#/' + L.file;
        a.dataset.number = num;
        if (current === L.file) a.classList.add('is-active');
        if (isRead(snap, L.file)) a.classList.add('is-read');
        if (allCorrect(snap, num)) a.classList.add('is-done');
        if (lastFile === L.file) a.classList.add('is-last');

        var n = document.createElement('span');
        n.className = 'toc-num';
        n.textContent = num;

        var t = document.createElement('span');
        t.className = 'toc-title';
        t.textContent = L.title;

        var d = document.createElement('span');
        d.className = 'toc-dot';
        d.textContent = questionProgress(snap, num);

        a.appendChild(n);
        a.appendChild(t);
        a.appendChild(d);
        toc.appendChild(a);
      });
    });
  }

  function renderOverall(snap) {
    var total = lessons.length || 1;
    var read = 0, sum = 0, secs = 0;

    lessons.forEach(function (L) {
      var pct = Math.min(1, readPct(snap, L.file));
      // 用「已读比例」而不是「已读课数」驱动进度条，读一半也有反馈
      sum += Math.min(pct, store.READ_AT) / store.READ_AT;
      if (pct >= store.READ_AT) read++;
      var e = snap.nav.read[L.file];
      if (e && e.secs) secs += e.secs;
    });

    var p = Math.round(Math.min(1, sum / total) * 100);
    overallBar.style.width = p + '%';
    overallText.textContent = read + ' / ' + lessons.length + ' 课已读';
    overallPct.textContent = p + '%';
    overallTime.textContent = secs >= 60 ? '累计学习 ' + fmtDur(secs * 1000) : '';
  }

  function resumeTarget(snap) {
    if (snap.nav.last && byFile[snap.nav.last]) return byFile[snap.nav.last];
    for (var i = 0; i < lessons.length; i++) {
      if (!isRead(snap, lessons[i].file)) return lessons[i];
    }
    return lessons[0];
  }

  function renderResume(snap) {
    var L = resumeTarget(snap);
    if (!L) return;

    if (snap.nav.last && byFile[snap.nav.last]) {
      resumeBtn.textContent = '继续上次 →';
      resumeHint.textContent = L.number + ' · ' + shorten(L.title, 14) +
        ' · ' + fmtAgo(snap.nav.lastAt);
    } else {
      resumeBtn.textContent = '开始学习 →';
      resumeHint.textContent = '从第 ' + L.number + ' 课开始';
    }
  }

  function renderAll() {
    var snap = store.read();
    renderToc(snap);
    renderOverall(snap);
    renderResume(snap);
  }

  /** 滚动时只更新进度条和当前课的已读勾，不重建整个目录 */
  function renderLive(file) {
    var snap = store.read();
    renderOverall(snap);
    if (!file) return;
    var L = byFile[file];
    if (!L || current !== file) return;
    var a = toc.querySelector('a.toc-item[data-number="' + L.number + '"]');
    if (a) a.classList.toggle('is-read', isRead(snap, file));
  }

  /* ---------- 路由 ---------- */

  function resolveSrc(file) {
    if (/^(lessons\/|advanced\/|reference\/|https?:|\/)/.test(file)) return file;
    var L = byFile[file];
    return (L ? L.dir : 'lessons/') + file;
  }

  function navigate(file) {
    if (!file) return;
    var L = byFile[file];

    // 地址栏里的课号不在课表里（旧书签、改名后的旧 URL）：回落到首页逻辑
    if (!L) {
      if (/^(reference\/|https?:)/.test(file)) {
        // 参考文档照常打开，只是不进「上次学习」
        current = file;
        view.src = file;
        crumb.textContent = '参考文档';
        document.title = '参考文档 — 强化学习的数学原理';
        return;
      }
      var fallback = resumeTarget(store.read());
      if (fallback) { location.replace('#/' + fallback.file); return; }
    }

    current = file;
    view.src = resolveSrc(file);
    crumb.textContent = L ? (L.number + ' · ' + L.title) : file;
    document.title = (L ? L.number + ' · ' + L.title + ' — ' : '') + '强化学习的数学原理';

    if (L) store.touch(L.file);

    Array.prototype.forEach.call(toc.querySelectorAll('.toc-item'), function (a) {
      a.classList.toggle('is-active', a.dataset.number === (L && L.number));
    });
    renderAll();
  }

  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    if (!h) {
      var t = resumeTarget(store.read());
      // 有完整地址（带 hash）就保留；否则补一个，刷新后仍停在同一课
      if (t) location.replace('#/' + t.file);
      return;
    }
    navigate(h);
  }

  /* ---------- 与课程页通信 ---------- */

  function sendRestore(target, file) {
    if (!target) return;
    var ratio = file ? store.positionOf(file) : 0;
    try { target.postMessage({ rl: 'restore', file: file, ratio: ratio }, '*'); } catch (e) { /* 忽略 */ }
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || !d.rl) return;

    if (d.rl === 'ping') {
      try { e.source.postMessage({ rl: 'pong' }, '*'); } catch (err) { /* 忽略 */ }
      return;
    }

    if (d.rl === 'hello') {
      // 课程页装配完成，告诉它该滚到哪儿
      sendRestore(e.source, d.file || current);
      return;
    }

    if (d.rl === 'run') {
      window.RLRunner.executeLocal(d.code, d.tests).then(function (result) {
        e.source.postMessage({ rl: 'result', id: d.id, result: result }, '*');
      }).catch(function (err) {
        e.source.postMessage({
          rl: 'result', id: d.id, error: (err && err.message) ? err.message : String(err)
        }, '*');
      });
      return;
    }

    if (d.rl === 'lesson-ready') {
      if (d.number && d.mcq != null && d.code != null) {
        store.set('counts.' + d.number, { mcq: d.mcq, code: d.code });
      }
      scheduleRender();
      return;
    }

    if (d.rl === 'pos') {
      // 滚动每秒来一两条：只更新进度条与当前课的勾，不重建 58 项目录
      renderLive(d.file);
      return;
    }

    if (d.rl === 'progress') {
      scheduleRender();
      return;
    }

    if (d.rl === 'navigate') {
      var href = d.href || '';
      if (/^(\d{4}|A\d{2})-[a-z0-9-]+\.html$/.test(href)) location.hash = '#/' + href;
      else if (href === '../index.html' || href === 'index.html') location.hash = '#/';
      return;
    }
  });

  /* ---------- 窄屏抽屉 ---------- */

  (function () {
    var app = document.querySelector('.app');
    var btn = document.getElementById('navToggle');
    var scrim = document.getElementById('scrim');
    if (!app || !btn || !scrim) return;

    function setOpen(open) {
      app.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      scrim.hidden = !open;
    }
    btn.addEventListener('click', function () {
      setOpen(!app.classList.contains('nav-open'));
    });
    scrim.addEventListener('click', function () { setOpen(false); });
    toc.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a.toc-item')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 736) setOpen(false);
    });
  })();

  /* ---------- 侧栏交互 ---------- */

  window.addEventListener('hashchange', route);

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-ref]');
    if (!a) return;
    e.preventDefault();
    current = a.getAttribute('href');
    view.src = current;
    crumb.textContent = a.textContent;
    Array.prototype.forEach.call(toc.querySelectorAll('.toc-item'), function (x) {
      x.classList.remove('is-active');
    });
  });

  resumeBtn.addEventListener('click', function () {
    var L = resumeTarget(store.read());
    if (L) location.hash = '#/' + L.file;
  });

  /* 导出 / 导入 / 清除 */
  var importFile = document.getElementById('importFile');

  document.getElementById('exportBtn').addEventListener('click', function () {
    var payload = store.exportPayload();
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var d = new Date();
    var stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
    a.href = url;
    a.download = 'rl-learn-progress-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('已导出进度文件');
  });

  document.getElementById('importBtn').addEventListener('click', function () {
    if (importFile) importFile.click();
  });

  if (importFile) {
    importFile.addEventListener('change', function () {
      var f = importFile.files && importFile.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          store.importPayload(String(reader.result));
          renderAll();
          toast('进度已导入');
        } catch (err) {
          toast('导入失败：' + (err && err.message ? err.message : err));
        }
        importFile.value = '';
      };
      reader.onerror = function () {
        toast('读取文件失败');
        importFile.value = '';
      };
      reader.readAsText(f);
    });
  }

  document.getElementById('clearBtn').addEventListener('click', function () {
    if (!confirm('清空本机所有学习进度？这个操作不能撤销，建议先导出备份。')) return;
    store.clear();
    renderAll();
    toast('进度已清空');
  });

  /* 顶部一条很轻的提示，不打断阅读 */
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* 别的标签页改了进度，这边跟着刷新 */
  store.onChange(scheduleRender);

  /* ---------- 启动 ---------- */

  (function boot() {
    var meta = build();

    if (!lessons.length) {
      document.body.innerHTML =
        '<div class="boot-error"><h2>课程目录载入失败</h2>' +
        '<p>页面没有拿到课表（<code>assets/manifests.js</code> 缺失或被改坏）。</p>' +
        '<p>在项目目录里跑一次 <code>node tools/build-manifests.mjs</code> 重新生成，再刷新。</p></div>';
      return;
    }

    document.getElementById('course-title').textContent = meta.title || '强化学习的数学原理';
    document.getElementById('course-sub').textContent =
      meta.bits.join(' + ') + '（共 ' + lessons.length + ' 课） ｜ 对齐赵世钰 ' +
      '《Mathematical Foundations of Reinforcement Learning》';

    if (!store.available) {
      toast('当前浏览器不允许本地存储，进度只在本次打开期间有效。建议用 Chrome 或 Edge。');
    }

    if (location.protocol === 'file:') {
      pyStatus.textContent = '离线模式：代码题不可运行（阅读与进度正常）';
      pyStatus.classList.add('is-offline');
    } else {
      window.RLRunner.onStatus(function (state, detail) {
        pyStatus.className = 'pystatus' + (state === 'ready' ? ' is-ready' : state === 'error' ? ' is-error' : '');
        pyStatus.textContent = 'Python 运行时：' + (detail || state);
      });
    }

    renderAll();
    route();
  })();
})();
