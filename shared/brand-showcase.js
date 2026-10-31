/* 品牌宇宙 · 換材試玩：拖曳中間的線比對前後（左邊原始照片、右邊換材後），點右側範例換一組結果；
   第一次捲到時自己左右示範一次，讓人知道可以拖 */
(function () {
  'use strict';

  var view = document.querySelector('.bs-swap-view');
  if (!view) return;
  var after = view.querySelector('.bs-swap-after');
  var handle = view.querySelector('.bs-swap-handle');
  var btns = [].slice.call(document.querySelectorAll('.bs-swap-list button'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var x = 50, dragging = false, touched = false, hint = 0;

  function set(v) {
    x = Math.max(0, Math.min(100, v));
    view.style.setProperty('--x', x.toFixed(2) + '%');
    handle.setAttribute('aria-valuenow', Math.round(x));
  }
  function at(e) {
    var r = view.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * 100;
  }

  view.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    dragging = touched = true;
    cancelAnimationFrame(hint);
    view.setPointerCapture(e.pointerId);
    set(at(e));
  });
  view.addEventListener('pointermove', function (e) { if (dragging) set(at(e)); });
  ['pointerup', 'pointercancel'].forEach(function (t) { view.addEventListener(t, function () { dragging = false; }); });

  handle.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowLeft' ? -5 : e.key === 'ArrowRight' ? 5 : e.key === 'Home' ? -100 : e.key === 'End' ? 100 : 0;
    if (!d) return;
    e.preventDefault();
    touched = true;
    cancelAnimationFrame(hint);
    set(x + d);
  });

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-pressed') === 'true') return;
      btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      // 手機上範例排成一列橫向捲動：點到只露出一半的那顆，就把它捲進來
      var list = b.parentNode, lr = list.getBoundingClientRect(), br = b.getBoundingClientRect(), pad = 14;
      var dx = br.left < lr.left + pad ? br.left - lr.left - pad : br.right > lr.right - pad ? br.right - lr.right + pad : 0;
      if (dx && list.scrollWidth > list.clientWidth) list.scrollBy({ left: dx, behavior: 'smooth' });
      var src = after.src.replace(/[^/]+\.webp/, b.dataset.src + '.webp');
      after.classList.add('is-loading');
      var img = new Image();
      img.onload = function () {
        after.src = src;
        after.alt = b.dataset.alt;
        after.classList.remove('is-loading');
      };
      img.src = src;
    });
  });

  // 捲到時示範：線從中間往左、往右各走一趟再回中間（約 2.4 秒，緩起緩停）
  function demo() {
    if (reduce || touched) return;
    var t0 = performance.now(), D = 2400;
    (function step(now) {
      if (touched) return;
      var t = Math.min((now - t0) / D, 1);
      set(50 + 22 * Math.sin(t * Math.PI * 2) * (1 - t * .15));
      if (t < 1) hint = requestAnimationFrame(step); else set(50);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); setTimeout(demo, 500); }
    }, { threshold: .6 });
    io.observe(view);
  }
  set(50);
})();
