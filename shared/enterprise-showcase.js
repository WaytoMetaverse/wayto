/* 企業宇宙 · 系統互動體驗（enterprise-showcase.html）
   1. 開場：捲動時，散落的訊息、表單一件件飛進後台對應的格子（灰色骨架 → 內容）
   2. 親手點一遍：三個情境，在重現的系統畫面上按按鈕一步步走完流程；加盟展店是實際操作影片 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('es-js');

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(v, a, b) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* ───────── 1. 開場 ───────── */
  var hero = document.querySelector('.es-hero');
  if (hero) (function () {
    var stage = hero.querySelector('.es-stage');
    var wrap = hero.querySelector('.es-sys-wrap');
    var sys = wrap.querySelector('.es-sys');
    var outro = wrap.querySelector('.es-outro');
    var slots = {};
    [].forEach.call(hero.querySelectorAll('[data-slot]'), function (el) { slots[el.dataset.slot] = el; });
    var items = [].map.call(hero.querySelectorAll('.es-frag'), function (el, i) {
      return { el: el, slot: slots[el.dataset.to], a: .2 + i * .04, r: parseFloat(el.style.getPropertyValue('--r')) || 0, dx: 0, dy: 0, hidden: false, on: false };
    });
    var fit = 1, P = -1, raf = 0;

    // 量碎片要飛去的位置：先把後台擺到最終狀態（只縮放到放得下），量完再交回 CSS 變數控制
    function measure() {
      wrap.style.transform = 'none';
      var gap = parseFloat(getComputedStyle(wrap).rowGap) || 0;
      fit = Math.min(1, wrap.clientHeight / (sys.offsetHeight + gap + outro.offsetHeight), wrap.clientWidth / sys.offsetWidth);
      wrap.style.transform = 'scale(' + fit + ')';
      var sr = stage.getBoundingClientRect();
      items.forEach(function (it) {
        it.hidden = !it.el.offsetParent;
        if (it.hidden) return;
        var tr = it.slot.getBoundingClientRect();
        it.dx = tr.left + tr.width / 2 - sr.left - it.el.offsetLeft;
        it.dy = tr.top + tr.height / 2 - sr.top - it.el.offsetTop;
      });
      wrap.style.transform = '';
      P = -1;
      tick();
    }

    function paint(p) {
      var io = 1 - smooth(p, .04, .2);
      stage.style.setProperty('--intro-o', io.toFixed(3));
      stage.style.setProperty('--intro-y', (-40 * (1 - io)).toFixed(1) + 'px');
      var s = smooth(p, .16, .46);
      stage.style.setProperty('--sys-o', s.toFixed(3));
      stage.style.setProperty('--sys-y', (36 * (1 - s)).toFixed(1) + 'px');
      stage.style.setProperty('--sys-s', ((.92 + .08 * s) * fit).toFixed(4));
      items.forEach(function (it) {
        var t = clamp((p - it.a) / .3, 0, 1);
        var e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        if (!it.hidden) {
          it.el.style.transform = 'translate(' + (it.dx * e).toFixed(1) + 'px,' + (it.dy * e).toFixed(1) + 'px) rotate(' +
            (it.r * (1 - e)).toFixed(2) + 'deg) scale(' + (1 - .62 * e).toFixed(3) + ')';
          it.el.style.opacity = (1 - smooth(t, .62, .95)).toFixed(3);
        }
        var on = t > .82;
        if (on !== it.on) { it.on = on; it.slot.classList.toggle('is-in', on); }
      });
      stage.style.setProperty('--out-o', smooth(p, .78, .92).toFixed(3));
    }

    function frame() {
      raf = 0;
      var span = hero.offsetHeight - window.innerHeight;
      var target = span > 0 ? clamp(-hero.getBoundingClientRect().top / span, 0, 1) : 1;
      P = P < 0 || reduce ? target : P + (target - P) * .14;
      if (Math.abs(target - P) < .0005) P = target;
      else raf = requestAnimationFrame(frame);
      paint(P);
    }
    function tick() { if (!raf) raf = requestAnimationFrame(frame); }

    window.addEventListener('scroll', tick, { passive: true });
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(measure, 120); });
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  })();

  /* ───────── 2. 親手點一遍 ───────── */
  var tabs = [].slice.call(document.querySelectorAll('.es-tabs [role="tab"]'));
  if (!tabs.length) return;
  var scns = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var cur = 0;
  var sims = scns.map(initSim);

  function select(i, focus) {
    if (i === cur) return;
    tabs.forEach(function (t, j) {
      t.setAttribute('aria-selected', j === i ? 'true' : 'false');
      t.tabIndex = j === i ? 0 : -1;
    });
    sims[cur].leave();
    scns.forEach(function (s, j) { s.hidden = j !== i; });
    cur = i;
    sims[i].enter();
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(i); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select((cur + d + tabs.length) % tabs.length, true);
    });
  });
  sims[0].enter();

  function initSim(scn) {
    var kind = scn.dataset.scn;
    var steps = [].slice.call(scn.querySelectorAll('.es-steps li'));
    var scrs = [].slice.call(scn.querySelectorAll('.es-scr'));
    var phone = scn.querySelector('.es-phone');
    var device = scn.querySelector('.es-device');
    var toastEl = scn.querySelector('.es-toast');
    var prev = scn.querySelector('.es-ctrl-prev'), next = scn.querySelector('.es-ctrl-next'), num = scn.querySelector('.es-ctrl-n b');
    var vids = [].slice.call(scn.querySelectorAll('video'));
    // 畫面每次進來都從初始狀態開始；跨畫面要延續的選擇（時段、付款方式）記在 state
    var tpl = phone ? scrs.map(function (s) { return s.innerHTML; }) : null;
    var state = { time: '14:00', payTag: '📱 LINE PAY', meal: 'A' };
    var at = 0, active = false, visible = false, wait = 0, toastT = 0, pending = null;

    function toast(msg) {
      if (!toastEl || !msg) return;
      toastEl.querySelector('span').textContent = msg;
      toastEl.classList.add('on');
      clearTimeout(toastT);
      toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 1900);
    }

    function carry(scr) { // 把前面選的時段、付款方式、餐點帶進這個畫面
      [].forEach.call(scr.querySelectorAll('[data-meal]'), function (el) { el.textContent = state.meal; });
      var h = parseInt(state.time, 10), m = state.time.slice(3);
      var end = (h + 2) + ':' + m;
      [].forEach.call(scr.querySelectorAll('[data-time]'), function (el) { el.textContent = state.time + ' - ' + end; });
      [].forEach.call(scr.querySelectorAll('[data-end]'), function (el) { el.textContent = end; });
      [].forEach.call(scr.querySelectorAll('[data-paytag]'), function (el) { el.textContent = state.payTag; });
      var pay = scr.querySelector('.se-pay');
      if (pay) [].forEach.call(pay.children, function (b) {
        var on = b.dataset.tag === state.payTag;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        if (on) scr.querySelector('.se-foot .es-go').textContent = b.dataset.label;
      });
    }

    function go(i) {
      clearTimeout(wait);
      at = clamp(i, 0, scrs.length - 1);
      scrs.forEach(function (s, j) {
        if (j === at && tpl) { s.innerHTML = tpl[j]; carry(s); }
        s.classList.toggle('on', j === at);
        s.setAttribute('aria-hidden', j === at ? 'false' : 'true');
        s.inert = j !== at;
      });
      steps.forEach(function (li, j) {
        li.classList.toggle('on', j === at);
        li.classList.toggle('done', j < at);
        li.querySelector('button').setAttribute('aria-current', j === at ? 'step' : 'false');
      });
      num.textContent = at + 1;
      prev.disabled = at === 0;
      next.textContent = at === scrs.length - 1 ? '換個情境 →' : '下一步 →';
      if (toastEl) toastEl.classList.remove('on');
      media();
    }
    function advance(delay) {
      clearTimeout(wait);
      wait = setTimeout(function () { if (at < scrs.length - 1) go(at + 1); }, delay);
    }

    // 只播放「目前情境 × 目前步驟 × 在畫面內」的那支影片
    function media() {
      vids.forEach(function (v) {
        var on = active && visible && v.closest('.es-scr') === scrs[at];
        if (on) {
          if (!v.src) {
            var small = window.matchMedia('(max-width: 720px)').matches || (navigator.connection && navigator.connection.saveData);
            v.src = v.dataset.src + (small ? '-m' : '') + '.mp4?r=1';
          }
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!v.paused) v.pause();
      });
    }

    function sign(row, msg) {
      var btn = row.querySelector('.rc-sign');
      if (!btn) return;
      var done = document.createElement('span');
      done.className = 'rc-done';
      done.innerHTML = '<svg class="es-i"><use href="#i-ok"/></svg>已簽到';
      btn.replaceWith(done);
      var meta = row.querySelector('small');
      var t = '19:0' + (5 + row.parentNode.querySelectorAll('.is-new').length);
      meta.className = '';
      meta.textContent = (msg || meta.textContent) + ' · ' + t + ' 簽到';
      row.classList.add('is-in', 'is-new');
      var scr = row.closest('.es-scr');
      var c = scr.querySelector('[data-count]'), own = scr.querySelector('[data-own]');
      var n = parseInt(c.textContent, 10) + 1;
      c.textContent = n;
      own.textContent = parseInt(own.textContent, 10) + 1;
      scr.querySelector('[data-pct]').textContent = Math.round(n / 30 * 100) + '%';
      scr.querySelector('[data-bar]').style.width = (n / 30 * 100).toFixed(1) + '%';
    }

    function act(name, b, scr) {
      if (name === 'next') {
        b.disabled = true;
        toast(b.dataset.toast);
        advance(b.dataset.toast ? 1000 : 260);
      } else if (name === 'open') {
        var m = scr.querySelector('.se-modal-wrap');
        m.hidden = false;
        b.disabled = true;
        m.querySelector('.es-go').focus({ preventScroll: true });
      } else if (name === 'sign') {
        var row = b.closest('li');
        if (row.hasAttribute('data-unpaid')) {
          pending = row;
          var d = scr.querySelector('.rc-dialog-wrap');
          d.hidden = false;
          d.querySelector('.es-go').focus({ preventScroll: true });
        } else sign(row);
      } else if (name === 'collect' || name === 'plain') {
        scr.querySelector('.rc-dialog-wrap').hidden = true;
        if (pending) sign(pending, name === 'collect' ? '已收款 NT$500' : '社員');
        pending = null;
        if (name === 'collect') { toast('已記入財務收入'); advance(1400); }
      } else if (name === 'in' || name === 'pay') { // 磐石簽到管理：點簽到、標繳費（繳費同時記進財務）
        var cell = scr.querySelector(name === 'in' ? '[data-in]' : '[data-unpaid]');
        cell.textContent = parseInt(cell.textContent, 10) + (name === 'in' ? 1 : -1);
        var tag = document.createElement('span');
        tag.className = 'hc-tg ' + (name === 'in' ? 'in' : 'paid');
        tag.textContent = name === 'in' ? '✓ 已簽到' : '$ 已繳費';
        var tr = b.closest('.hc-tr');
        b.replaceWith(tag);
        if (name === 'pay') toast('已記入財務：' + b.dataset.cat + ' NT$' + b.dataset.amt);
        if (tr.hasAttribute('data-me') && !tr.querySelector('button')) advance(1700);
      } else if (name === 'done') {
        b.disabled = true;
        toast(b.dataset.toast);
        var mw = scr.querySelector('.se-modal-wrap');
        if (mw) { // SpaceEase：簽退送出 → 預約變成已完成
          mw.hidden = true;
          var badge = scr.querySelector('[data-badge]');
          badge.className = 'se-badge se-badge--done';
          badge.textContent = '已完成';
          var acts = scr.querySelector('[data-acts]');
          var p = document.createElement('p');
          p.className = 'se-acts-done';
          p.textContent = '簽退完成 · 訂金待品牌方確認後退還';
          acts.replaceWith(p);
        }
      }
    }

    scn.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !scn.contains(b) || b.disabled) return;
      var li = b.closest('.es-steps li');
      if (li) { go(steps.indexOf(li)); return; }
      if (b === prev) { go(at - 1); return; }
      if (b === next) { if (at === scrs.length - 1) select((cur + 1) % tabs.length); else go(at + 1); return; }
      var scr = b.closest('.es-scr');
      if (!scr || scr !== scrs[at]) return;
      var group = b.closest('[role="radiogroup"]');
      if (group && b.getAttribute('role') === 'radio') {
        [].forEach.call(group.querySelectorAll('[role="radio"]'), function (o) {
          o.setAttribute('aria-checked', o === b ? 'true' : 'false');
          o.classList.toggle('on', o === b);
          o.classList.remove('es-hint');
        });
        if (group.classList.contains('se-times')) { // 選了開始時間才能下一步
          state.time = b.firstChild.textContent.trim();
          scr.querySelector('.se-foot .es-go').disabled = false;
        } else if (group.classList.contains('se-pay')) {
          state.payTag = b.dataset.tag;
          scr.querySelector('.se-foot .es-go').textContent = b.dataset.label;
        } else if (group.classList.contains('hc-meals')) { // 選了餐點才能送出報名
          state.meal = b.dataset.code;
          scr.querySelector('.hc-acts .es-go').disabled = false;
        }
        return;
      }
      if (b.dataset.act) act(b.dataset.act, b, scr);
    });

    // 手機外框依可用寬度縮放（內部畫面以 360×720 設計）
    function size() {
      if (!phone) return;
      var w = device.clientWidth;
      var k = Math.min(window.innerWidth > 1100 ? .8889 : .8, (w - 20) / 360);
      if (w > 0) phone.style.setProperty('--k', k.toFixed(4));
    }
    window.addEventListener('resize', size);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        media();
      }, { threshold: .25 }).observe(device);
    } else visible = true;

    return {
      enter: function () { active = true; size(); go(at); },
      leave: function () { active = false; clearTimeout(wait); media(); }
    };
  }
})();
