/* ==========================================================================
   交互演示组件（simulators）
   课程里用 <figure class="sim" data-sim="..."> 声明，这里负责渲染。
   支持的 sim 与属性见 COURSE-SPEC.md 第 8 节。纯 canvas，无外部依赖。
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------- 基础设施 ---------------- */

  function theme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, fb) { var x = cs.getPropertyValue(n); return (x && x.trim()) || fb; }
    return {
      ink: v('--ink', '#16161d'),
      soft: v('--ink-soft', '#3d3d47'),
      muted: v('--muted', '#6f6f7b'),
      rule: v('--rule', '#e2ded3'),
      paper: v('--paper', '#fdfcf9'),
      accent: v('--accent', '#2f5d8c'),
      accent2: v('--accent-2', '#8a3b12'),
      good: v('--good', '#1f6f43'),
    };
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(rnd) {
    var u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function setupCanvas(canvas, cssHeight) {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || canvas.parentNode.clientWidth || 640;
    var h = cssHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* 折线图：series = [{name, color, data:[[x,y],...]}] */
  function drawChart(canvas, opts) {
    var T = theme();
    var s = setupCanvas(canvas, opts.height || 260);
    var ctx = s.ctx, W = s.w, H = s.h;
    var pad = { l: 52, r: 14, t: 14, b: 34 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    var series = opts.series.filter(function (x) { return x.data && x.data.length; });
    if (!series.length) return;

    var logX = !!opts.logX;
    var xs = [], ys = [];
    series.forEach(function (sr) {
      sr.data.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
    });
    var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    if (opts.yMin != null) ymin = opts.yMin;
    if (opts.yMax != null) ymax = opts.yMax;
    if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
    var padY = (ymax - ymin) * 0.08;
    ymin -= padY; ymax += padY;
    if (opts.yMinZero) ymin = Math.min(0, ymin);

    function X(x) {
      if (logX) {
        var lx = Math.log10(Math.max(x, 1)), l0 = Math.log10(Math.max(xmin, 1)), l1 = Math.log10(Math.max(xmax, 2));
        return pad.l + (lx - l0) / ((l1 - l0) || 1) * iw;
      }
      return pad.l + (x - xmin) / ((xmax - xmin) || 1) * iw;
    }
    function Y(y) { return pad.t + ih - (y - ymin) / ((ymax - ymin) || 1) * ih; }

    ctx.font = '11px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.strokeStyle = T.rule; ctx.fillStyle = T.muted; ctx.lineWidth = 1;

    // y 网格
    for (var i = 0; i <= 4; i++) {
      var yv = ymin + (ymax - ymin) * i / 4;
      var yy = Math.round(Y(yv)) + 0.5;
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(pad.l + iw, yy); ctx.stroke();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(fmt(yv), pad.l - 6, yy);
    }

    // x 轴刻度
    var ticks = logX ? logTicks(xmin, xmax) : linTicks(xmin, xmax, 5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ticks.forEach(function (tv) {
      var xx = Math.round(X(tv)) + 0.5;
      if (xx < pad.l - 1 || xx > pad.l + iw + 1) return;
      ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, pad.t + ih); ctx.stroke();
      ctx.fillStyle = T.muted;
      ctx.fillText(fmt(tv), xx, pad.t + ih + 6);
    });

    // 轴标签
    if (opts.xLabel) {
      ctx.fillStyle = T.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(opts.xLabel, pad.l + iw / 2, H - 2);
    }
    if (opts.yLabel) {
      ctx.save();
      ctx.translate(11, pad.t + ih / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = T.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(opts.yLabel, 0, 0);
      ctx.restore();
    }

    // 数据线
    series.forEach(function (sr) {
      ctx.strokeStyle = sr.color; ctx.lineWidth = sr.width || 1.8;
      ctx.beginPath();
      sr.data.forEach(function (p, i) {
        var px = X(p[0]), py = Y(p[1]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
  }

  function fmt(v) {
    var a = Math.abs(v);
    if (a >= 1000) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    if (a >= 0.01) return v.toFixed(3);
    return v.toPrecision(2);
  }

  function linTicks(a, b, n) {
    var out = [];
    for (var i = 0; i <= n; i++) out.push(a + (b - a) * i / n);
    return out;
  }
  function logTicks(a, b) {
    var out = [], p = Math.floor(Math.log10(Math.max(a, 1)));
    for (; Math.pow(10, p) <= b * 1.001; p++) {
      var v = Math.pow(10, p);
      if (v >= a * 0.999) out.push(v);
    }
    if (out.length < 2) out = [a, b];
    return out;
  }

  function legend(cap, items) {
    var box = el('div', 'sim-legend');
    items.forEach(function (it) {
      var sp = el('span');
      var i = el('i');
      i.style.background = it.color;
      sp.appendChild(i);
      sp.appendChild(document.createTextNode(it.name));
      box.appendChild(sp);
    });
    cap.appendChild(box);
  }

  /* ---------------- 多臂老虎机 ---------------- */

  function simBandit(fig) {
    var arms = +(fig.dataset.arms || 10);
    var steps = +(fig.dataset.steps || 1000);
    var defaultRuns = +(fig.dataset.runs || 200);

    fig.appendChild(el('p', 'sim-title', '交互演示 · 多臂老虎机：三种探索策略的平均收益'));
    var controls = el('div', 'sim-controls');
    var runBtn = el('button', 'btn btn-primary', '重新采样');
    var epsWrap = el('label');
    epsWrap.appendChild(document.createTextNode('ε'));
    var eps = document.createElement('input');
    eps.type = 'range'; eps.min = '0'; eps.max = '0.5'; eps.step = '0.01'; eps.value = '0.1';
    var epsVal = el('span', 'sim-val', '0.10');
    epsWrap.appendChild(eps); epsWrap.appendChild(epsVal);
    var runsWrap = el('label');
    runsWrap.appendChild(document.createTextNode('实验轮数'));
    var runs = document.createElement('input');
    runs.type = 'range'; runs.min = '20'; runs.max = '500'; runs.step = '20'; runs.value = String(defaultRuns);
    var runsVal = el('span', 'sim-val', String(defaultRuns));
    runsWrap.appendChild(runs); runsWrap.appendChild(runsVal);
    controls.appendChild(runBtn); controls.appendChild(epsWrap); controls.appendChild(runsWrap);
    fig.appendChild(controls);

    var canvas = document.createElement('canvas');
    fig.appendChild(canvas);
    var cap = el('p', 'sim-caption');
    fig.appendChild(cap);

    function compute() {
      var T = theme();
      var nRuns = +runs.value, e = +eps.value;
      var algos = [
        { name: 'ε-greedy (Q₁=0)', color: T.accent, kind: 'eps', alpha: 0.1, q1: 0 },
        { name: '乐观初始值 (Q₁=5)', color: T.accent2, kind: 'eps', alpha: 0.1, q1: 5 },
        { name: 'UCB (c=2)', color: T.good, kind: 'ucb', alpha: 0.1, q1: 0, c: 2 },
      ];
      var sums = algos.map(function () { return new Float64Array(steps); });

      for (var r = 0; r < nRuns; r++) {
        var rnd = mulberry32(0x9e3779b9 ^ (r * 2654435761));
        var qstar = [];
        for (var a = 0; a < arms; a++) qstar.push(gauss(rnd));
        algos.forEach(function (al, ai) {
          var Q = new Float64Array(arms).fill(al.q1);
          var N = new Float64Array(arms);
          for (var t = 0; t < steps; t++) {
            var pick;
            if (al.kind === 'ucb') {
              var best = -Infinity; pick = 0;
              for (var i = 0; i < arms; i++) {
                var bonus = N[i] === 0 ? 1e9 : al.c * Math.sqrt(Math.log(t + 1) / N[i]);
                var val = Q[i] + bonus;
                if (val > best) { best = val; pick = i; }
              }
            } else {
              if (rnd() < e) pick = Math.floor(rnd() * arms);
              else {
                var b2 = -Infinity; pick = 0;
                for (var j = 0; j < arms; j++) { if (Q[j] > b2) { b2 = Q[j]; pick = j; } }
              }
            }
            var rew = gauss(rnd) + qstar[pick];
            N[pick] += 1;
            Q[pick] += al.alpha * (rew - Q[pick]);
            sums[ai][t] += rew;
          }
        });
      }

      var series = algos.map(function (al, ai) {
        var data = [];
        for (var t = 1; t <= steps; t++) data.push([t, sums[ai][t - 1] / nRuns]);
        return { name: al.name, color: al.color, data: data };
      });

      drawChart(canvas, {
        series: series, xLabel: '步数 (step)', yLabel: '平均收益',
        yMinZero: false, height: 250,
      });
      cap.innerHTML = 'UCB 与乐观初始值在前 ' +
        Math.round(steps * 0.3) + ' 步领先，因为它们把探索花在还没试够的手臂上。' +
        'ε-greedy 长期仍按 ε 的比例做随机动作，平台因此更低。' +
        '把 ε 拉到 0，它会先短暂领先，然后停在次优手臂上，这是贪心的代价。';
      legend(cap, series.map(function (s2) { return { name: s2.name, color: s2.color }; }));
    }

    var timer = null;
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(compute, 120);
    }
    eps.addEventListener('input', function () { epsVal.textContent = (+eps.value).toFixed(2); schedule(); });
    runs.addEventListener('input', function () { runsVal.textContent = runs.value; schedule(); });
    runBtn.addEventListener('click', compute);
    compute();
  }

  /* ---------------- 网格世界 ---------------- */

  function simGridworld(fig) {
    var rows = +(fig.dataset.rows || 4);
    var cols = +(fig.dataset.cols || 4);
    var mode = fig.dataset.mode || 'policy';

    fig.appendChild(el('p', 'sim-title',
      mode === 'q-learning' ? '交互演示 · Q-learning 学到的策略' : '交互演示 · 价值迭代：状态价值与最优策略'));
    var controls = el('div', 'sim-controls');
    var gammaWrap = el('label');
    gammaWrap.appendChild(document.createTextNode('γ'));
    var gamma = document.createElement('input');
    gamma.type = 'range'; gamma.min = '0.5'; gamma.max = '0.99'; gamma.step = '0.01';
    gamma.value = String(fig.dataset.gamma || 0.9);
    var gammaVal = el('span', 'sim-val', (+gamma.value).toFixed(2));
    gammaWrap.appendChild(gamma); gammaWrap.appendChild(gammaVal);
    controls.appendChild(gammaWrap);

    var epWrap = null, ep = null, epVal = null, runsMax = 3000;
    if (mode === 'q-learning') {
      epWrap = el('label');
      epWrap.appendChild(document.createTextNode('训练回合'));
      ep = document.createElement('input');
      ep.type = 'range'; ep.min = '50'; ep.max = String(runsMax); ep.step = '50'; ep.value = '800';
      epVal = el('span', 'sim-val', '800');
      epWrap.appendChild(ep); epWrap.appendChild(epVal);
      controls.appendChild(epWrap);
    }
    var runBtn = el('button', 'btn btn-primary', mode === 'q-learning' ? '重新训练' : '重新计算');
    controls.appendChild(runBtn);
    fig.appendChild(controls);

    var canvas = document.createElement('canvas');
    fig.appendChild(canvas);
    var cap = el('p', 'sim-caption');
    fig.appendChild(cap);

    var N = rows * cols;
    function isTerminal(s) {
      var r = Math.floor(s / cols), c = s % cols;
      return (r === 0 && c === 0) || (r === rows - 1 && c === cols - 1);
    }
    function step(s, a) {
      var r = Math.floor(s / cols), c = s % cols;
      if (a === 0) r -= 1; else if (a === 1) c += 1; else if (a === 2) r += 1; else c -= 1;
      r = Math.max(0, Math.min(rows - 1, r));
      c = Math.max(0, Math.min(cols - 1, c));
      var ns = r * cols + c;
      return { ns: ns, r: isTerminal(ns) ? 0 : -1 };
    }

    function valueIteration(g) {
      var V = new Float64Array(N);
      for (var it = 0; it < 400; it++) {
        var d = 0, nv = new Float64Array(N);
        for (var s = 0; s < N; s++) {
          if (isTerminal(s)) { nv[s] = 0; continue; }
          var best = -Infinity;
          for (var a = 0; a < 4; a++) {
            var t = step(s, a);
            var v = t.r + g * V[t.ns];
            if (v > best) best = v;
          }
          nv[s] = best;
          d = Math.max(d, Math.abs(nv[s] - V[s]));
        }
        V = nv;
        if (d < 1e-9) break;
      }
      return V;
    }

    function qLearning(g, episodes) {
      var rnd = mulberry32(12345);
      var Q = new Float64Array(N * 4);
      var alpha = 0.1, eps = 0.15;
      for (var e = 0; e < episodes; e++) {
        var s = Math.floor(N / 2);
        for (var t = 0; t < 200; t++) {
          if (isTerminal(s)) break;
          var a;
          if (rnd() < eps) a = Math.floor(rnd() * 4);
          else {
            a = 0; var b = -Infinity;
            for (var i = 0; i < 4; i++) { if (Q[s * 4 + i] > b) { b = Q[s * 4 + i]; a = i; } }
          }
          var tr = step(s, a);
          var target = tr.r + (isTerminal(tr.ns) ? 0 : g * Math.max.apply(null, [0, 1, 2, 3].map(function (k) { return Q[tr.ns * 4 + k]; })));
          Q[s * 4 + a] += alpha * (target - Q[s * 4 + a]);
          s = tr.ns;
        }
      }
      return Q;
    }

    function draw(V, Q) {
      var T = theme();
      var s = setupCanvas(canvas, Math.max(190, rows * 62));
      var ctx = s.ctx, W = s.w, H = s.h;
      var cell = Math.min((W - 20) / cols, (H - 10) / rows);
      var ox = (W - cell * cols) / 2, oy = (H - cell * rows) / 2;

      ctx.font = '11px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var x = ox + c * cell, y = oy + r * cell;
          var term = isTerminal(idx);
          ctx.fillStyle = term ? T.rule : T.paper;
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = T.rule; ctx.lineWidth = 1;
          ctx.strokeRect(x + .5, y + .5, cell, cell);

          if (term) {
            ctx.fillStyle = T.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.fillText(r === 0 && c === 0 ? '终点' : '终点', x + cell / 2, y + cell / 2);
            continue;
          }

          var val = Q ? Math.max.apply(null, [0, 1, 2, 3].map(function (k) { return Q[idx * 4 + k]; })) : V[idx];
          ctx.fillStyle = T.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.font = '11px ui-monospace, Menlo, monospace';
          ctx.fillText(val.toFixed(2), x + cell / 2, y + 5);

          var bestA = 0, bv = -Infinity;
          for (var a = 0; a < 4; a++) {
            var q = Q ? Q[idx * 4 + a] : (function () { var t = step(idx, a); return t.r + (+gamma.value) * V[t.ns]; })();
            if (q > bv) { bv = q; bestA = a; }
          }
          var cx = x + cell / 2, cy = y + cell * 0.68, L = cell * 0.2;
          var dx = [0, 1, 0, -1][bestA], dy = [-1, 0, 1, 0];
          ctx.strokeStyle = T.accent; ctx.fillStyle = T.accent; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * L, cy + dy * L); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + dx * L, cy + dy * L);
          ctx.lineTo(cx + dx * L - dy * L * 0.42 - dx * L * 0.28, cy + dy * L - dx * L * 0.42 - dy * L * 0.28);
          ctx.lineTo(cx + dx * L + dy * L * 0.42 - dx * L * 0.28, cy + dy * L + dx * L * 0.42 - dy * L * 0.28);
          ctx.closePath(); ctx.fill();
        }
      }
    }

    function compute() {
      var g = +gamma.value;
      if (mode === 'q-learning') {
        var episodes = +ep.value;
        draw(null, qLearning(g, episodes));
        cap.innerHTML = '训练 ' + episodes +
          ' 回合后，箭头已经能从任意格子走回左上角终点。' +
          '把回合数拉到最低，有些格子的策略仍然是错的，Q-learning 需要足够的探索覆盖。' +
          '格子里的数字是 <em>max<sub>a</sub> Q(s,a)</em>，也就是该状态的价值估计。';
      } else {
        draw(valueIteration(g), null);
        cap.innerHTML = '格子里的数字是 V(s)，箭头是最优动作。' +
          'γ 越大，远离终点的格子价值越低：每步 −1 打折得越少，等于看得更远。' +
          'γ 调到 0.5 附近，远处格子的价值趋近于只看眼前一步。' +
          '折扣因子控制的就是规划视野。';
      }
    }

    var timer = null;
    function schedule() { clearTimeout(timer); timer = setTimeout(compute, 120); }
    gamma.addEventListener('input', function () { gammaVal.textContent = (+gamma.value).toFixed(2); schedule(); });
    if (ep) ep.addEventListener('input', function () { epVal.textContent = ep.value; schedule(); });
    runBtn.addEventListener('click', compute);
    compute();
  }

  /* ---------------- 随机游走：MC vs TD ---------------- */

  function simRandomWalk(fig) {
    var states = +(fig.dataset.states || 5);
    var defaultRuns = +(fig.dataset.runs || 100);
    var total = states + 2;               // 0 与 states+1 为终止状态
    var start = Math.floor(total / 2);
    var trueV = [];
    for (var i = 0; i < total; i++) trueV.push(i / (states + 1));

    fig.appendChild(el('p', 'sim-title', '交互演示 · 随机游走：MC 与 TD(0) 的价值估计误差'));
    var controls = el('div', 'sim-controls');
    var mcWrap = el('label');
    mcWrap.appendChild(document.createTextNode('MC α'));
    var mcA = document.createElement('input');
    mcA.type = 'range'; mcA.min = '0.01'; mcA.max = '0.3'; mcA.step = '0.01'; mcA.value = '0.02';
    var mcVal = el('span', 'sim-val', '0.02');
    mcWrap.appendChild(mcA); mcWrap.appendChild(mcVal);

    var tdWrap = el('label');
    tdWrap.appendChild(document.createTextNode('TD α'));
    var tdA = document.createElement('input');
    tdA.type = 'range'; tdA.min = '0.01'; tdA.max = '0.5'; tdA.step = '0.01'; tdA.value = '0.1';
    var tdVal = el('span', 'sim-val', '0.10');
    tdWrap.appendChild(tdA); tdWrap.appendChild(tdVal);

    var runsWrap = el('label');
    runsWrap.appendChild(document.createTextNode('实验轮数'));
    var runs = document.createElement('input');
    runs.type = 'range'; runs.min = '20'; runs.max = '300'; runs.step = '20'; runs.value = String(defaultRuns);
    var runsVal = el('span', 'sim-val', String(defaultRuns));
    runsWrap.appendChild(runs); runsWrap.appendChild(runsVal);

    var runBtn = el('button', 'btn btn-primary', '重新采样');
    controls.appendChild(mcWrap); controls.appendChild(tdWrap); controls.appendChild(runsWrap); controls.appendChild(runBtn);
    fig.appendChild(controls);

    var canvas = document.createElement('canvas');
    fig.appendChild(canvas);
    var cap = el('p', 'sim-caption');
    fig.appendChild(cap);

    var CHECK = [0, 1, 2, 3, 4, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];

    function episode(rnd) {
      var s = start, path = [];
      while (true) {
        s += rnd() < 0.5 ? -1 : 1;
        path.push(s);
        if (s === 0 || s === total - 1) break;
      }
      return path;
    }

    function compute() {
      var T = theme();
      var nRuns = +runs.value, aMc = +mcA.value, aTd = +tdA.value;
      var mcErr = new Float64Array(CHECK.length);
      var tdErr = new Float64Array(CHECK.length);

      for (var r = 0; r < nRuns; r++) {
        var rnd = mulberry32(777 + r * 104729);
        var Vmc = new Float64Array(total);
        var Vtd = new Float64Array(total);
        var ci = 0;
        for (var e = 1; e <= CHECK[CHECK.length - 1]; e++) {
          var path = episode(rnd);
          var G = path[path.length - 1] === total - 1 ? 1 : 0;
          // MC：从后往前，对路径上每个非终止状态做常数 α 更新
          for (var k = path.length - 1; k >= 0; k--) {
            var st = path[k];
            if (st !== 0 && st !== total - 1) Vmc[st] += aMc * (G - Vmc[st]);
          }
          // TD(0)：沿路径前向
          var s0 = start;
          for (var j = 0; j < path.length; j++) {
            var s1 = path[j];
            var rew = s1 === total - 1 ? 1 : 0;
            Vtd[s0] += aTd * (rew + Vtd[s1] - Vtd[s0]);
            s0 = s1;
          }
          if (e === CHECK[ci]) {
            var e1 = 0, e2 = 0;
            for (var q = 1; q < total - 1; q++) {
              e1 += Math.pow(Vmc[q] - trueV[q], 2);
              e2 += Math.pow(Vtd[q] - trueV[q], 2);
            }
            mcErr[ci] += Math.sqrt(e1 / (total - 2));
            tdErr[ci] += Math.sqrt(e2 / (total - 2));
            ci++;
          }
        }
      }

      var series = [
        { name: 'MC (常数 α=' + aMc.toFixed(2) + ')', color: T.accent2, data: CHECK.map(function (c, i) { return [c, mcErr[i] / nRuns]; }) },
        { name: 'TD(0) (α=' + aTd.toFixed(2) + ')', color: T.accent, data: CHECK.map(function (c, i) { return [c, tdErr[i] / nRuns]; }) },
      ];
      drawChart(canvas, {
        series: series, logX: true, xLabel: '回合数 (对数刻度)',
        yLabel: '价值估计 RMS 误差', height: 260, yMinZero: true,
      });
      cap.innerHTML = '这是 Sutton &amp; Barto 图 6.2 的复现。' +
        '回合数少时 MC 误差很大，因为它必须等回合结束拿到完整回报才能更新，方差高。' +
        'TD(0) 用下一步的估计自举（bootstrapping），单步就能更新，收敛快得多。' +
        '把 MC 的 α 调小，它最终能收敛到更低的误差：TD 赢在效率，MC 赢在极限精度，这就是偏差-方差权衡。';
      legend(cap, series.map(function (s2) { return { name: s2.name, color: s2.color }; }));
    }

    var timer = null;
    function schedule() { clearTimeout(timer); timer = setTimeout(compute, 140); }
    mcA.addEventListener('input', function () { mcVal.textContent = (+mcA.value).toFixed(2); schedule(); });
    tdA.addEventListener('input', function () { tdVal.textContent = (+tdA.value).toFixed(2); schedule(); });
    runs.addEventListener('input', function () { runsVal.textContent = runs.value; schedule(); });
    runBtn.addEventListener('click', compute);
    compute();
  }

  /* ---------------- 派发 ---------------- */

  var SIMS = { bandit: simBandit, gridworld: simGridworld, 'random-walk': simRandomWalk };

  function init(root) {
    var figs = root.querySelectorAll('.sim');
    var n = 0;
    Array.prototype.forEach.call(figs, function (fig) {
      var kind = fig.dataset.sim;
      var fn = SIMS[kind];

      if (!fn) {
        if (fig.dataset.simReady === '1') return;
        fig.dataset.simReady = '1';
        fig.appendChild(el('p', 'sim-caption',
          '（未知的演示组件：' + kind + '，可用值见 COURSE-SPEC.md 第 8 节）'));
        return;
      }

      // resize 会再次调用本函数：重绘前必须先清空，否则组件会一层层堆叠。
      if (fig.dataset.simReady === '1') fig.innerHTML = '';
      fig.dataset.simReady = '1';

      try { fn(fig); n++; } catch (e) {
        fig.appendChild(el('p', 'sim-caption', '演示渲染失败：' + (e && e.message ? e.message : e)));
      }
    });
    return n;
  }

  // 窗口尺寸变化时按新宽度重画（防抖）。init() 自己负责清空旧内容。
  var rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { init(document); }, 250);
  });

  window.RLSim = { init: init };
})();
