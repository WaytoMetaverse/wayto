/* 設計宇宙 · 720° 環景：預設只放縮圖，點一下才載入 3D66 的環景播放器；右側（手機在下方）切換不同作品 */
(function () {
  'use strict';

  var frame = document.querySelector('.ds-vr-frame');
  if (!frame) return;
  var img = frame.querySelector('img');
  var play = frame.querySelector('.ds-vr-play');
  var btns = [].slice.call(document.querySelectorAll('.ds-vr-list button'));
  var iframe = null;

  function current() {
    for (var i = 0; i < btns.length; i++) if (btns[i].getAttribute('aria-pressed') === 'true') return btns[i];
    return btns[0];
  }

  function open() {
    var b = current();
    iframe = document.createElement('iframe');
    iframe.src = b.dataset.src;
    iframe.title = b.textContent.trim() + ' 720 度環景';
    iframe.allow = 'fullscreen; gyroscope; accelerometer; xr-spatial-tracking';
    iframe.allowFullscreen = true;
    frame.appendChild(iframe);
    img.hidden = true;
    play.hidden = true;
  }

  play.addEventListener('click', open);
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-pressed') === 'true') return;
      btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      // 手機上按鈕排成一列橫向捲動：點到只露出一半的那顆，就把它捲進來
      var list = b.parentNode, lr = list.getBoundingClientRect(), br = b.getBoundingClientRect(), pad = 14;
      var dx = br.left < lr.left + pad ? br.left - lr.left - pad : br.right > lr.right - pad ? br.right - lr.right + pad : 0;
      if (dx && list.scrollWidth > list.clientWidth) list.scrollBy({ left: dx, behavior: 'smooth' });
      img.src = b.dataset.thumb;
      img.alt = b.textContent.trim() + ' 720 度環景室內作品縮圖';
      if (iframe) { // 已經開著環景：直接換作品
        iframe.src = b.dataset.src;
        iframe.title = b.textContent.trim() + ' 720 度環景';
      }
    });
  });
})();
