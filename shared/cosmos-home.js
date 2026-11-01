/* Wayto 宇宙首頁 — 沿著「Way」這條路，捲動穿越四個客群宇宙的 3D 場景 + 頁面互動 */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var portraitQuery = window.matchMedia('(max-width: 900px), (max-aspect-ratio: 5/4)');

  // 航道上的六個站點：起點、四個宇宙、下一站（CTA）
  var STATIONS = [
    { id: 'launch',     hex: 0x7aa2ff, css: '#7aa2ff', sector: 'ORIGIN · 起點' },
    { id: 'u-estate',     hex: 0x4cc9f0, css: '#4cc9f0', sector: 'U-01 · 建案宇宙', label: 'U-01 · TARGET LOCKED', name: '建案宇宙' },
    { id: 'u-design',     hex: 0xffb547, css: '#ffb547', sector: 'U-02 · 設計宇宙', label: 'U-02 · TARGET LOCKED', name: '設計宇宙' },
    { id: 'u-brand',      hex: 0xc77dff, css: '#c77dff', sector: 'U-03 · 品牌宇宙', label: 'U-03 · TARGET LOCKED', name: '品牌宇宙' },
    { id: 'u-enterprise', hex: 0x2ee6a6, css: '#2ee6a6', sector: 'U-04 · 企業宇宙', label: 'U-04 · TARGET LOCKED', name: '企業宇宙' },
    { id: 'contact',    hex: 0xdfe7ff, css: '#dfe7ff', sector: 'NEXT · 下一個宇宙' }
  ];
  var LAST = STATIONS.length - 1;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ── 捲動位置 → 航程 s（0 = 起點 … 5 = 下一站） ── */
  var anchors = [];
  function measure() {
    var vh = window.innerHeight;
    var max = Math.max(0, doc.scrollHeight - vh);
    var portrait = portraitQuery.matches;
    anchors = STATIONS.map(function (st, i) {
      var el = document.getElementById(st.id);
      if (!el || i === 0) return 0;
      var r = el.getBoundingClientRect();
      var top = r.top + window.scrollY;
      // 直式畫面星球在區塊上方，抵達點設在區塊頂端；橫式則是區塊置中
      var a = portrait && i < LAST ? top - vh * 0.04 : top + r.height / 2 - vh / 2;
      return clamp(a, 0, max);
    });
    for (var i = 1; i < anchors.length; i++) {
      if (anchors[i] <= anchors[i - 1]) anchors[i] = anchors[i - 1] + 1;
    }
  }
  function journeyAt(y) {
    if (y <= anchors[0]) return 0;
    for (var i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    }
    return LAST;
  }

  /* ── 3D 場景 ── */
  function initScene() {
    var canvas = document.getElementById('cosmos');
    if (!canvas || !window.THREE) { doc.classList.add('no-webgl'); return null; }
    var THREE = window.THREE;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      doc.classList.add('no-webgl');
      return null;
    }
    var low = window.innerWidth <= 900 || (navigator.hardwareConcurrency || 8) <= 4;
    var PR = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 1.75);
    renderer.setPixelRatio(PR);
    renderer.setClearColor(0x03040b, 1);

    var scene = new THREE.Scene();
    // 遠方的宇宙淡出，只隱約看見下一、兩站（自訂 shader 另外在 shader 內處理距離淡出）
    var FOG_NEAR = 260, FOG_FAR = 820;
    scene.fog = new THREE.Fog(0x03040b, FOG_NEAR, FOG_FAR);
    var camera = new THREE.PerspectiveCamera(58, 1, 0.1, 3000);
    var U = { time: { value: 0 }, pr: { value: PR }, warp: { value: 0 } };
    var UP = new THREE.Vector3(0, 1, 0);
    var WHITE = new THREE.Color(0xffffff);

    // 道路：一條往 -z 延伸、緩緩蜿蜒的航道
    var GAP = 240, AHEAD = 72, CAM_H = 7;
    function rx(z) { return Math.sin(z * 0.0065) * 42 + Math.sin(z * 0.0021 + 1.3) * 30; }
    function ry(z) { return Math.sin(z * 0.004 + 0.5) * 14; }
    function roadAt(z, out) { return out.set(rx(z), ry(z), z); }
    var _t = new THREE.Vector3();
    function rightAt(z, out) {
      _t.set(rx(z - 1) - rx(z), ry(z - 1) - ry(z), -1).normalize();
      return out.crossVectors(_t, UP).normalize();
    }

    var stationCols = STATIONS.map(function (s) { return new THREE.Color(s.hex); });
    function roadColor(z, out) {
      var sf = Math.max(0, -z) / GAP;
      var i = Math.min(Math.floor(sf), LAST - 1);
      var f = THREE.MathUtils.smoothstep(sf - i, 0.45, 1.0);
      return out.copy(stationCols[i]).lerp(stationCols[i + 1], f);
    }

    // 各站點星球位置，以及桌機（星球在右）/ 直式（星球在上）的視線目標
    var LAT = [40, 34, 34, 34, 34, 0];
    var LIFT = [5, 3, 3, 3, 4, 7];
    var RADII = [11, 13, 12, 12, 10, 16];
    var planetPos = [], deskLook = [], mobLook = [];
    for (var si = 0; si <= LAST; si++) {
      var zp = -si * GAP - (si === LAST ? 96 : AHEAD);
      var pp = roadAt(zp, new THREE.Vector3());
      pp.addScaledVector(rightAt(zp, new THREE.Vector3()), LAT[si]);
      pp.y += LIFT[si];
      planetPos.push(pp);
      deskLook.push(si === LAST ? pp.clone() : roadAt(zp, new THREE.Vector3()).add(new THREE.Vector3(0, CAM_H - 2, 0)));
      mobLook.push(pp.clone().add(new THREE.Vector3(0, si === LAST ? -3 : -15, 0)));
    }

    /* 共用材質 */
    var DOT_VS = [
      'attribute vec3 aColor; attribute float aSize; attribute float aSeed;',
      'uniform float uTime; uniform float uPR; uniform float uScale; uniform float uWave; uniform float uSwirl; uniform float uTwinkle; uniform float uNear; uniform float uFar;',
      'varying vec3 vC; varying float vA;',
      'void main(){',
      '  vec3 p = position;',
      '  if (uWave > 0.0) { float ang = atan(p.z, p.x); p.y += sin(ang * 5.0 + uTime * 1.7 + length(p.xz) * 0.35) * uWave; }',
      '  if (uSwirl != 0.0) { float r = length(p.xy); float a = uTime * uSwirl * (14.0 / (r + 6.0)); float c = cos(a); float s = sin(a); p.xy = mat2(c, -s, s, c) * p.xy; }',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  float d = -mv.z;',
      '  float tw = mix(1.0, 0.55 + 0.45 * sin(uTime * 1.7 + aSeed * 40.0), uTwinkle);',
      '  vC = aColor * tw;',
      '  vA = smoothstep(uFar, uFar * 0.25, d) * smoothstep(0.5, uNear, d);',
      '  gl_PointSize = clamp(aSize * uPR * (uScale / max(d, 0.1)), 0.0, 12.0 * uPR);',
      '}'
    ].join('\n');
    var DOT_FS = [
      'varying vec3 vC; varying float vA;',
      'void main(){',
      '  float d = length(gl_PointCoord - 0.5);',
      '  float a = smoothstep(0.5, 0.0, d); a *= a;',
      '  gl_FragColor = vec4(vC, a * vA);',
      '}'
    ].join('\n');
    function dotsMaterial(o) {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: U.time, uPR: U.pr,
          uScale: { value: o.scale || 220 }, uWave: { value: o.wave || 0 }, uSwirl: { value: o.swirl || 0 },
          uTwinkle: { value: o.twinkle || 0 }, uNear: { value: o.near || 4 }, uFar: { value: o.far || 1600 }
        },
        vertexShader: DOT_VS, fragmentShader: DOT_FS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
    }
    function dotsGeometry(n, fill) {
      var pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), seed = new Float32Array(n);
      var o = { p: new THREE.Vector3(), c: new THREE.Color(), s: 1 };
      for (var k = 0; k < n; k++) {
        fill(k, o);
        pos[k * 3] = o.p.x; pos[k * 3 + 1] = o.p.y; pos[k * 3 + 2] = o.p.z;
        col[k * 3] = o.c.r; col[k * 3 + 1] = o.c.g; col[k * 3 + 2] = o.c.b;
        size[k] = o.s; seed[k] = Math.random();
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      return g;
    }
    function lineMat(hex, op) {
      return new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    }
    function glowMat(hex, op) {
      return new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    }

    var PLANET_VS = [
      'varying vec3 vN; varying vec3 vP; varying vec3 vV;',
      'void main(){',
      '  vP = position;',
      '  vN = normalize(normalMatrix * normal);',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  vV = -mv.xyz;',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n');
    var PLANET_FS = [
      'uniform vec3 uRim; uniform vec3 uBase; uniform float uTime; uniform float uBands; uniform float uCore; uniform vec2 uFog;',
      'varying vec3 vN; varying vec3 vP; varying vec3 vV;',
      'float h(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
      'float n3(vec3 x){',
      '  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),',
      '             mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z);',
      '}',
      'float fbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++){ s += a * n3(p); p *= 2.03; a *= 0.5; } return s; }',
      'void main(){',
      '  vec3 n = normalize(vN); vec3 v = normalize(vV);',
      '  float ndv = max(dot(n, v), 0.0);',
      '  float fr = pow(1.0 - ndv, 2.6);',
      '  vec3 p = normalize(vP);',
      '  float t = fbm(p * 2.6 + vec3(uTime * 0.03, 0.0, uTime * 0.02));',
      '  float bands = mix(t, 0.5 + 0.5 * sin(p.y * uBands + t * 4.0), 0.55);',
      '  float lit = clamp(dot(n, normalize(vec3(-0.55, 0.45, 0.7))) * 0.9 + 0.15, 0.0, 1.0);',
      '  vec3 col = mix(uBase * 0.10, uBase * 0.85, bands) * lit;',
      '  col += uRim * fr * 1.5;',
      '  col += uRim * uCore * pow(ndv, 3.0) * 0.9;',
      '  float fade = 1.0 - smoothstep(uFog.x, uFog.y, length(vV));',
      '  if (fade < 0.01) discard;',
      '  gl_FragColor = vec4(col, fade);',
      '}'
    ].join('\n');

    var spinners = [], tickers = [];
    function spin(o, axis, sp) { spinners.push([o, axis, sp]); }

    function planet(R, base, rim, o) {
      var m = new THREE.ShaderMaterial({
        uniforms: {
          uTime: U.time, uBase: { value: new THREE.Color(base) }, uRim: { value: new THREE.Color(rim) },
          uBands: { value: o.bands || 8 }, uCore: { value: o.core || 0 }, uFog: { value: new THREE.Vector2(FOG_NEAR, FOG_FAR) }
        },
        vertexShader: PLANET_VS, fragmentShader: PLANET_FS, transparent: true
      });
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(R, low ? 40 : 64, low ? 28 : 48), m);
      spin(mesh, 'y', 0.05);
      return mesh;
    }

    function radialTexture(stops) {
      var c = document.createElement('canvas');
      c.width = c.height = 128;
      var g = c.getContext('2d');
      var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    var GLOW = radialTexture([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,.5)'], [0.45, 'rgba(255,255,255,.1)'], [1, 'rgba(255,255,255,0)']]);
    function glow(hex, size, op) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: hex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.set(size, size, 1);
      return s;
    }
    function nebulaTexture() {
      var c = document.createElement('canvas');
      c.width = c.height = 256;
      var g = c.getContext('2d');
      for (var b = 0; b < 8; b++) {
        var x = 96 + Math.random() * 64, y = 96 + Math.random() * 64, r = 30 + Math.random() * 64;
        var grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255,255,255,.32)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 256, 256);
      }
      g.globalCompositeOperation = 'destination-in';
      var mask = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      mask.addColorStop(0, 'rgba(0,0,0,1)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = mask;
      g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }

    /* 星空 */
    var zNear = 260, zFar = -(LAST * GAP + 900);
    var starCols = [0xffffff, 0xcfdcff, 0xa9c4ff, 0xffe3c2, 0xd9c6ff].map(function (h) { return new THREE.Color(h); });
    scene.add(new THREE.Points(dotsGeometry(low ? 2600 : 5600, function (k, o) {
      var z = zNear - Math.random() * (zNear - zFar);
      var a = Math.random() * Math.PI * 2, r = 36 + Math.pow(Math.random(), 0.55) * 560;
      o.p.set(rx(z) + Math.cos(a) * r, ry(z) + Math.sin(a) * r * 0.8, z);
      var roll = Math.random();
      o.c.copy(starCols[roll < 0.55 ? 0 : roll < 0.8 ? 1 : roll < 0.9 ? 2 : roll < 0.96 ? 3 : 4]);
      o.s = Math.random() < 0.035 ? 3 + Math.random() * 2.5 : 0.8 + Math.random() * 1.4;
    }), dotsMaterial({ scale: 300, twinkle: 1, near: 8, far: 1500 })));

    /* 光速拖曳線：捲動越快越明顯 */
    var streakMat = new THREE.ShaderMaterial({
      uniforms: { uStretch: { value: 0 }, uWarp: U.warp, uColor: { value: new THREE.Color(0xbcd0ff) } },
      vertexShader: [
        'attribute float aEnd; uniform float uStretch; uniform float uWarp; varying float vA;',
        'void main(){',
        '  vec3 p = position; p.z += aEnd * uStretch;',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  float d = -mv.z;',
        '  vA = uWarp * smoothstep(520.0, 60.0, d) * smoothstep(2.0, 18.0, d) * (1.0 - aEnd);',
        '}'
      ].join('\n'),
      fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    (function buildStreaks() {
      var n = low ? 320 : 760;
      var pos = new Float32Array(n * 6), end = new Float32Array(n * 2);
      for (var k = 0; k < n; k++) {
        var z = zNear - Math.random() * (zNear - zFar);
        var a = Math.random() * Math.PI * 2, r = 8 + Math.pow(Math.random(), 0.8) * 110;
        var x = rx(z) + Math.cos(a) * r, y = ry(z) + Math.sin(a) * r * 0.7;
        pos.set([x, y, z, x, y, z], k * 6);
        end[k * 2] = 0; end[k * 2 + 1] = 1;
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
      var lines = new THREE.LineSegments(g, streakMat);
      lines.frustumCulled = false;
      scene.add(lines);
    })();

    /* 航道：中央光塵 + 兩側追光導引燈，顏色隨宇宙漸變 */
    var roadStart = 140, roadEnd = -(LAST * GAP + 96), roadLen = roadStart - roadEnd;
    var roadMat = new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uPR: U.pr, uWarp: U.warp },
      vertexShader: [
        'attribute vec3 aColor; attribute float aSize; attribute float aT; attribute float aRail;',
        'uniform float uTime; uniform float uPR; uniform float uWarp;',
        'varying vec3 vC; varying float vA;',
        'void main(){',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  float d = -mv.z;',
        '  float pulse = aRail > 0.5 ? pow(fract(aT * 110.0 - uTime * 1.1), 5.0) : pow(fract(aT * 26.0 - uTime * 0.22 + aSize * 0.3), 12.0);',
        '  float b = (aRail > 0.5 ? 0.30 : 0.20) + pulse * (1.5 + uWarp * 2.0);',
        '  vC = aColor * b;',
        '  vA = smoothstep(1300.0, 160.0, d) * smoothstep(0.5, 5.0, d);',
        '  gl_PointSize = clamp(aSize * uPR * (170.0 / max(d, 0.1)), 0.0, 9.0 * uPR);',
        '}'
      ].join('\n'),
      fragmentShader: DOT_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    (function buildRoad() {
      var centerN = low ? 1500 : 3000, railStep = low ? 4 : 3;
      var railPairs = Math.floor(roadLen / railStep), n = centerN + railPairs * 2;
      var pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), tt = new Float32Array(n), rail = new Float32Array(n);
      var p = new THREE.Vector3(), r = new THREE.Vector3(), c = new THREE.Color(), k = 0;
      function put(t, isRail, s) {
        pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
        size[k] = s; tt[k] = t; rail[k] = isRail; k++;
      }
      for (var i = 0; i < centerN; i++) {
        var t = i / centerN, z = roadStart - t * roadLen;
        roadAt(z, p); rightAt(z, r);
        p.addScaledVector(r, (Math.random() + Math.random() - 1) * 1.6);
        p.y += (Math.random() - 0.5) * 0.5 - 0.4;
        roadColor(z, c).lerp(WHITE, 0.25);
        put(t, 0, 1 + Math.random() * 1.4);
      }
      for (var q = 0; q < railPairs; q++) {
        var zq = roadStart - q * railStep, tq = (roadStart - zq) / roadLen;
        roadColor(zq, c);
        for (var side = -1; side <= 1; side += 2) {
          roadAt(zq, p); rightAt(zq, r);
          p.addScaledVector(r, side * 6.5);
          p.y -= 0.8;
          put(tq, 1, 2.3);
        }
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      g.setAttribute('aT', new THREE.BufferAttribute(tt, 1));
      g.setAttribute('aRail', new THREE.BufferAttribute(rail, 1));
      scene.add(new THREE.Points(g, roadMat));

      var ln = 700, lpos = new Float32Array(ln * 3), lcol = new Float32Array(ln * 3);
      for (var j = 0; j < ln; j++) {
        var zl = roadStart - (j / (ln - 1)) * roadLen;
        roadAt(zl, p); p.y -= 0.4;
        roadColor(zl, c);
        lpos.set([p.x, p.y, p.z], j * 3);
        lcol.set([c.r, c.g, c.b], j * 3);
      }
      var lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
      lg.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
      scene.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    })();

    /* 各宇宙的星雲氛圍 */
    var NEB = nebulaTexture();
    STATIONS.forEach(function (st, i) {
      var base = planetPos[i], r = rightAt(base.z, new THREE.Vector3());
      [[1, 170, 60, 0.17, 760], [-1, 240, -50, 0.1, 620]].forEach(function (cfg) {
        var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: NEB, color: st.hex, transparent: true, opacity: cfg[3], blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        s.position.copy(base).addScaledVector(r, cfg[0] * cfg[1]);
        s.position.y += cfg[2];
        s.position.z -= 300;
        s.scale.set(cfg[4], cfg[4], 1);
        s.material.rotation = Math.random() * Math.PI;
        scene.add(s);
      });
    });

    function stationGroup(i) {
      var g = new THREE.Group();
      g.position.copy(planetPos[i]);
      scene.add(g);
      return g;
    }

    /* 站點 0：Wayto 母星（呼應 Logo 的星環） */
    (function () {
      var g = stationGroup(0);
      g.add(planet(11, 0x2446c9, 0x8fd3ff, { bands: 9 }));
      var ring = new THREE.Group();
      ring.rotation.set(0.32, 0, 0.38);
      g.add(ring);
      var cA = new THREE.Color(0x9ad1e0), cB = new THREE.Color(0x2b50e0);
      var dots = new THREE.Points(dotsGeometry(low ? 1400 : 2800, function (k, o) {
        var a = Math.random() * Math.PI * 2, rr = 15.5 + Math.pow(Math.random(), 1.6) * 12;
        o.p.set(Math.cos(a) * rr, (Math.random() - 0.5) * 0.35, Math.sin(a) * rr);
        o.c.copy(cA).lerp(cB, (Math.sin(a) + 1) / 2);
        o.s = 0.6 + Math.random() * 1.2;
      }), dotsMaterial({ scale: 200, near: 2 }));
      ring.add(dots);
      spin(dots, 'y', 0.06);
      g.add(glow(0x4f7bff, 78, 0.38));
    })();

    /* 站點 1：建案宇宙 — 線框、掃描環與漂浮的 3D 模型（像建築量體） */
    (function () {
      var g = stationGroup(1);
      g.add(planet(13, 0x0b5570, 0x4cc9f0, { bands: 16 }));
      var wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(16.5, 1)), lineMat(0x4cc9f0, 0.3));
      g.add(wire);
      spin(wire, 'y', 0.08);
      var scan = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 160), glowMat(0x9be7ff, 0.85));
      g.add(scan);
      var cubes = [];
      var edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 2.2, 2.2));
      for (var k = 0; k < 6; k++) {
        var cube = new THREE.LineSegments(edges, lineMat(0x9be7ff, 0.75));
        cube.userData = { r: 21 + Math.random() * 7, sp: 0.12 + Math.random() * 0.12, ph: Math.random() * Math.PI * 2, inc: (Math.random() - 0.5) * 1.1 };
        g.add(cube);
        cubes.push(cube);
      }
      tickers.push(function (dt, t) {
        var y = Math.sin(t * 0.8) * 12.2;
        scan.position.y = y;
        scan.rotation.x = Math.PI / 2;
        scan.scale.setScalar(Math.sqrt(Math.max(13.6 * 13.6 - y * y, 0.5)));
        cubes.forEach(function (c) {
          var d = c.userData, a = d.ph + t * d.sp;
          c.position.set(Math.cos(a) * d.r, Math.sin(a * 1.3) * 3 + Math.sin(a) * d.r * d.inc * 0.4, Math.sin(a) * d.r);
          c.rotation.x += dt * 0.6;
          c.rotation.y += dt * 0.4;
        });
      });
      g.add(glow(0x4cc9f0, 80, 0.3));
    })();

    /* 站點 3：品牌宇宙 — 會隨滑鼠擾動的粒子環（展場互動） */
    var interactRingMat;
    (function () {
      var g = stationGroup(3);
      g.add(planet(12, 0x3b1670, 0xc77dff, { bands: 7 }));
      var ring = new THREE.Group();
      ring.rotation.set(0.38, 0, -0.28);
      g.add(ring);
      var cA = new THREE.Color(0xc77dff), cB = new THREE.Color(0xff8fd0);
      interactRingMat = dotsMaterial({ scale: 200, near: 2, wave: 1.2 });
      var dots = new THREE.Points(dotsGeometry(low ? 1600 : 3200, function (k, o) {
        var a = Math.random() * Math.PI * 2, rr = 17 + Math.pow(Math.random(), 1.2) * 15;
        o.p.set(Math.cos(a) * rr, (Math.random() - 0.5) * 0.6, Math.sin(a) * rr);
        o.c.copy(cA).lerp(cB, (rr - 17) / 15);
        o.s = 0.7 + Math.random() * 1.2;
      }), interactRingMat);
      ring.add(dots);
      spin(ring, 'y', 0.1);
      var t1 = new THREE.Mesh(new THREE.TorusGeometry(19.5, 0.05, 6, 200), glowMat(0xf0a6ff, 0.5));
      t1.rotation.set(1.2, 0.3, 0);
      var t2 = new THREE.Mesh(new THREE.TorusGeometry(34, 0.04, 6, 240), glowMat(0xc77dff, 0.25));
      t2.rotation.set(1.7, -0.4, 0.2);
      g.add(t1, t2);
      spin(t1, 'z', 0.2);
      spin(t2, 'z', -0.12);
      g.add(glow(0xc77dff, 84, 0.32));
    })();

    /* 站點 4：企業宇宙 — 節點網路與流動的資料封包（系統串接） */
    (function () {
      var g = stationGroup(4);
      g.add(planet(12, 0x0a5040, 0x2ee6a6, { bands: 22 }));
      var net = new THREE.Group();
      g.add(net);
      spin(net, 'y', 0.07);
      var N = 44, nodes = [];
      for (var i = 0; i < N; i++) {
        var yy = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - yy * yy), th = i * 2.399963;
        var R = 17.5 + (Math.random() - 0.5) * 2.4;
        nodes.push(new THREE.Vector3(Math.cos(th) * rr * R, yy * R, Math.sin(th) * rr * R));
      }
      var adj = nodes.map(function () { return []; }), pairs = [], seen = {};
      nodes.forEach(function (a, i) {
        nodes.map(function (b, j) { return [j, a.distanceToSquared(b)]; })
          .filter(function (e) { return e[0] !== i; })
          .sort(function (x, y) { return x[1] - y[1]; })
          .slice(0, 3)
          .forEach(function (e) {
            var key = Math.min(i, e[0]) + '-' + Math.max(i, e[0]);
            if (seen[key]) return;
            seen[key] = 1;
            pairs.push([i, e[0]]);
            adj[i].push(e[0]);
            adj[e[0]].push(i);
          });
      });
      var epos = new Float32Array(pairs.length * 6);
      pairs.forEach(function (pr, k) {
        var a = nodes[pr[0]], b = nodes[pr[1]];
        epos.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6);
      });
      var eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.BufferAttribute(epos, 3));
      net.add(new THREE.LineSegments(eg, lineMat(0x2ee6a6, 0.38)));
      var nodeCol = new THREE.Color(0x8affd6);
      net.add(new THREE.Points(dotsGeometry(N, function (k, o) { o.p.copy(nodes[k]); o.c.copy(nodeCol); o.s = 2.6; }), dotsMaterial({ scale: 200, near: 2 })));

      var P = 26, pk = [], packCol = new THREE.Color(0xeafff6);
      var packGeo = dotsGeometry(P, function (k, o) {
        var a = (Math.random() * N) | 0;
        pk.push({ a: a, b: adj[a][(Math.random() * adj[a].length) | 0], t: Math.random(), sp: 0.5 + Math.random() * 0.7 });
        o.p.set(0, 0, 0); o.c.copy(packCol); o.s = 3.6;
      });
      var packPts = new THREE.Points(packGeo, dotsMaterial({ scale: 200, near: 2 }));
      packPts.frustumCulled = false;
      net.add(packPts);
      var parr = packGeo.attributes.position.array;
      tickers.push(function (dt) {
        pk.forEach(function (q, k) {
          q.t += dt * q.sp;
          if (q.t >= 1) {
            q.t -= 1;
            q.a = q.b;
            q.b = adj[q.a][(Math.random() * adj[q.a].length) | 0];
          }
          var A = nodes[q.a], B = nodes[q.b];
          parr[k * 3] = A.x + (B.x - A.x) * q.t;
          parr[k * 3 + 1] = A.y + (B.y - A.y) * q.t;
          parr[k * 3 + 2] = A.z + (B.z - A.z) * q.t;
        });
        packGeo.attributes.position.needsUpdate = true;
      });
      var orbit = new THREE.Mesh(new THREE.TorusGeometry(25, 0.04, 6, 220), glowMat(0x2ee6a6, 0.3));
      orbit.rotation.set(1.35, 0.2, 0);
      g.add(orbit);
      g.add(glow(0x2ee6a6, 80, 0.28));
    })();

    /* 站點 2：設計宇宙 — 發光核心與晶體外殼（設計的幾何與材質） */
    (function () {
      var g = stationGroup(2);
      g.add(planet(10, 0x8a5a10, 0xffd27a, { bands: 5, core: 1.0 }));
      var octa = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.OctahedronGeometry(15.5, 0)), lineMat(0xffc56b, 0.55));
      var ico = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(21, 0)), lineMat(0xffb547, 0.22));
      g.add(octa, ico);
      spin(octa, 'y', 0.25); spin(octa, 'x', 0.1);
      spin(ico, 'y', -0.12); spin(ico, 'z', 0.05);
      var cA = new THREE.Color(0xffb547), cB = new THREE.Color(0xfff2d0), dir = new THREE.Vector3();
      var sparks = new THREE.Points(dotsGeometry(low ? 220 : 420, function (k, o) {
        dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        o.p.copy(dir).multiplyScalar(13 + Math.random() * 21);
        o.c.copy(cA).lerp(cB, Math.random());
        o.s = 0.8 + Math.random() * 1.6;
      }), dotsMaterial({ scale: 200, near: 2, twinkle: 1 }));
      g.add(sparks);
      spin(sparks, 'y', 0.04);
      g.add(glow(0xffb547, 100, 0.45));
      g.add(glow(0xfff2d0, 40, 0.5));
    })();

    /* 站點 5：傳送門 — 四個宇宙的顏色匯聚成一道門 */
    (function () {
      var g = stationGroup(5);
      var camAt = roadAt(-LAST * GAP, new THREE.Vector3());
      camAt.y += CAM_H;
      g.lookAt(camAt);
      var rings = [];
      [[14, 0.16, 0x4cc9f0], [18.5, 0.14, 0xc77dff], [23.5, 0.12, 0x2ee6a6], [29.5, 0.1, 0xffb547]].forEach(function (cfg, k) {
        var m = new THREE.Mesh(new THREE.TorusGeometry(cfg[0], cfg[1], 8, 220), glowMat(cfg[2], 0.9));
        m.userData = { sp: (k % 2 ? -1 : 1) * (0.15 + k * 0.05), k: k };
        g.add(m);
        rings.push(m);
      });
      for (var k = 1; k <= 12; k++) {
        var tr = new THREE.Mesh(new THREE.TorusGeometry(26 - k * 1.1, 0.05, 6, 160), glowMat(0x9fb4ff, 0.32 * (1 - k / 13)));
        tr.position.z = -k * 16;
        g.add(tr);
      }
      var cIn = new THREE.Color(0xffffff), cMid = new THREE.Color(0x9fb4ff), cOut = new THREE.Color(0xc77dff);
      g.add(new THREE.Points(dotsGeometry(low ? 1600 : 3200, function (k, o) {
        var a = Math.random() * Math.PI * 2, rr = 1.5 + Math.pow(Math.random(), 1.4) * 32;
        o.p.set(Math.cos(a) * rr, Math.sin(a) * rr, (Math.random() - 0.5) * 1.5);
        var f = rr / 34;
        if (f < 0.5) o.c.copy(cIn).lerp(cMid, f * 2); else o.c.copy(cMid).lerp(cOut, (f - 0.5) * 2);
        o.s = 0.7 + Math.random() * 1.4;
      }), dotsMaterial({ scale: 200, near: 2, swirl: 0.9, twinkle: 0.5 })));
      tickers.push(function (dt, t) {
        rings.forEach(function (m) {
          var d = m.userData;
          m.rotation.z += dt * d.sp;
          m.rotation.x = Math.sin(t * 0.5 + d.k) * 0.18;
          m.rotation.y = Math.cos(t * 0.4 + d.k) * 0.18;
        });
      });
      g.add(glow(0xffffff, 60, 0.55));
      g.add(glow(0x9fb4ff, 160, 0.25));
    })();

    /* 鏡頭：依航程沿道路前進，抵達站點時停駐 */
    function ease(f) { return f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2; }
    var camPos = new THREE.Vector3(), look = new THREE.Vector3(), la = new THREE.Vector3(), lb = new THREE.Vector3(), camR = new THREE.Vector3();
    function placeCamera(s, m, mouse) {
      var i = Math.min(Math.floor(s), LAST - 1);
      var f = ease(clamp(s - i, 0, 1));
      var zc = -(i + f) * GAP;
      roadAt(zc, camPos);
      camPos.y += CAM_H;
      rightAt(zc, camR);
      camPos.addScaledVector(camR, mouse.x * 3.2);
      camPos.y -= mouse.y * 2.2;
      la.copy(deskLook[i]).lerp(mobLook[i], m);
      lb.copy(deskLook[i + 1]).lerp(mobLook[i + 1], m);
      look.copy(la).lerp(lb, f);
      camera.position.copy(camPos);
      camera.up.copy(UP);
      camera.lookAt(look);
      camera.rotateZ(-mouse.x * 0.035);
    }

    var W = 0, H = 0;
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h || (w === W && h === H)) return;
      W = w; H = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();

    var proj = new THREE.Vector3();
    function stationOnScreen(i) {
      proj.copy(planetPos[i]).project(camera);
      var dist = camera.position.distanceTo(planetPos[i]);
      var rpx = RADII[i] / (dist * Math.tan(camera.fov * Math.PI / 360)) * H / 2;
      return { x: (proj.x + 1) / 2 * W, y: (1 - proj.y) / 2 * H, r: rpx, front: proj.z < 1 };
    }

    var shown = false;
    return {
      resize: resize,
      stationOnScreen: stationOnScreen,
      update: function (dt, t, s, warp, mouse) {
        U.time.value = t;
        U.warp.value = warp;
        streakMat.uniforms.uStretch.value = warp * 70;
        interactRingMat.uniforms.uWave.value = 1.2 + mouse.speed * 3;
        var m = portraitQuery.matches ? 1 : 0;
        placeCamera(s, m, mouse);
        var fov = 58 + warp * 16 + m * 8;
        if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
        for (var k = 0; k < spinners.length; k++) spinners[k][0].rotation[spinners[k][1]] += spinners[k][2] * dt;
        for (var j = 0; j < tickers.length; j++) tickers[j](dt, t);
        renderer.render(scene, camera);
        if (!shown) { shown = true; canvas.classList.add('ready'); }
      }
    };
  }

  /* ── HUD：右側航道、左下讀數、星球鎖定框 ── */
  var hudLinks = Array.prototype.slice.call(document.querySelectorAll('.route-hud a'));
  var hudList = document.querySelector('.route-hud ol');
  var roSector = document.getElementById('roSector');
  var roVel = document.getElementById('roVel');
  var reticle = document.querySelector('.reticle');
  var rtLabel = reticle && reticle.querySelector('.rt-label');
  var activeIdx = -1, lastVel = '', reticleIdx = -1;

  function updateHud(s, warp) {
    var idx = clamp(Math.round(s), 0, LAST);
    if (idx !== activeIdx) {
      activeIdx = idx;
      hudLinks.forEach(function (a, i) { a.classList.toggle('on', i === idx); });
      document.body.style.setProperty('--accent', STATIONS[idx].css);
      if (roSector) roSector.textContent = STATIONS[idx].sector;
    }
    if (hudList) hudList.style.setProperty('--hp', (s / LAST).toFixed(4));
    var v = (warp * 0.99).toFixed(2) + 'c';
    if (roVel && v !== lastVel) { roVel.textContent = v; lastVel = v; }
  }

  function updateReticle(scene3d, s) {
    if (!reticle || !scene3d) return;
    var idx = Math.round(s), near = Math.abs(s - idx);
    var on = !portraitQuery.matches && idx >= 1 && idx <= 4 && near < 0.2;
    if (!on) { reticle.style.opacity = '0'; return; }
    var p = scene3d.stationOnScreen(idx);
    if (!p.front) { reticle.style.opacity = '0'; return; }
    var size = clamp(p.r * 2.5, 120, 440);
    reticle.style.width = reticle.style.height = size + 'px';
    reticle.style.transform = 'translate3d(' + (p.x - size / 2).toFixed(1) + 'px,' + (p.y - size / 2).toFixed(1) + 'px,0)';
    reticle.style.opacity = String(clamp(1 - near / 0.2, 0, 1));
    if (idx !== reticleIdx && rtLabel) {
      reticleIdx = idx;
      rtLabel.innerHTML = STATIONS[idx].label + '<b>' + STATIONS[idx].name + '</b>';
    }
  }

  /* ── 文字解碼效果（只用在英文代號上） ── */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/';
  function scramble(el, text, dur, attr) {
    var write = attr ? function (s) { el.setAttribute(attr, s); } : function (s) { el.textContent = s; };
    if (reduceMotion) { write(text); return; }
    var start = performance.now(), len = text.length;
    function step(now) {
      var p = Math.min((now - start) / dur, 1), settled = Math.floor(p * len), out = '';
      for (var i = 0; i < len; i++) {
        var ch = text.charAt(i);
        out += (i < settled || ch === ' ' || ch === '/' || ch === '·') ? ch : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      write(out);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ── 合作夥伴展示牆：兩排反向等速流動 ──
     原始項目留給爬蟲與螢幕閱讀器，複製出來的只負責補滿畫面（aria-hidden、alt 清空）。
     卡片寬度固定，一份的寬度不受 logo 載入影響；位移剛好一份寬度，就能無縫接回起點。 */
  function initPartnerWall() {
    var wall = document.querySelector('.pw');
    if (!wall || reduceMotion || !wall.animate) return;
    var SPEED = 34; // px / 秒
    var rows = [].slice.call(wall.querySelectorAll('.pw-row')).map(function (row) {
      var track = row.querySelector('.pw-track');
      return { row: row, track: track, items: [].slice.call(track.children), anim: null, hover: false, w: 0 };
    });
    var visible = false;

    function sync(r) {
      if (!r.anim) return;
      if (visible && !r.hover) r.anim.play(); else r.anim.pause();
    }

    function build(r) {
      var rowW = r.row.clientWidth;
      if (!rowW || rowW === r.w) return;
      var set = r.items.reduce(function (w, li) {
        return w + li.offsetWidth + parseFloat(getComputedStyle(li).marginRight);
      }, 0);
      if (!set) return;
      r.w = rowW;
      while (r.track.children.length > r.items.length) r.track.removeChild(r.track.lastChild);
      for (var i = Math.ceil(rowW / set) + 1; i > 0; i--) {
        r.items.forEach(function (li) {
          var c = li.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          c.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
          r.track.appendChild(c);
        });
      }
      // 換斷點時保留目前進度，不要跳回起點
      var p = 0;
      if (r.anim) {
        var t = r.anim.effect.getTiming().duration;
        p = (r.anim.currentTime % t) / t;
        r.anim.cancel();
      }
      var from = 0, to = -set;
      if (r.row.classList.contains('pw-row--rev')) { from = -set; to = 0; }
      var dur = set / SPEED * 1000;
      r.anim = r.track.animate(
        [{ transform: 'translateX(' + from + 'px)' }, { transform: 'translateX(' + to + 'px)' }],
        { duration: dur, iterations: Infinity }
      );
      r.anim.currentTime = p * dur;
      sync(r);
    }

    wall.classList.add('is-live');
    rows.forEach(function (r) {
      build(r);
      if (finePointer) {
        r.row.addEventListener('pointerenter', function () { r.hover = true; sync(r); });
        r.row.addEventListener('pointerleave', function () { r.hover = false; sync(r); });
      }
    });

    // 離開畫面就暫停，省下背景位移
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      rows.forEach(sync);
    }).observe(wall);

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { rows.forEach(build); }, 150);
    });
  }

  /* ── 頁面互動 ── */
  function initPage() {
    // reveal
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('in');
        revealIO.unobserve(el);
        // 進場結束後拿掉 reveal class，讓卡片自己的 hover / 傾斜 transition 生效
        el.addEventListener('transitionend', function done(ev) {
          if (ev.target !== el || ev.propertyName !== 'opacity') return;
          el.removeEventListener('transitionend', done);
          el.classList.remove('rv', 'in');
        });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.rv').forEach(function (el) { revealIO.observe(el); });

    // 宇宙代號解碼
    var scrIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        scramble(e.target, e.target.dataset.text, 1000);
        scrIO.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-scramble]').forEach(function (el) {
      el.dataset.text = el.textContent;
      scrIO.observe(el);
    });

    // Hero：WAY TO ___ 輪播
    var WORDS = [['ANYWHERE', '#7fe3ff', '#c9a2ff'], ['VISION', '#4cc9f0', '#a8ecff'], ['INTERACT', '#c77dff', '#ff8fd0'], ['SYSTEMS', '#2ee6a6', '#a8ffe0'], ['EASE', '#ffb547', '#ffe2a8']];
    var heroWord = document.getElementById('heroWord');
    if (heroWord && !reduceMotion) {
      var wi = 0;
      setInterval(function () {
        if (document.hidden) return;
        wi = (wi + 1) % WORDS.length;
        heroWord.style.setProperty('--w1', WORDS[wi][1]);
        heroWord.style.setProperty('--w2', WORDS[wi][2]);
        scramble(heroWord, WORDS[wi][0], 650, 'data-word');
      }, 2800);
    }

    // 數字累加
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countIO.unobserve(e.target);
        var el = e.target, to = +el.dataset.count, t0 = performance.now();
        if (reduceMotion) return;
        (function tick(now) {
          var p = Math.min((now - t0) / 1600, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      if (!reduceMotion) el.textContent = '0';
      countIO.observe(el);
    });

    initPartnerWall();

    // 3D 傾斜卡片 + 光澤
    if (finePointer && !reduceMotion) {
      document.querySelectorAll('.tilt').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          el.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
          el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
        el.addEventListener('pointerleave', function () {
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
        });
      });
    }
  }

  // 宣言：逐字點亮（保留一份完整文字給螢幕閱讀器）
  var mfChars = [], mfEl = document.querySelector('[data-chars]'), mfLit = -1;
  if (mfEl && !reduceMotion) {
    var text = mfEl.textContent.trim();
    mfEl.textContent = '';
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    Array.prototype.forEach.call(text, function (ch) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      vis.appendChild(s);
      mfChars.push(s);
    });
    mfEl.appendChild(sr);
    mfEl.appendChild(vis);
  }
  function updateManifesto(vh) {
    if (!mfChars.length) return;
    var r = mfEl.getBoundingClientRect();
    var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
    var lit = Math.round(p * mfChars.length * 1.15);
    if (lit === mfLit) return;
    mfLit = lit;
    for (var i = 0; i < mfChars.length; i++) mfChars[i].classList.toggle('on', i < lit);
  }

  // 航道日誌：進度線
  var track = document.querySelector('.route-track');
  var trackItems = track ? Array.prototype.slice.call(track.querySelectorAll('.route-item')) : [];
  var trackP = -1;
  function updateTimeline(vh) {
    if (!track) return;
    var r = track.getBoundingClientRect();
    var vertical = window.innerWidth <= 1100;
    var p = vertical ? clamp((vh * 0.62 - r.top) / r.height, 0, 1) : clamp((vh * 0.85 - r.top) / (vh * 0.45), 0, 1);
    if (reduceMotion) p = r.top < vh ? 1 : 0;
    if (Math.abs(p - trackP) < 0.001) return;
    trackP = p;
    track.style.setProperty('--p', p.toFixed(4));
    var n = trackItems.length;
    trackItems.forEach(function (el, i) { el.classList.toggle('on', p >= i / (n - 1) - 0.001); });
  }

  // 多重宇宙星圖：軌道、衛星與連線
  var mvStage = document.querySelector('.mv-stage');
  var mvSvg = mvStage && mvStage.querySelector('.mv-svg');
  var mvNodes = mvStage ? Array.prototype.slice.call(mvStage.querySelectorAll('.mv-node')) : [];
  function layoutMV() {
    if (!mvStage || !mvSvg) return;
    var w = mvStage.offsetWidth, h = mvStage.offsetHeight;
    var core = mvStage.querySelector('.mv-core');
    var cx = core.offsetLeft + core.offsetWidth / 2, cy = core.offsetTop + core.offsetHeight / 2;
    var compact = window.innerWidth <= 720;
    var radii = compact ? [92, 128, 164] : [w * 0.17, w * 0.28, w * 0.41];
    var out = '<g transform="rotate(-10 ' + cx + ' ' + cy + ')">';
    radii.forEach(function (rxv, k) {
      var ryv = rxv * (compact ? 0.34 : 0.36);
      var d = 'M' + (cx - rxv) + ' ' + cy + 'a' + rxv + ' ' + ryv + ' 0 1 0 ' + (2 * rxv) + ' 0a' + rxv + ' ' + ryv + ' 0 1 0 ' + (-2 * rxv) + ' 0';
      out += '<path class="orbit" d="' + d + '"/>';
      if (!reduceMotion) out += '<circle class="sat" r="2.6"><animateMotion dur="' + (16 + k * 9) + 's" repeatCount="indefinite" path="' + d + '"/></circle>';
    });
    out += '</g>';
    if (!compact) {
      mvNodes.forEach(function (node, i) {
        var orb = node.querySelector('.mv-orb');
        var ox = node.offsetLeft + orb.offsetLeft + orb.offsetWidth / 2, oy = node.offsetTop + orb.offsetTop + orb.offsetHeight / 2;
        var dx = ox - cx, dy = oy - cy;
        var qx = (cx + ox) / 2 - dy * 0.18, qy = (cy + oy) / 2 + dx * 0.18;
        var d = 'M' + cx + ' ' + cy + 'Q' + qx + ' ' + qy + ' ' + ox + ' ' + oy;
        var c = node.dataset.c;
        out += '<path class="link-base" d="' + d + '" stroke="' + c + '"/><path class="link-flow" data-i="' + i + '" d="' + d + '" stroke="' + c + '"/>';
      });
    }
    mvSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    mvSvg.innerHTML = out;
  }
  mvNodes.forEach(function (node, i) {
    node.addEventListener('mouseenter', function () {
      mvStage.classList.add('dim');
      node.classList.add('hot');
      var path = mvSvg.querySelector('.link-flow[data-i="' + i + '"]');
      if (path) path.classList.add('hot');
    });
    node.addEventListener('mouseleave', function () {
      mvStage.classList.remove('dim');
      node.classList.remove('hot');
      mvSvg.querySelectorAll('.link-flow.hot').forEach(function (p) { p.classList.remove('hot'); });
    });
  });

  /* ── 滑鼠：場景視差、游標光暈 ── */
  var mouse = { x: 0, y: 0, tx: 0, ty: 0, speed: 0 };
  var glowEl = document.querySelector('.cursor-glow');
  var gx = window.innerWidth / 2, gy = window.innerHeight / 2, gtx = gx, gty = gy;
  if (finePointer) {
    window.addEventListener('pointermove', function (e) {
      var nx = e.clientX / window.innerWidth * 2 - 1, ny = e.clientY / window.innerHeight * 2 - 1;
      mouse.speed = Math.min(mouse.speed + Math.hypot(nx - mouse.tx, ny - mouse.ty) * 2, 1);
      mouse.tx = nx; mouse.ty = ny;
      gtx = e.clientX; gty = e.clientY;
      if (glowEl && !reduceMotion) glowEl.classList.add('on');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { if (glowEl) glowEl.classList.remove('on'); });
  }

  /* ── 主迴圈 ── */
  var scene3d = null;
  var journey = { s: 0, prev: 0, warp: 0 };
  var last = performance.now(), time = 0, first = true;

  function loop(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduceMotion) time += dt;
    var vh = window.innerHeight;

    var target = journeyAt(window.scrollY);
    if (first || reduceMotion) { journey.s = target; journey.prev = target; first = false; }
    else journey.s += (target - journey.s) * (1 - Math.pow(0.02, dt));
    var v = Math.abs(journey.s - journey.prev) / Math.max(dt, 0.001);
    journey.prev = journey.s;
    journey.warp += (Math.min(v * 0.55, 1) - journey.warp) * (1 - Math.pow(0.05, dt));
    if (reduceMotion) journey.warp = 0;

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    mouse.speed *= Math.pow(0.15, dt);
    if (glowEl && finePointer) {
      gx += (gtx - gx) * 0.12; gy += (gty - gy) * 0.12;
      glowEl.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
    }

    if (scene3d) scene3d.update(dt, time, journey.s, journey.warp, mouse);
    updateHud(journey.s, journey.warp);
    updateReticle(scene3d, journey.s);
    updateManifesto(vh);
    updateTimeline(vh);
    requestAnimationFrame(loop);
  }

  var relayout = (function () {
    var id = 0;
    return function () {
      cancelAnimationFrame(id);
      id = requestAnimationFrame(function () {
        measure();
        layoutMV();
        if (scene3d) scene3d.resize();
      });
    };
  })();

  function start() {
    try { scene3d = initScene(); } catch (e) { console.error(e); doc.classList.add('no-webgl'); scene3d = null; }
    initPage();
    measure();
    layoutMV();
    window.addEventListener('resize', relayout);
    window.addEventListener('load', relayout);
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
