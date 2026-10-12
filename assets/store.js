/* ==========================================================================
   进度存储 + 运行器公共工具
   单一 localStorage 命名空间，课程页与外壳共用。
   ========================================================================== */

(function () {
  'use strict';

  var KEY = 'rllearn:progress:v1';
  var memory = null;   // localStorage 不可用时的回退

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return memory || {};
    }
  }

  function write(data) {
    memory = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 忽略 */ }
    // 通知外壳（不同文档间用 postMessage）
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ rl: 'progress' }, '*');
      }
    } catch (e) { /* 忽略 */ }
    window.dispatchEvent(new CustomEvent('rl:progress', { detail: data }));
  }

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
    write(d);
    return d;
  }

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

  window.RLStore = {
    read: read, write: write, get: get, set: set,
    recordMcq: recordMcq, isMcqCorrect: isMcqCorrect,
    recordCode: recordCode, isCodePassed: isCodePassed,
    KEY: KEY
  };
})();
