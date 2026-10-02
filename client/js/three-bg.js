/* ==========================================================================
   Hero background (Three.js): a wireframe "sphere" with orbit rings and
   drifting particles. It pauses when off-screen and is skipped entirely
   for reduced motion / no WebGL, so it never slows the site down.
   ========================================================================== */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.THREE || ES.reduceMotion) return;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 7;

  const primary = new THREE.Color(ES.themeColor('--primary') || '#6C63FF');
  const secondary = new THREE.Color(ES.themeColor('--secondary') || '#00D4FF');

  const group = new THREE.Group();
  scene.add(group);

  const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 2), new THREE.MeshBasicMaterial({ color: primary, wireframe: true, transparent: true, opacity: .35 }));
  group.add(globe);
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 32), new THREE.MeshBasicMaterial({ color: secondary, transparent: true, opacity: .08 }));
  group.add(core);

  const rings = [];
  [2.6, 3.1].forEach((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: i ? secondary : primary, transparent: true, opacity: .7 }));
    ring.rotation.x = Math.PI / 2.4 + i * .5; ring.rotation.y = i * .7;
    // a small "event pin" riding on each ring
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.add(pin); ring.userData = { pin, r, speed: .4 + i * .25 };
    group.add(ring); rings.push(ring);
  });

  const count = 220, pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 4 + Math.random() * 5, a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(b) * Math.cos(a), r * Math.sin(b) * Math.sin(a), r * Math.cos(b)], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ color: secondary, size: .035, transparent: true, opacity: .8 }));
  scene.add(points);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    // keep the sphere on the right on wide screens, centred behind text on small ones
    group.position.x = w > 900 ? 2.6 : 0; group.position.y = w > 900 ? 0 : 1.2; group.scale.setScalar(w > 900 ? 1 : .75);
  };
  resize(); window.addEventListener('resize', resize);

  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth - .5); my = (e.clientY / innerHeight - .5); }, { passive: true });

  document.addEventListener('themechange', () => {
    const p = new THREE.Color(ES.themeColor('--primary')); globe.material.color.copy(p);
  });

  let visible = true, t = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    t += 0.01;
    globe.rotation.y += .0035; globe.rotation.x += .0012;
    rings.forEach((ring) => {
      const a = t * ring.userData.speed * 3;
      ring.userData.pin.position.set(Math.cos(a) * ring.userData.r, Math.sin(a) * ring.userData.r, 0);
    });
    points.rotation.y -= .0007;
    group.rotation.y += (mx * .6 - group.rotation.y) * .03;
    group.rotation.x += (my * .4 - group.rotation.x) * .03;
    renderer.render(scene, camera);
  })();
})();
