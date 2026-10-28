/* ==========================================================================
   进度存储（v2）+ 运行器公共工具
   单一 localStorage 命名空间，外壳（index.html）与课程页共用。

   v2 相比 v1 增加了「读到哪儿」：
     nav.last      最后打开的课（用于「继续上次」）
     nav.lastAt    最后一次打开的时间
     nav.history   最近 20 次打开记录
     nav.pos       每课滚动位置（0~1，按比例存，换屏幕尺寸也不失效）
     nav.read      每课 { pct, secs, first, last }
   mcq / code / counts 三块与 v1 完全兼容，老数据会被就地升级。

   注意：set/get 用的是点号路径，课程文件名本身带 ".html"，
   所以「按文件存取」必须用下面无点号路径的专门函数
   （positionOf / readEntry / savePos ...），不要用 get('nav.pos.xxx.html')。
   ========================================================================== */

(function () {
  'use strict';

  var KEY = 'rllearn:progress:v1';   // key 不变，老进度就地升级
  var READ_AT = 0.9;                 // 滚过 90% 算读完
  var HISTORY_MAX = 20;
  var memory = null;                 // localStorage 不可用时的回退

  // Safari 的 file:// 会直接抛 SecurityError，必须探测而不是假设可用
  var available = (function () {
    try {
      localStorage.setItem('__rl_probe__', '1');
      localStorage.removeItem('__rl_probe__');
      return true;
    } catch (e) {
      return false;
    }
  })();

  function now() { return Date.now(); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function blank() {
    return {
      v: 2,
      mcq: {}, code: {}, counts: {},
      nav: { last: '', lastAt: 0, history: [], pos: {}, read: {} }
    };
  }

  /* v1 的对象没有 nav，这里补齐，不丢已有记录 */
  function normalize(d) {
    if (!isObj(d)) return blank();
    d.v = 2;
    if (!isObj(d.mcq)) d.mcq = {};
    if (!isObj(d.code)) d.code = {};
    if (!isObj(d.counts)) d.counts = {};
    if (!isObj(d.nav)) d.nav = {};
    var n = d.nav;
    if (typeof n.last !== 'string') n.last = '';
    if (typeof n.lastAt !== 'number') n.lastAt = 0;
    if (!Array.isArray(n.history)) n.history = [];
    if (!isObj(n.pos)) n.pos = {};
    if (!isObj(n.read)) n.read = {};
    return d;
  }

  function read() {
    if (!available) return memory ? normalize(memory) : blank();
    try {
      var raw = localStorage.getItem(KEY);
      return normalize(raw ? JSON.parse(raw) : blank());
    } catch (e) {
      return memory ? normalize(memory) : blank();
    }
  }

  function write(data) {
    memory = data;
    if (available) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 配额满等，忽略 */ }
    }
    // 只通知本文档。跨文档（外壳 ↔ 课程页）由调用方决定发什么消息：
    // 滚动位置每秒都在变，不能让每次写盘都去重绘整个目录。
    try { window.dispatchEvent(new CustomEvent('rl:progress', { detail: data })); } catch (e) { /* 忽略 */ }
    return data;
  }

  /* ---------- 点号路径读写（保留旧接口） ---------- */

  function get(path) {
    var d = read();
    return path.split('.').reduce(function (o, k) { return o && o[k]; }, d);
  }

  function set(path, value) {
    var d = read();
    var parts = path.split('.');
    var cur = d;
    for (var i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    return write(d);
  }

  /* ---------- 题目 ---------- */

  function recordMcq(qid, correct) {
    // 只记录"首次是否答对"，答对后再答错不覆盖
    if (correct && get('mcq.' + qid) !== true) set('mcq.' + qid, true);
    else if (get('mcq.' + qid) === undefined) set('mcq.' + qid, false);
  }

  function isMcqCorrect(qid) { return get('mcq.' + qid) === true; }

  function recordCode(cid, passed) {
    if (passed && get('code.' + cid) !== true) set('code.' + cid, true);
    else if (get('code.' + cid) === undefined) set('code.' + cid, false);
  }

  function isCodePassed(cid) { return get('code.' + cid) === true; }

  /* ---------- 阅读位置 ---------- */

  /** 打开某一课：更新 last / history / 首次时间 */
  function touch(file) {
    if (!file) return read();
    var d = read(), n = d.nav, t = now();
    n.last = file;
    n.lastAt = t;
    n.history = n.history.filter(function (h) { return h && h.f !== file; });
    n.history.unshift({ f: file, at: t });
    if (n.history.length > HISTORY_MAX) n.history.length = HISTORY_MAX;
    if (!isObj(n.read[file])) n.read[file] = { pct: 0, secs: 0, first: t, last: t };
    else n.read[file].last = t;
    return write(d);
  }

  /** 保存滚动位置（0~1）。返回归一化后的比例。 */
  function savePos(file, ratio) {
    if (!file) return 0;
    var r = Math.max(0, Math.min(1, Number(ratio) || 0));
    var d = read(), n = d.nav, t = now();
    var prev = typeof n.pos[file] === 'number' ? n.pos[file] : 0;
    var moved = Math.abs(prev - r) >= 0.004;
    var e = n.read[file];
    if (!isObj(e)) e = n.read[file] = { pct: 0, secs: 0, first: t, last: t };
    var grew = r > (e.pct || 0);
    if (moved) n.pos[file] = Math.round(r * 1000) / 1000;
    if (grew) e.pct = Math.round(r * 1000) / 1000;
    e.last = t;
    // 位置和进度都没变就不落盘，避免滚动时每秒写一次 localStorage
    if (moved || grew) write(d);
    return r;
  }

  function positionOf(file) {
    var d = read();
    var v = d.nav.pos[file];
    return typeof v === 'number' ? v : 0;
  }

  /** 累计停留时长（秒） */
  function addSeconds(file, secs) {
    var s = Math.round(Number(secs) || 0);
    if (!file || s <= 0) return;
    var d = read(), t = now();
    var e = d.nav.read[file];
    if (!isObj(e)) e = d.nav.read[file] = { pct: 0, secs: 0, first: t, last: t };
    e.secs = (e.secs || 0) + s;
    e.last = t;
    write(d);
  }

  function readEntry(file) {
    var e = read().nav.read[file];
    return isObj(e) ? e : null;
  }

  function isRead(file) {
    var e = readEntry(file);
    return !!(e && (e.pct || 0) >= READ_AT);
  }

  function markRead(file) {
    var d = read(), t = now();
    var e = d.nav.read[file];
    if (!isObj(e)) e = d.nav.read[file] = { pct: 1, secs: 0, first: t, last: t };
    e.pct = 1;
    e.last = t;
    return write(d);
  }

  function lastLesson() {
    var d = read();
    return d.nav.last && d.nav.lastAt ? { file: d.nav.last, at: d.nav.lastAt } : null;
  }

  function recent(n) {
    return read().nav.history.slice(0, n || 10);
  }

  /* ---------- 备份 ---------- */

  function exportPayload() {
    return {
      app: 'rl-learn',
      schema: 2,
      exportedAt: new Date().toISOString(),
      data: read()
    };
  }

  /** 合并式导入：已答对的题、更远的阅读进度优先保留，时长不累加。 */
  function importPayload(text) {
    var obj = typeof text === 'string' ? JSON.parse(text) : text;
    var inc = normalize(obj && obj.data ? obj.data : obj);
    var cur = read();

    Object.keys(cur.mcq).forEach(function (k) { if (cur.mcq[k] === true) inc.mcq[k] = true; });
    Object.keys(cur.code).forEach(function (k) { if (cur.code[k] === true) inc.code[k] = true; });

    Object.keys(cur.counts || {}).forEach(function (k) {
      var a = cur.counts[k], b = inc.counts[k];
      if (!b) { inc.counts[k] = a; return; }
      if (a && b) inc.counts[k] = { mcq: Math.max(a.mcq || 0, b.mcq || 0), code: Math.max(a.code || 0, b.code || 0) };
    });

    // 阅读进度取两者更远的一侧
    Object.keys(cur.nav.pos).forEach(function (f) {
      var a = cur.nav.pos[f], b = inc.nav.pos[f];
      if (typeof b !== 'number' || a > b) inc.nav.pos[f] = a;
    });
    Object.keys(cur.nav.read).forEach(function (f) {
      var a = cur.nav.read[f], b = inc.nav.read[f];
      if (!isObj(b)) { inc.nav.read[f] = a; return; }
      b.pct = Math.max(a.pct || 0, b.pct || 0);
      b.secs = Math.max(a.secs || 0, b.secs || 0);
      b.first = Math.min(a.first || b.first || 0, b.first || a.first || 0);
    });

    // 「继续上次」以更晚的一次为准
    if (cur.nav.lastAt > inc.nav.lastAt) {
      inc.nav.last = cur.nav.last;
      inc.nav.lastAt = cur.nav.lastAt;
    }
    inc.v = 2;
    write(inc);
    return inc;
  }

  function clear() { return write(blank()); }

  function onChange(fn) {
    window.addEventListener('rl:progress', function () { fn(); });
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) fn();
    });
  }

  window.RLStore = {
    KEY: KEY,
    READ_AT: READ_AT,
    available: available,

    read: read, write: write, get: get, set: set,

    recordMcq: recordMcq, isMcqCorrect: isMcqCorrect,
    recordCode: recordCode, isCodePassed: isCodePassed,

    touch: touch,
    savePos: savePos, positionOf: positionOf,
    addSeconds: addSeconds,
    readEntry: readEntry, isRead: isRead, markRead: markRead,
    lastLesson: lastLesson, recent: recent,

    exportPayload: exportPayload, importPayload: importPayload, clear: clear,
    onChange: onChange
  };
})();
