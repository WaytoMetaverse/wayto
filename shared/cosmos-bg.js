/* Cosmos 子頁背景：多層視差星空 + 宇宙色星雲，捲動越快星星拉成光速線；
   另附進場動畫（.cx-rv）、卡片傾斜（.cx-tilt）與游標光暈 */
(function () {
  'use strict';

  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function hexToRgb(hex, fallback) {
    var m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return fallback;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var accent = hexToRgb(getComputedStyle(body).getPropertyValue('--c'), [122, 162, 255]);
  var brand = [122, 162, 255];

  /* ── 星空 ── */
  var canvas = document.createElement('canvas');
  canvas.id = 'cx-sky';
  canvas.setAttribute('aria-hidden', 'true');
  body.insertBefore(canvas, body.firstChild);
  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, stars = [], nebula = null;

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function build() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var n = Math.max(220, Math.min(900, Math.round(W * H / 2400)));
    stars = [];
    for (var i = 0; i < n; i++) {
      var z = Math.pow(Math.random(), 1.8);
      var tint = Math.random();
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: z,
        r: 0.4 + z * 1.5 + (Math.random() < 0.03 ? 1.2 : 0),
        ph: Math.random() * Math.PI * 2,
        c: tint < 0.12 ? accent : tint < 0.3 ? [190, 210, 255] : [255, 255, 255]
      });
    }

    // 星雲預先畫在離屏 canvas，比畫面高，捲動時緩緩漂移
    nebula = document.createElement('canvas');
    var nh = Math.round(H * 1.6);
    nebula.width = Math.max(1, Math.round(W / 2));
    nebula.height = Math.max(1, Math.round(nh / 2));
    var g = nebula.getContext('2d');
    g.scale(0.5, 0.5);
    [[0.82, 0.16, 0.55, accent, 0.2], [0.1, 0.5, 0.5, brand, 0.12], [0.6, 0.86, 0.6, accent, 0.1], [0.3, 0.05, 0.35, [199, 125, 255], 0.06]].forEach(function (b) {
      var cx = b[0] * W, cy = b[1] * nh, r = b[2] * Math.max(W, H);
      var grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grd.addColorStop(0, rgba(b[3], b[4]));
      grd.addColorStop(1, rgba(b[3], 0));
      g.fillStyle = grd;
      g.fillRect(0, 0, W, nh);
    });
  }

  var scrollY = window.scrollY, lastScroll = scrollY, vel = 0, t = 0, last = performance.now();
  var mx = 0, my = 0, tmx = 0, tmy = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - H);
    var prog = Math.min(1, scrollY / maxScroll);
    if (nebula) ctx.drawImage(nebula, 0, -prog * H * 0.6, W, H * 1.6);

    var streak = Math.min(Math.abs(vel) * 0.9, 90);
    var dir = vel >= 0 ? 1 : -1;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var speed = 0.03 + s.z * 0.28;
      var y = ((s.y - scrollY * speed) % H + H) % H;
      var x = s.x + mx * s.z * 14;
      y += my * s.z * 10;
      var tw = reduce ? 1 : 0.6 + 0.4 * Math.sin(t * 1.6 + s.ph);
      var a = (0.25 + s.z * 0.75) * tw;
      if (streak > 2 && s.z > 0.15) {
        ctx.strokeStyle = rgba(s.c, a * 0.85);
        ctx.lineWidth = s.r;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + dir * streak * s.z);
        ctx.stroke();
      } else if (s.r > 1.4) {
        ctx.fillStyle = rgba(s.c, a);
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = rgba(s.c, a);
        ctx.fillRect(x, y, s.r * 1.4, s.r * 1.4);
      }
    }
  }

  function loop(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    scrollY = window.scrollY;
    var v = (scrollY - lastScroll) / Math.max(dt, 0.001) / 60;
    lastScroll = scrollY;
    vel += (v - vel) * 0.18;
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    draw();
    if (cursor) {
      gx += (gtx - gx) * 0.12;
      gy += (gty - gy) * 0.12;
      cursor.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
    }
    requestAnimationFrame(loop);
  }

  /* ── 游標光暈 ── */
  var cursor = null, gx = 0, gy = 0, gtx = 0, gty = 0;
  if (fine && !reduce) {
    cursor = document.createElement('div');
    cursor.className = 'cx-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    body.insertBefore(cursor, canvas.nextSibling);
    window.addEventListener('pointermove', function (e) {
      gtx = e.clientX; gty = e.clientY;
      tmx = e.clientX / W * 2 - 1; tmy = e.clientY / H * 2 - 1;
      cursor.classList.add('on');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('on'); });
  }

  var resizeId = 0, lastW = 0, lastH = 0;
  function onResize() {
    // 手機網址列伸縮造成的小幅高度變化不重建
    if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    build();
    if (reduce) draw();
  }
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeId);
    resizeId = requestAnimationFrame(onResize);
  });
  onResize();

  if (reduce) {
    var pending = false;
    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; scrollY = window.scrollY; draw(); });
    }, { passive: true });
    draw();
  } else {
    requestAnimationFrame(loop);
  }

  /* ── 進場動畫：只隱藏畫面外的 .cx-rv，避免首屏閃爍 ── */
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('cx-pending');
        io.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.cx-rv').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.94) return;
      el.classList.add('cx-pending');
      io.observe(el);
    });
  }

  /* ── 卡片傾斜 ── */
  if (fine && !reduce) {
    document.querySelectorAll('.cx-tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((x - 0.5) * 6).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }
})();
