/* ==========================================================================
   选择题组件（quiz widget）
   把课程里声明式的 .mcq 块变成可点、即时反馈、可重做的检索练习。
   声明式写法见 COURSE-SPEC.md 第 5 节 —— 这里不再重复。
   ========================================================================== */

(function () {
  'use strict';

  var KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var store = window.RLStore;

  /* 把 <li> 文本转成一个可点的选项按钮 */
  function makeOption(text, index) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mcq-opt';
    btn.dataset.index = String(index);

    var key = document.createElement('span');
    key.className = 'mcq-key';
    key.textContent = KEYS[index] || String(index + 1);

    var label = document.createElement('span');
    label.className = 'mcq-label';
    label.innerHTML = text;

    btn.appendChild(key);
    btn.appendChild(label);
    return btn;
  }

  /**
   * 初始化一个 .mcq 块。
   * @param {HTMLElement} mcq
   * @param {string} qid  形如 "0007-mcq-1"，用于记录进度
   * @param {function} onResult 回调 (qid, correct)
   */
  function initOne(mcq, qid, onResult) {
    if (mcq.dataset.wired === '1') return;
    mcq.dataset.wired = '1';

    var list = mcq.querySelector('.mcq-options');
    if (!list) return;

    var answer = parseInt(mcq.dataset.answer, 10);
    if (!(answer >= 0)) return;

    var items = Array.prototype.slice.call(list.querySelectorAll('li'));
    var explain = mcq.querySelector('.mcq-explain');

    var buttons = items.map(function (li, i) {
      var original = li.innerHTML;
      var btn = makeOption(original, i);
      li.textContent = '';
      li.appendChild(btn);
      return btn;
    });

    var firstTry = true;
    var retry = null;

    function lock(correct) {
      buttons.forEach(function (b) { b.disabled = true; });
      var chosen = buttons[answer];
      chosen.classList.add('is-correct');
      buttons.forEach(function (b, i) {
        if (i === answer) return;
        if (b.dataset.picked === '1') b.classList.add('is-wrong');
        else b.classList.add('is-dim');
      });
      mcq.classList.add('is-answered');

      if (firstTry && typeof onResult === 'function') onResult(qid, correct);
      firstTry = false;

      if (!retry) {
        retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'mcq-retry';
        retry.textContent = '再试一次';
        retry.addEventListener('click', reset);
        (explain || mcq).appendChild(retry);
      }
    }

    function reset() {
      buttons.forEach(function (b) {
        b.disabled = false;
        b.classList.remove('is-correct', 'is-wrong', 'is-dim');
        delete b.dataset.picked;
      });
      mcq.classList.remove('is-answered');
    }

    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        btn.dataset.picked = '1';
        lock(i === answer);
      });
    });

    // 已答对过的题：显示"已掌握"提示，但不剧透
    var done = store && store.isMcqCorrect(qid);
    if (done) {
      var badge = document.createElement('span');
      badge.className = 'code-status is-pass';
      badge.style.cssText = 'float:right;font-size:.75rem;margin-left:.5rem';
      badge.textContent = '✓ 已答对';
      var q = mcq.querySelector('.mcq-q');
      if (q) q.appendChild(badge);
    }
  }

  /**
   * 扫描容器里所有选择题。
   * @param {HTMLElement} root
   * @param {string} lessonNumber 形如 "0007"
   * @param {function} onResult
   * @returns {number} 找到的题数
   */
  function init(root, lessonNumber, onResult) {
    var list = root.querySelectorAll('.mcq');
    Array.prototype.forEach.call(list, function (mcq, i) {
      var qid = lessonNumber + '-mcq-' + (i + 1);
      initOne(mcq, qid, onResult);
    });
    return list.length;
  }

  window.RLQuiz = { init: init };
})();
