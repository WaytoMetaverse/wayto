/* 建案宇宙 · 沉浸式建案展示
   1) .ps-theatre：滾一下推開星空中的小窗，再滾一下就以 WebGL 轉場（條碼 / 網點 / 穿越）換到下一幕；
      每一幕都是 Unreal 專案算出來的運鏡影片，輪到那一幕才播放；「街區」可以切換周邊地點
   2) 樣品屋：滾一下走到下一個空間；日照：影格跟著捲動播放
   沒有 WebGL 時退回 2D 淡入淡出；prefers-reduced-motion 或省流量時只放每段的首格畫面 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var portrait = window.matchMedia('(max-aspect-ratio: 4/5)');
  var dprCap = Math.min(window.devicePixelRatio || 1, 2);
  var BASE = 'uploads/property-showcase/';
  var REV = '?r=12'; // 素材重算後改這裡，避免讀到舊快取
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var stills = reduce || saveData;
  var small = Math.min(screen.width, screen.height) <= 820; // 手機、小平板用 960 寬的影片

  // id 對應 video/<id>.mp4、video/<id>-m.mp4 與首格畫面 poster/<id>.webp
  // focus: [橫式取景, 直式取景] 的 x/y（0–1，取景偏移量）；type: 由這一幕轉到下一幕的轉場
  // still: true 的幕沒有影片，只有成圖 poster/<id>.webp，畫面靠緩慢運鏡動起來；pan: 直式畫面橫移的起訖 focus x
  // 其他頁面（例如設計宇宙）可在 .ps-theatre 上用 data-scenes（JSON）、data-base、data-rev 換成自己的場景
  var SCENES = [
    { id: 's1-exterior', focus: [[0.5, 0.5], [0.52, 0.5]], type: 1 },
    { id: 's2-neighborhood', focus: [[0.5, 0.5], [0.5, 0.5]], type: 2 },
    { id: 's3-entrance', focus: [[0.5, 0.5], [0.5, 0.5]], type: 3 },
    { id: 's4-lobby', focus: [[0.5, 0.5], [0.5, 0.5]], type: 1 },
    { id: 's5-garden', focus: [[0.5, 0.5], [0.5, 0.5]], type: 2 },
    { id: 's6-amenity', focus: [[0.5, 0.5], [0.5, 0.5]], type: 0 }
  ];
  var INTRO = 1;      // 小窗推開所佔的捲動量（單位：一個視窗高）
  var LAST = 0.2;     // 最後一幕之後、離開釘住前的捲動量
  var STEP_MS = 1300; // 換一幕的轉場時間
  var DRIFT_MS = 26000; // 成圖幕的運鏡來回一趟的時間（等速、起訖緩，不晃）

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function sectionProgress(el) {
    var r = el.getBoundingClientRect();
    var len = r.height - window.innerHeight;
    return len > 0 ? clamp(-r.top / len, 0, 1) : 0;
  }

  /* ───────── 一格滾輪 = 一站 ─────────
     區塊釘住時接手滾輪、方向鍵與手指上下滑：一次手勢只走一站，觸控板的慣性滾動會被吃掉，停頓一下才接受下一次；
     第一站往上、最後一站往下則放行，照常捲出這一段。拖捲軸等其他捲動依捲動位置挑最近的一站。
     opt.count 站數；opt.frac(i) 第 i 站在區塊捲動範圍的位置（0–1）；opt.go(i, instant) 走過去，回傳要花幾毫秒 */
  function stepper(root, opt) {
    var S = opt.count, at = 0, busyUntil = 0, lastWheel = 0, acc = 0, latch = false, near = false;

    function pinned() {
      var r = root.getBoundingClientRect();
      return r.top <= 1 && r.bottom >= window.innerHeight - 1;
    }
    function stopY(i) {
      var top = root.getBoundingClientRect().top + window.pageYOffset;
      return Math.round(top + (root.offsetHeight - window.innerHeight) * opt.frac(i));
    }
    function go(i, instant) {
      i = clamp(i, 0, S - 1);
      at = i;
      busyUntil = performance.now() + (opt.go(i, instant) || 0);
    }
    function jump(i) { // 走過去，捲動位置也對齊那一站（瞬間對齊；舞台是釘住的，畫面不會跳）
      go(i);
      window.scrollTo({ top: stopY(at), behavior: 'instant' });
    }

    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || !pinned()) { acc = 0; latch = false; return; }
      var now = performance.now(), gap = now - lastWheel;
      lastWheel = now;
      var dir = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
      if (!dir) return;
      if (gap > 160) { latch = false; acc = 0; } // 停頓過 = 新的一次手勢
      var free = at + dir < 0 || at + dir > S - 1;
      if (free && !latch && now >= busyUntil) { acc = 0; return; }
      e.preventDefault();
      if (free || latch || now < busyUntil) return;
      acc += Math.abs(e.deltaY);
      if (acc >= 30) { acc = 0; latch = true; jump(at + dir); }
    }, { passive: false });

    window.addEventListener('keydown', function (e) {
      var k = e.key;
      var dir = (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) ? 1
        : (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) ? -1 : 0;
      var tag = document.activeElement && document.activeElement.tagName;
      if (!dir || !pinned() || /INPUT|TEXTAREA|SELECT|BUTTON|^A$/.test(tag)) return;
      if (at + dir < 0 || at + dir > S - 1) return;
      e.preventDefault();
      if (performance.now() >= busyUntil) jump(at + dir);
    });

    // 手機：一次滑動 = 一站。手指一開始往上下滑就接手（頁面不跟著捲），放開時滑超過 40px 才換站；
    // 左右滑（例如周邊地點按鈕列）、單純點按，或在第一站往回、最後一站往下滑，照常交給瀏覽器
    var ty = 0, tx = 0, tMode = -1; // 0 還沒判斷、1 接手、-1 放行
    window.addEventListener('touchstart', function (e) {
      tMode = e.touches.length === 1 ? 0 : -1;
      ty = e.touches[0].clientY; tx = e.touches[0].clientX;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (tMode < 0) return;
      if (tMode === 0) {
        var dy = ty - e.touches[0].clientY, dx = tx - e.touches[0].clientX;
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        var dir = dy > 0 ? 1 : -1;
        var free = at + dir < 0 || at + dir > S - 1;
        tMode = (Math.abs(dy) > Math.abs(dx) && pinned() && (!free || performance.now() < busyUntil)) ? 1 : -1;
        if (tMode < 0) return;
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchend', function (e) {
      if (tMode !== 1) { tMode = -1; return; }
      tMode = -1;
      var dy = ty - e.changedTouches[0].clientY, dir = dy > 0 ? 1 : -1;
      if (Math.abs(dy) > 40 && performance.now() >= busyUntil && at + dir >= 0 && at + dir <= S - 1) jump(at + dir);
    });
    window.addEventListener('touchcancel', function () { tMode = -1; });

    function onScroll() {
      var r = root.getBoundingClientRect();
      if (r.top >= window.innerHeight || r.bottom <= 0) { near = false; return; }
      var f = sectionProgress(root), best = 0;
      for (var i = 1; i < S; i++) if (Math.abs(opt.frac(i) - f) < Math.abs(opt.frac(best) - f)) best = i;
      if (best !== at) go(best, !near); // 從遠處跳進來（例如由下往上捲回來）就直接定位
      near = true;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return { jump: jump, at: function () { return at; } };
  }

  /* ───────── 場景渲染器：WebGL，失敗時退回 2D ───────── */
  var VERT = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uA,uB;',
    'uniform vec2 uRes,uSA,uSB,uFA,uFB;',
    'uniform float uZA,uZB,uP,uType,uDpr,uSeed;',
    'float h1(float n){return fract(sin(n*127.1)*43758.5453);}',
    'float h2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
    'float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    '  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*nz(p);p*=2.03;a*=.5;}return v;}',
    'float b2(vec2 a){return mod(2.*a.x+3.*a.y,4.);}',
    'float bayer(vec2 c){vec2 q=mod(c,4.);return(4.*b2(mod(q,2.))+b2(floor(q/2.))+.5)/16.;}',
    // object-fit: cover，focus 決定裁切偏移，zoom > 1 往內推
    'vec2 cover(vec2 uv,vec2 img,vec2 f,float z){float rs=uRes.x/uRes.y,ri=img.x/img.y;',
    '  vec2 s=rs>ri?vec2(1.,ri/rs):vec2(rs/ri,1.);s/=z;return(1.-s)*vec2(f.x,1.-f.y)+uv*s;}',
    'vec3 tx(sampler2D t,vec2 uv){return texture2D(t,clamp(uv,.001,.999)).rgb;}',
    'void main(){',
    '  vec2 uv=vUv;float p=uP;vec3 col;',
    '  if(uType<.5){',
    '    col=mix(tx(uA,cover(uv,uSA,uFA,uZA)),tx(uB,cover(uv,uSB,uFB,uZB)),p*p*(3.-2.*p));',
    '  }else if(uType<1.5){',
    // 條碼：一條條直線從自己的中心長開，由左往右帶點隨機掃過
    '    float n=floor(uRes.x/(uDpr*22.));float i=floor(uv.x*n);float fx=fract(uv.x*n);',
    '    float t0=uv.x*.55+h1(i+uSeed)*.33;float lp=clamp((p*1.4-t0)/.3,0.,1.);',
    '    float m=step(abs(fx-.5)*2.,lp);',
    '    vec2 ub=cover(uv,uSB,uFB,uZB);ub.y+=(1.-lp)*.05*(h1(i+7.)-.5);',
    '    vec2 ua=cover(uv,uSA,uFA,uZA);ua.y-=lp*.03*(h1(i+3.)-.5);',
    '    col=mix(tx(uA,ua),tx(uB,ub),m);',
    '    float edge=(1.-m)*step(abs(fx-.5)*2.,lp+.08)*step(.001,lp);',
    '    col=mix(col,vec3(.95,.88,.74),edge*.55);',
    '  }else if(uType<2.5){',
    // 網點：墨水般的雜訊場配上 Bayer 抖色，邊界帶像印刷網點
    '    float cs=uDpr*3.;vec2 cell=floor(gl_FragCoord.xy/cs);',
    '    float field=fbm(uv*vec2(3.2,2.2)+uSeed)*.6+(1.-uv.y)*.4;',
    '    float d=clamp((p*1.32-.16-field)/.16,0.,1.);',
    '    float m=step(bayer(cell),d);float band=1.-abs(d*2.-1.);',
    '    vec2 q=mix(uv,(cell+.5)*cs/uRes,step(.02,band));',
    '    col=mix(tx(uA,cover(q,uSA,uFA,uZA)),tx(uB,cover(q,uSB,uFB,uZB)),m);',
    '    vec3 ink=floor(col*4.+.5)/4.*vec3(1.04,.97,.86);col=mix(col,ink,band*.7);',
    '  }else{',
    // 穿越：前一幕向前推並拉出放射模糊，下一幕從遠處收進來
    '    float e=p*p*(3.-2.*p);vec2 c=vec2(.5);vec3 a=vec3(0.);',
    '    for(int k=0;k<6;k++){float s=1.+e*.55+float(k)*.022*e;a+=tx(uA,cover(c+(uv-c)/s,uSA,uFA,uZA));}',
    '    a/=6.;vec3 b=tx(uB,cover(c+(uv-c)*(1.22-.22*e),uSB,uFB,uZB));',
    '    col=mix(a,b,smoothstep(.3,.78,p));',
    '    col+=vec3(1.,.9,.75)*.18*sin(3.14159*p);',
    '  }',
    '  vec2 vq=(uv-.5)*vec2(uRes.x/uRes.y,1.);',
    '  col*=mix(.95,1.,smoothstep(1.1,.35,length(vq)));',
    '  col+=(h2(gl_FragCoord.xy+uSeed)-.5)*.02;',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function GLRenderer(canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('no webgl');
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['uA', 'uB', 'uRes', 'uSA', 'uSB', 'uFA', 'uFB', 'uZA', 'uZB', 'uP', 'uType', 'uDpr', 'uSeed'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
    gl.uniform1i(U.uA, 0);
    gl.uniform1i(U.uB, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    function blank() {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([11, 10, 9, 255]));
      return t;
    }
    var empty = blank();

    return {
      // 圖片或影片的當下畫面上傳成貼圖；傳入既有貼圖就原地更新（影片每格都會呼叫）
      upload: function (src, t) {
        if (!t) {
          t = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
          gl.bindTexture(gl.TEXTURE_2D, t);
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        return t;
      },
      draw: function (w, h, a, b, p, type, seed) {
        gl.viewport(0, 0, w, h);
        gl.uniform2f(U.uRes, w, h);
        gl.uniform1f(U.uDpr, dprCap);
        gl.uniform1f(U.uP, p);
        gl.uniform1f(U.uType, type);
        gl.uniform1f(U.uSeed, seed);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex || empty);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, b.tex || empty);
        gl.uniform2f(U.uSA, a.w || 16, a.h || 9); gl.uniform2f(U.uSB, b.w || 16, b.h || 9);
        gl.uniform2f(U.uFA, a.fx, a.fy); gl.uniform2f(U.uFB, b.fx, b.fy);
        gl.uniform1f(U.uZA, a.z); gl.uniform1f(U.uZB, b.z);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }

  function drawCover(ctx, img, w, h, fx, fy, z) {
    var ri = (img.naturalWidth || img.videoWidth) / (img.naturalHeight || img.videoHeight), rs = w / h;
    var dw = rs > ri ? w : h * ri, dh = rs > ri ? w / ri : h;
    dw *= z; dh *= z;
    ctx.drawImage(img, (w - dw) * fx, (h - dh) * fy, dw, dh);
  }

  function CanvasRenderer(canvas) {
    var ctx = canvas.getContext('2d');
    return {
      upload: function () { return true; },
      draw: function (w, h, a, b, p) {
        ctx.fillStyle = '#0b0a09'; ctx.fillRect(0, 0, w, h);
        var sa = a.live ? a.video : a.img, sb = b.live ? b.video : b.img;
        if (sa) drawCover(ctx, sa, w, h, a.fx, a.fy, a.z);
        if (sb && p > 0) { ctx.globalAlpha = ease(p); drawCover(ctx, sb, w, h, b.fx, b.fy, b.z); ctx.globalAlpha = 1; }
      }
    };
  }

  /* ───────── 1. 場景劇場 ───────── */
  function initTheatre(root) {
    if (root.dataset.scenes) SCENES = JSON.parse(root.dataset.scenes);
    if (root.dataset.base) BASE = root.dataset.base;
    if (root.dataset.rev) REV = root.dataset.rev;
    var stage = root.querySelector('.ps-stage');
    var canvas = root.querySelector('.ps-gl');
    var caps = [].slice.call(root.querySelectorAll('.ps-cap'));
    var rail = root.querySelector('.ps-rail');
    var N = SCENES.length;
    var units = INTRO + (N - 1) + LAST;
    root.style.setProperty('--units', units + 1);
    // 第 0 站是星空小窗，第 i 站（1…N）是第 i 幕全幅；u 是畫面所在的位置（單位：幕）
    var STOPS = [0];
    for (var j = 0; j < N; j++) STOPS.push(INTRO + j);

    caps.forEach(function (cap) { // 大字拆字，逐字升起
      var word = cap.querySelector('.ps-cap-word');
      var text = word.textContent.trim();
      word.setAttribute('aria-label', text);
      word.innerHTML = text.split('').map(function (c, n) {
        return '<span class="ch" aria-hidden="true"><i style="--n:' + n + '">' + c + '</i></span>';
      }).join('');
    });
    rail.innerHTML = SCENES.map(function () { return '<i></i>'; }).join('');
    var ticks = [].slice.call(rail.children);

    var renderer;
    try { renderer = GLRenderer(canvas); } catch (e) { renderer = CanvasRenderer(canvas); }

    // 影片放在舞台裡一個看不見的小盒子（iOS 不會替脫離文件的影片解碼）
    var dock = document.createElement('div');
    dock.className = 'ps-vdock';
    dock.setAttribute('aria-hidden', 'true');
    stage.appendChild(dock);

    var slots = SCENES.map(function () { return { img: null, video: null, tex: null, live: false, w: 0, h: 0, fx: .5, fy: .5, z: 1 }; });
    var W = 0, H = 0, queued = false, visible = true;

    // 直式螢幕（手機直拿）改用另外為直式構圖的影片與首格（<id>-p），不再從橫式影片中間裁一條
    var vert = portrait.matches;
    function vsrc(id) { return BASE + 'video/' + id + (vert ? '-p' : small ? '-m' : '') + '.mp4' + REV; }
    function psrc(id) { return BASE + 'poster/' + id + (vert && !still(id) ? '-p' : '') + '.webp' + REV; }
    function still(id) { // 成圖幕只有一張橫式成圖，直式畫面靠橫移看完整個房間
      for (var i = 0; i < N; i++) if (SCENES[i].id === id) return !!SCENES[i].still;
      return false;
    }

    function src(i) { return SCENES[i].alt || SCENES[i].id; } // 街區切到周邊地點時換成那支影片

    function poster(i) { // 首格畫面：影片還沒到之前先頂著
      var img = new Image(), want = psrc(src(i));
      img.decoding = 'async';
      img.onload = function () {
        if (psrc(src(i)) !== want) return; // 中途轉了方向或換了地點
        var s = slots[i];
        s.img = img;
        if (!s.live) { s.w = img.naturalWidth; s.h = img.naturalHeight; s.tex = renderer.upload(img, s.tex); }
        request();
      };
      img.src = want;
    }
    poster(0);
    window.addEventListener('load', function () { for (var i = 1; i < N; i++) poster(i); });

    function onTurn() { // 手機轉橫／轉直：換成對應方向的素材
      if (vert === portrait.matches) return;
      vert = portrait.matches;
      for (var i = 0; i < N; i++) {
        var s = slots[i];
        if (s.video) { s.live = false; s.video.src = vsrc(src(i)); s.video.load(); }
        poster(i);
      }
      request();
    }
    if (portrait.addEventListener) portrait.addEventListener('change', onTurn);
    else if (portrait.addListener) portrait.addListener(onTurn);

    function video(i) { // 輪到前一幕才建立，建立後開始緩衝
      var s = slots[i];
      if (stills || s.video || SCENES[i].still) return;
      var v = document.createElement('video');
      v.muted = v.defaultMuted = true;
      v.loop = v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.preload = 'auto';
      v.addEventListener('playing', function () {
        s.live = true; s.w = v.videoWidth; s.h = v.videoHeight; request();
      });
      v.src = vsrc(src(i));
      dock.appendChild(v);
      s.video = v;
    }

    /* 街區：切換周邊地點。舊畫面留在 fade 貼圖，新地點首格到了就用「穿越」轉場飛過去 */
    var fade = { img: null, tex: null, live: false, w: 0, h: 0, fx: .5, fy: .5, z: 1, i: -1, t0: 0 };
    var FADE_MS = 1100;
    function swap(i, id) {
      var s = slots[i];
      SCENES[i].alt = id === SCENES[i].id ? '' : id;
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        if (src(i) !== id) return; // 已經又換了別的地點
        var t = fade.tex;
        fade.tex = s.tex; fade.img = s.img; fade.w = s.w; fade.h = s.h; fade.fx = s.fx; fade.fy = s.fy;
        fade.i = i; fade.t0 = performance.now();
        s.img = img; s.live = false; s.w = img.naturalWidth; s.h = img.naturalHeight;
        s.tex = renderer.upload(img, t);
        if (s.video) {
          s.video.src = vsrc(id);
          s.video.load();
        }
        request();
      };
      img.src = psrc(id);
    }

    function playback(k, p) { // 只播放正在看的那一幕（轉場時連同下一幕）
      var busy = false;
      for (var i = 0; i < N; i++) {
        var on = visible && (i === k || (i === k + 1 && p > 0));
        if (on) { video(i); if (i + 1 < N) video(i + 1); }
        var v = slots[i].video;
        if (!v) continue;
        if (on && v.paused) {
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!on && !v.paused) v.pause();
        if (on && !v.paused && slots[i].live) {
          if (v.readyState >= 2) slots[i].tex = renderer.upload(v, slots[i].tex);
          busy = true;
        }
      }
      return busy;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; request(); }).observe(root);
    }

    function resize() {
      W = Math.round(stage.clientWidth * dprCap);
      H = Math.round(stage.clientHeight * dprCap);
      canvas.width = W; canvas.height = H;
      request();
    }

    // 畫面位置 u 只在站與站之間依時間播完轉場，不跟著捲動停在半路
    var lastCap = -2, uCur = 0, uFrom = 0, uTo = 0, t0 = 0, dur = 0;
    function goStop(i, instant) {
      uFrom = uCur; uTo = STOPS[i]; t0 = performance.now();
      var n = Math.abs(uTo - uFrom);
      dur = (instant || reduce || n < 1e-3) ? 0 : Math.min(STEP_MS + 600 * (n - 1), 3000);
      if (!dur) uCur = uTo;
      request();
      return dur;
    }

    function render() {
      queued = false;
      var now = performance.now();
      if (uCur !== uTo) {
        var q = dur ? clamp((now - t0) / dur, 0, 1) : 1;
        uCur = q >= 1 ? uTo : uFrom + (uTo - uFrom) * (.5 - .5 * Math.cos(Math.PI * q));
      }
      var u = uCur;
      var intro = ease(clamp(u / INTRO, 0, 1));
      var v = Math.max(u - INTRO, 0);
      var k = Math.min(Math.floor(v + 1e-6), N - 1);
      var p = k < N - 1 ? clamp(v - k, 0, 1) : 0;

      // 小窗 → 全幅
      var mobile = window.innerWidth <= 720;
      var pl = (mobile ? 9 : 30) * (1 - intro), pt = (mobile ? 26 : 24) * (1 - intro);
      stage.style.setProperty('--pl', pl.toFixed(3) + '%');
      stage.style.setProperty('--pt', pt.toFixed(3) + '%');
      stage.style.setProperty('--pr', (22 * (1 - intro)).toFixed(2) + 'px');
      stage.style.setProperty('--edge', (1 - intro).toFixed(3));
      stage.style.setProperty('--intro-o', (1 - clamp((intro - .12) / .45, 0, 1)).toFixed(3));
      stage.style.setProperty('--intro-y', (-70 * intro).toFixed(1) + 'px');
      stage.style.setProperty('--intro-s', (1 + .05 * intro).toFixed(4));
      stage.style.setProperty('--shade', clamp((intro - .6) / .4, 0, 1).toFixed(3));

      // 直式素材本身就構好圖，置中即可；橫式素材在直式螢幕上才需要 focus 取景偏移
      var fv = portrait.matches ? 1 : 0, kb = Math.min(k + 1, N - 1);
      var fa = vert && !SCENES[k].still ? [.5, .5] : SCENES[k].focus[fv];
      var fb = vert && !SCENES[kb].still ? [.5, .5] : SCENES[kb].focus[fv];
      var a = slots[k], b = slots[kb];
      a.fx = fa[0]; a.fy = fa[1];
      b.fx = fb[0]; b.fy = fb[1];
      // 開場時從 1.16 收回 1
      a.z = u < INTRO ? 1.16 - .16 * intro : 1;
      b.z = 1;
      for (var i = 0; i < N; i++) if (i !== k && i !== kb) slots[i].since = null;
      var moving = drift(k, now, true);
      if (kb !== k) drift(kb, now, false);
      var playing = playback(k, p) || moving;
      var type = reduce ? 0 : SCENES[k].type;
      var fq = fade.i === k && p === 0 && u >= INTRO ? (now - fade.t0) / FADE_MS : 1;
      if (fq < 1 && !reduce) { // 正在切換周邊地點
        fade.z = 1;
        renderer.draw(W, H, fade, a, fq, 3, 41.3);
      } else {
        renderer.draw(W, H, a, b, p, type, k * 13.7 + 3.1);
        fq = 1;
      }

      var cap = u < INTRO * .92 ? -1 : (p < .5 ? k : Math.min(k + 1, N - 1));
      if (cap !== lastCap) {
        caps.forEach(function (c, i) { c.classList.toggle('on', i === cap); });
        ticks.forEach(function (t, i) { t.classList.toggle('on', i === cap); });
        lastCap = cap;
      }
      if (uCur !== uTo || playing || fq < 1) request();
    }
    function request() { if (!queued) { queued = true; requestAnimationFrame(render); } }

    /* 成圖幕的運鏡：橫式畫面一邊慢慢推近、一邊微微橫移；直式畫面只看得到成圖的一段，就從房間一側橫移到另一側。
       正在看的那一幕從抵達時開始計時；轉場中的下一幕停在起點，抵達後接著走，所以不會跳 */
    function drift(i, now, current) {
      var sc = SCENES[i], s = slots[i];
      if (!sc.still || reduce) return false;
      if (current && s.since == null) s.since = now;
      var period = portrait.matches ? DRIFT_MS * 1.6 : DRIFT_MS; // 直式橫移的距離長，走慢一點才不暈
      var ph = s.since == null ? 0 : .5 - .5 * Math.cos(2 * Math.PI * (now - s.since) / period);
      if (portrait.matches) {
        var r = sc.pan || [.2, .8];
        s.fx = r[0] + (r[1] - r[0]) * ph;
      } else {
        s.z *= 1.02 + .06 * ph;
        s.fx = clamp(s.fx + (ph - .5) * .6, 0, 1);
      }
      return visible;
    }

    // 街區的周邊地點選單
    caps.forEach(function (cap, i) {
      var list = cap.querySelector('.ps-poi');
      if (!list) return;
      var btns = [].slice.call(list.querySelectorAll('button'));
      function prefetch() { // 滑鼠移進選單（或手指碰到）就先抓各地點首格，點下去馬上能飛
        ['pointerenter', 'touchstart', 'focusin'].forEach(function (t) { list.removeEventListener(t, prefetch); });
        btns.forEach(function (btn) { if (btn.dataset.poi) new Image().src = psrc(btn.dataset.poi); });
      }
      ['pointerenter', 'touchstart', 'focusin'].forEach(function (t) { list.addEventListener(t, prefetch, { passive: true }); });
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.getAttribute('aria-pressed') === 'true') return;
          btns.forEach(function (o) { o.setAttribute('aria-pressed', o === btn ? 'true' : 'false'); });
          // 手機上按鈕排成一列橫向捲動：點到只露出一半的那顆，就把它捲進來
          var lr = list.getBoundingClientRect(), br = btn.getBoundingClientRect(), pad = 14;
          var dx = br.left < lr.left + pad ? br.left - lr.left - pad : br.right > lr.right - pad ? br.right - lr.right + pad : 0;
          if (dx) list.scrollBy({ left: dx, behavior: reduce ? 'auto' : 'smooth' });
          swap(i, btn.dataset.poi || SCENES[i].id);
        });
      });
    });

    window.addEventListener('resize', resize);
    resize();
    stepper(root, {
      count: STOPS.length,
      frac: function (i) { return STOPS[i] / units; },
      go: goStop
    });
  }

  /* ───────── 影格載入（樣品屋、日照共用）─────────
     區塊接近畫面才開始載；先載每 8 張一張再補中間，任何時候都有最接近的一張可以畫。
     prioritize(a, b) 把 a–b 之間還沒載的影格插到最前面（要走的那一段先到） */
  function loadFrames(root, onLoad) {
    var count = +root.dataset.frames;
    var path = (small && root.dataset.pathM) || root.dataset.path; // 手機用 960 寬的影格
    var frames = new Array(count);
    var started = false;
    var order = [], next = 0, seen = {};
    [8, 4, 2, 1].forEach(function (s) {
      for (var i = 0; i < count; i += s) if (!seen[i]) { seen[i] = 1; order.push(i); }
    });

    function pump() {
      if (next >= order.length) return;
      var i = order[next++];
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { frames[i] = img; onLoad(i); pump(); };
      img.onerror = pump;
      img.src = path + ('00' + i).slice(-3) + '.webp' + REV;
    }
    function start() {
      if (started) return;
      started = true;
      for (var c = 0; c < 4; c++) pump();
    }
    function prioritize(a, b) {
      var lo = Math.max(0, Math.min(a, b)), hi = Math.min(count - 1, Math.max(a, b));
      var rest = order.slice(next).filter(function (i) { return i < lo || i > hi; });
      var urgent = order.slice(next).filter(function (i) { return i >= lo && i <= hi; });
      // 走的方向先到：區段內也是先粗後細
      urgent.sort(function (x, y) { return (x % 4 ? 1 : 0) - (y % 4 ? 1 : 0) || (a <= b ? x - y : y - x); });
      order = order.slice(0, next).concat(urgent, rest);
      start();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); }, { rootMargin: '150% 0px' }).observe(root);
    } else start();

    return {
      count: count,
      frames: frames,
      prioritize: prioritize,
      nearest: function (i) {
        for (var d = 0; d < count; d++) {
          if (frames[i - d]) return i - d;
          if (frames[i + d]) return i + d;
        }
        return -1;
      }
    };
  }

  /* ───────── 2a. 樣品屋：一站一站走 ─────────
     滾輪（或方向鍵）一下就走到下一個空間：中間影格依序播放、緩起緩停，不疊影（換站規則見 stepper）。
     房間可以有 data-via：往前走進來時先停在那一格看一下，再接著走完（主臥：先看整排衣櫃，再轉向床頭） */
  function initWalk(root) {
    var canvas = root.querySelector('.ps-scrub-canvas');
    var ctx = canvas.getContext('2d');
    var rooms = [].slice.call(root.querySelectorAll('.ps-rooms li'));
    var list = root.querySelector('.ps-rooms');
    var stops = rooms.map(function (r) { return +r.dataset.frame; });
    var vias = rooms.map(function (r) { return r.dataset.via ? +r.dataset.via : -1; });
    var S = stops.length, FPS = 40, VIA_HOLD = 900;
    var W = 0, H = 0, pos = stops[0], anim = 0, busyUntil = 0;
    var loader = loadFrames(root, function () { if (performance.now() > busyUntil) paint(); });

    function paint() {
      var i = loader.nearest(Math.round(pos));
      if (i < 0 || !W) return;
      drawCover(ctx, loader.frames[i], W, H, .5, .5, 1);
      list.style.setProperty('--f', (pos / (loader.count - 1)).toFixed(4));
    }

    function go(i, instant) {
      rooms.forEach(function (r, n) { r.classList.toggle('on', n === i); });
      root.classList.toggle('walking', i > 0);
      cancelAnimationFrame(anim);
      var from = pos, to = stops[i];
      // 先把下一段（到下一站）排進佇列，再把現在要走的這段插到最前面
      if (i + 1 < S) loader.prioritize(to, stops[i + 1]);
      loader.prioritize(Math.round(from), to);
      if (instant || reduce || from === to) { pos = to; busyUntil = 0; paint(); return 0; }
      var via = vias[i], t0 = performance.now(), total = 0, legs = [];
      var parts = (via > from && via < to) ? [[from, via, VIA_HOLD], [via, to, 0]] : [[from, to, 0]];
      parts.forEach(function (l) {
        var d = clamp(Math.abs(l[1] - l[0]) / FPS * 1000, 500, 3000);
        legs.push({ a: l[0], b: l[1], t0: t0 + total, d: d });
        total += d + l[2];
      });
      busyUntil = t0 + total;
      (function walk(now) {
        var leg = legs[0];
        for (var k = 1; k < legs.length; k++) if (now >= legs[k].t0) leg = legs[k];
        var p = clamp((now - leg.t0) / leg.d, 0, 1);
        pos = leg.a + (leg.b - leg.a) * (.5 - .5 * Math.cos(Math.PI * p));
        paint();
        if (now < busyUntil) anim = requestAnimationFrame(walk);
      })(t0);
      return total;
    }

    function resize() {
      W = canvas.width = Math.round(canvas.clientWidth * dprCap);
      H = canvas.height = Math.round(canvas.clientHeight * dprCap);
      paint();
    }

    rooms[0].classList.add('on');
    window.addEventListener('resize', resize);
    resize();
    var walk = stepper(root, {
      count: S,
      frac: function (i) { return i / (S - 1); },
      go: go
    });
    rooms.forEach(function (r, i) { // 點房間名稱直接走過去
      r.setAttribute('role', 'button');
      r.tabIndex = 0;
      function jump(e) {
        e.preventDefault();
        e.stopPropagation();
        walk.jump(i);
      }
      r.addEventListener('click', jump);
      r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') jump(e); });
    });
  }

  /* ───────── 2b. 日照：影格跟著捲動 ─────────
     播放頭緩動追上捲動位置，相鄰兩張影格依小數部分交叉淡化（固定機位，只有光在變，不會有殘影） */
  function initScrub(root, onFrame) {
    var canvas = root.querySelector('.ps-scrub-canvas');
    var ctx = canvas.getContext('2d');
    var running = false, pos = -1, W = 0, H = 0;
    var loader = loadFrames(root, function () { request(); });
    var count = loader.count, frames = loader.frames;

    function paint() {
      var i0 = Math.floor(pos), t = pos - i0;
      var a = loader.nearest(i0);
      if (a < 0) return;
      drawCover(ctx, frames[a], W, H, .5, .5, 1);
      var b = t > .01 ? loader.nearest(Math.min(i0 + 1, count - 1)) : -1;
      if (b > a) { ctx.globalAlpha = t; drawCover(ctx, frames[b], W, H, .5, .5, 1); ctx.globalAlpha = 1; }
    }
    function tick() {
      var target = sectionProgress(root) * (count - 1);
      pos = (pos < 0 || reduce) ? target : pos + (target - pos) * 0.16;
      if (Math.abs(target - pos) < 0.004) pos = target;
      paint();
      onFrame(pos / (count - 1), pos);
      if (pos !== target) requestAnimationFrame(tick); else running = false;
    }
    function request() { if (!running) { running = true; requestAnimationFrame(tick); } }
    function resize() {
      W = canvas.width = Math.round(canvas.clientWidth * dprCap);
      H = canvas.height = Math.round(canvas.clientHeight * dprCap);
      if (pos >= 0) paint();
      request();
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', resize);
    resize();
  }

  // 影格是等時距算圖：第一格 data-from、最後一格 data-to（當天的分鐘數）
  function initDaylight(root) {
    var time = root.querySelector('.ps-clock b');
    var sun = root.querySelector('.ps-clock .sun');
    var done = root.querySelector('.ps-clock .arc-done');
    var m0 = +root.dataset.from, m1 = +root.dataset.to;
    var cur = -1;
    initScrub(root, function (f) {
      var m = Math.round(m0 + (m1 - m0) * f);
      if (m === cur) return;
      cur = m;
      time.textContent = ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
      // 06:00 在左地平線、18:00 在右地平線
      var t = clamp((m - 360) / 720, 0, 1), ang = Math.PI * (1 - t);
      var x = 100 + 86 * Math.cos(ang), y = 100 - 86 * Math.sin(ang);
      sun.setAttribute('cx', x.toFixed(1)); sun.setAttribute('cy', y.toFixed(1));
      done.setAttribute('d', 'M14 100 A86 86 0 0 1 ' + x.toFixed(1) + ' ' + y.toFixed(1));
    });
  }

  document.documentElement.classList.remove('ps-nojs');
  var theatre = document.querySelector('.ps-theatre');
  if (theatre) initTheatre(theatre);
  var unit = document.querySelector('.ps-unit');
  if (unit) initWalk(unit);
  var day = document.querySelector('.ps-day');
  if (day) initDaylight(day);
})();
