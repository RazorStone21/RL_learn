/* ==========================================================================
   Python 代码题运行器（Pyodide）
   - 在课程外壳里打开时：复用外壳里那一个 Pyodide 实例（通过 postMessage）
   - 单独打开某一课 HTML 时：自己懒加载 ./pyodide/
   两种模式共用同一段 Python 判题逻辑。
   ========================================================================== */

(function () {
  'use strict';

  var INDEX_URL = null;   // 由页面通过 RL:PYODIDE_URL 或 setIndexURL 指定
  var pyodide = null;
  var loading = null;
  var preludeDone = false;
  var listeners = [];
  var mode = null;        // 'host' | 'local'
  var rpcSeq = 0;
  var rpcPending = {};

  function emit(status, detail) {
    listeners.forEach(function (fn) { try { fn(status, detail); } catch (e) {} });
  }

  function defaultIndexURL() {
    // 课程页在 lessons/ 下，外壳在根目录 —— 用脚本自身路径推断
    var me = document.currentScript;
    if (me && me.src) return me.src.replace(/assets\/runner\.js.*$/, 'pyodide/');
    return 'pyodide/';
  }

  function setIndexURL(u) { INDEX_URL = u; }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('无法加载 ' + src)); };
      document.head.appendChild(s);
    });
  }

  var PRELUDE = [
    'import io, json, traceback, contextlib',
    '',
    'def _rl_format_tb(tb):',
    '    lines = tb.strip().splitlines()',
    '    if not lines:',
    '        return "未知错误"',
    '    final = lines[-1].strip()',
    '    locs = []',
    '    for i, ln in enumerate(lines):',
    '        if "<你的代码>" in ln or "<测试>" in ln:',
    '            loc = ln.strip()',
    '            if i + 1 < len(lines):',
    '                loc += "  ->  " + lines[i + 1].strip()',
    '            locs.append(loc)',
    '    if locs:',
    '        return final + "\\n" + "\\n".join(locs)',
    '    return final',
    '',
    'def _rl_run(_user_code, _tests):',
    '    ns = {"__name__": "__main__"}',
    '    buf = io.StringIO()',
    '    def check(cond, msg="断言不成立"):',
    '        if not cond:',
    '            raise AssertionError(msg)',
    '    import numpy as _np',
    '    ns["np"] = _np',
    '    ns["check"] = check',
    '    passed = True',
    '    err = ""',
    '    try:',
    '        with contextlib.redirect_stdout(buf):',
    '            exec(compile(_user_code, "<你的代码>", "exec"), ns)',
    '            exec(compile(_tests, "<测试>", "exec"), ns)',
    '    except AssertionError as e:',
    '        passed = False',
    '        err = "断言失败：" + (str(e) or "条件不成立")',
    '    except SyntaxError as e:',
    '        passed = False',
    '        err = "语法错误：第 %s 行 %s" % (e.lineno, e.msg)',
    '    except Exception as e:',
    '        passed = False',
    '        err = _rl_format_tb(traceback.format_exc())',
    '    return {"passed": passed, "error": err, "output": buf.getvalue()}',
    '',
    'def _rl_json(_user_code, _tests):',
    '    return json.dumps(_rl_run(_user_code, _tests), ensure_ascii=False)',
  ].join('\n');

  function ensurePyodide() {
    if (pyodide) return Promise.resolve(pyodide);
    if (loading) return loading;

    var url = INDEX_URL || defaultIndexURL();
    if (url.charAt(url.length - 1) !== '/') url += '/';

    loading = (async function () {
      emit('loading', '正在加载 Python 运行时（内置 Pyodide，约 26 MB，只需一次）…');
      await loadScript(url + 'pyodide.js');
      if (typeof window.loadPyodide !== 'function') {
        throw new Error('pyodide.js 已加载但没有暴露 loadPyodide()');
      }
      var py = await window.loadPyodide({ indexURL: url });
      emit('loading', '正在载入 numpy…');
      await py.loadPackage('numpy');
      if (!preludeDone) {
        await py.runPythonAsync(PRELUDE);
        preludeDone = true;
      }
      pyodide = py;
      emit('ready', 'Python 已就绪');
      return py;
    })();

    loading = loading.catch(function (e) {
      loading = null;
      emit('error', e && e.message ? e.message : String(e));
      throw e;
    });
    return loading;
  }

  async function executeLocal(code, tests) {
    var py = await ensurePyodide();
    py.globals.set('_rl_user_code', code);
    py.globals.set('_rl_tests', tests);
    var out = await py.runPythonAsync('_rl_json(_rl_user_code, _rl_tests)');
    return JSON.parse(out);
  }

  /* ---------------- 外壳 RPC ---------------- */

  function inFrame() {
    try { return window.parent && window.parent !== window; } catch (e) { return false; }
  }

  function pingHost(timeout) {
    return new Promise(function (resolve) {
      if (!inFrame()) return resolve(false);
      var settled = false;
      function onMsg(e) {
        if (e.data && e.data.rl === 'pong') {
          settled = true;
          window.removeEventListener('message', onMsg);
          resolve(true);
        }
      }
      window.addEventListener('message', onMsg);
      try { window.parent.postMessage({ rl: 'ping' }, '*'); } catch (e) {}
      setTimeout(function () {
        if (!settled) { window.removeEventListener('message', onMsg); resolve(false); }
      }, timeout || 700);
    });
  }

  function rpcRun(code, tests) {
    return new Promise(function (resolve, reject) {
      var id = 'r' + (++rpcSeq);
      rpcPending[id] = { resolve: resolve, reject: reject };
      try {
        window.parent.postMessage({ rl: 'run', id: id, code: code, tests: tests }, '*');
      } catch (e) {
        delete rpcPending[id];
        reject(e);
        return;
      }
      setTimeout(function () {
        if (rpcPending[id]) {
          delete rpcPending[id];
          reject(new Error('外壳没有响应（超时）。请刷新页面重试。'));
        }
      }, 180000);
    });
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.rl !== 'result') return;
    var p = rpcPending[d.id];
    if (!p) return;
    delete rpcPending[d.id];
    if (d.error && !d.result) p.reject(new Error(d.error));
    else p.resolve(d.result);
  });

  async function resolveMode() {
    if (mode) return mode;
    mode = (await pingHost()) ? 'host' : 'local';
    return mode;
  }

  /**
   * 运行一段用户代码 + 测试。
   * @param {{code:string, tests:string}} req
   * @returns {Promise<{passed:boolean, error:string, output:string}>}
   */
  async function run(req) {
    var m = await resolveMode();
    if (m === 'host') {
      try {
        return await rpcRun(req.code, req.tests);
      } catch (e) {
        // 外壳出问题就退回本页自己跑
        mode = 'local';
      }
    }
    return executeLocal(req.code, req.tests);
  }

  window.RLRunner = {
    run: run,
    executeLocal: executeLocal,
    ensurePyodide: ensurePyodide,
    setIndexURL: setIndexURL,
    onStatus: function (fn) { listeners.push(fn); },
    warmup: function () {
      // 只有本页要自己跑 Python 时才预热，避免在 iframe 里白下载一遍
      resolveMode().then(function (m) { if (m === 'local') ensurePyodide().catch(function () {}); });
    },
  };
})();
