/**
 * Wayto 動態背景：與 index 一致的漸層 + 光球 + 浮動粒子
 * 在 </body> 前載入此腳本即可。
 */
(function() {
  if (typeof document === 'undefined' || !document.body) return;

  var bgColor = '#fcf9f4';
  var gradientEnd = '#fef5f0';
  var orbColors = ['#d4af77', '#c9a961', '#b8956a'];
  var particleColors = ['#d4af77', '#c9a961', '#b8956a'];

  var style = document.createElement('style');
  style.textContent = [
    'body.wayto-has-dynamic-bg { min-height: 100vh; background: linear-gradient(135deg, ' + bgColor + ' 0%, ' + gradientEnd + ' 100%) !important; }',
    '#wayto-dynamic-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none; z-index: 0; }',
    'body.wayto-has-dynamic-bg > main { position: relative; z-index: 1; }',
    'body.wayto-has-dynamic-bg > .app-wrapper { position: relative; z-index: 1; }',
    'body.wayto-has-dynamic-bg > *:not(#wayto-dynamic-bg):not(nav) { position: relative; z-index: 1; }',
    '.wayto-glow-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.3; pointer-events: none; will-change: transform; }',
    '.wayto-floating-particle { position: absolute; border-radius: 50%; pointer-events: none; }',
    '@keyframes waytoOrbFloat { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(30px,-30px) scale(1.1)} 50%{transform:translate(-20px,-50px) scale(0.9)} 75%{transform:translate(40px,-20px) scale(1.05)} }',
    '@keyframes waytoFloatUp { 0%{transform:translateY(0) translateX(0) scale(1);opacity:0} 8%{opacity:0.85} 92%{opacity:0.85} 100%{transform:translateY(-100vh) translateX(30px) scale(0.5);opacity:0} }'
  ].join('\n');
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.id = 'wayto-dynamic-bg';
  wrap.innerHTML =
    '<div id="wayto-particles-container" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;"></div>' +
    '<div class="wayto-glow-orb" style="width:400px;height:400px;background:' + orbColors[0] + ';top:10%;left:15%;animation:waytoOrbFloat 10s ease-in-out infinite;"></div>' +
    '<div class="wayto-glow-orb" style="width:500px;height:500px;background:' + orbColors[1] + ';top:50%;right:10%;animation:waytoOrbFloat 12s ease-in-out infinite 2s;"></div>' +
    '<div class="wayto-glow-orb" style="width:350px;height:350px;background:' + orbColors[2] + ';bottom:15%;left:50%;animation:waytoOrbFloat 14s ease-in-out infinite 4s;"></div>';

  document.body.classList.add('wayto-has-dynamic-bg');
  document.body.insertBefore(wrap, document.body.firstChild);

  function createParticles() {
    var container = document.getElementById('wayto-particles-container');
    if (!container) return;
    var count = 50;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'wayto-floating-particle';
      var size = Math.random() * 10 + 6;
      var startX = Math.random() * 100;
      var duration = Math.random() * 12 + 8;
      var delay = Math.random() * (duration * 0.8);
      p.style.cssText =
        'width:' + size + 'px;height:' + size + 'px;background:' + particleColors[Math.floor(Math.random() * particleColors.length)] +
        ';left:' + startX + '%;bottom:-20px;animation:waytoFloatUp ' + duration + 's ease-in infinite;animation-delay:' + delay + 's;';
      container.appendChild(p);
    }
  }

  createParticles();

  var particlesEl = document.getElementById('wayto-particles-container');
  var orbs = wrap.querySelectorAll('.wayto-glow-orb');

  window.addEventListener('scroll', function() {
    var scrollY = window.scrollY || window.pageYOffset;
    if (particlesEl) particlesEl.style.transform = 'translateY(' + scrollY * 0.3 + 'px)';
    for (var i = 0; i < orbs.length; i++) {
      var speed = 0.15 + (i * 0.05);
      orbs[i].style.transform = 'translateY(' + (scrollY * speed) + 'px)';
    }
  });
})();
