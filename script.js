/* ===========================================================
   DEBORAH'S 18TH BIRTHDAY EXPERIENCE
   ===========================================================

   ---------------------------------------------------------
   QUICK PERSONALIZATION GUIDE
   ---------------------------------------------------------
   - Correct unlock age:        CONFIG.correctAge (below)
   - Name shown everywhere:     CONFIG.name (below)
   - Messages / copy:           edit the text directly inside
                                 index.html (each scene's <p> tags)
   - Colors:                    edit the CSS variables at the
                                 top of style.css (:root block)
   - Wrong-answer jokes:        CONFIG.wrongAnswerMessages (below)
   ---------------------------------------------------------
*/

const CONFIG = {
  name: "Deborah",
  correctAge: 18,
  wrongAnswerMessages: [
    "Hmm… I don't think that's right 😂",
    "Nice try. Try again 😭",
    "The birthday records say otherwise 👀",
    "Nope. We've got evidence. Try again.",
    "Deborah, you know this one 😭"
  ]
};

/* ===========================================================
   DEVICE / PERFORMANCE DETECTION
=========================================================== */
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile/i.test(navigator.userAgent) || window.innerWidth < 768;
const isLowPower = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

const PARTICLE_COUNTS = {
  stars: isLowPower ? 500 : 1400,
  drift: isLowPower ? 60 : 160,
  burst: isLowPower ? 40 : 110,
  smoke: isLowPower ? 18 : 36
};

/* ===========================================================
   SOUND — tiny synthesized effects via WebAudio.
   No external audio files, nothing autoplays.
=========================================================== */
const SoundManager = (() => {
  let ctx = null;
  let enabled = false;
  let ambientNodes = null;

  function ensureContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function startAmbient() {
    if (!enabled || ambientNodes) return;
    const c = ensureContext();
    const osc1 = c.createOscillator();
    const osc2 = c.createOscillator();
    const gain = c.createGain();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = 74;
    osc2.frequency.value = 111;
    gain.gain.value = 0.0001;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(c.destination);
    osc1.start();
    osc2.start();
    gain.gain.linearRampToValueAtTime(0.028, c.currentTime + 2);
    ambientNodes = { osc1, osc2, gain };
  }

  function stopAmbient() {
    if (!ambientNodes) return;
    const c = ensureContext();
    ambientNodes.gain.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.8);
    const nodes = ambientNodes;
    setTimeout(() => {
      try { nodes.osc1.stop(); nodes.osc2.stop(); } catch (e) {}
    }, 900);
    ambientNodes = null;
  }

  function blip(freq = 880, duration = 0.16, type = "sine", vol = 0.06) {
    if (!enabled) return;
    const c = ensureContext();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), c.currentTime + duration);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration + 0.05);
  }

  function whoosh() {
    if (!enabled) return;
    const c = ensureContext();
    const bufferSize = c.sampleRate * 0.5;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.5);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.18, c.currentTime);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start();
  }

  function sparkle() { blip(1400 + Math.random() * 500, 0.22, "sine", 0.045); }
  function chime() { blip(660, 0.4, "triangle", 0.05); setTimeout(() => blip(990, 0.5, "triangle", 0.045), 140); }

  function setEnabled(val) {
    enabled = val;
    if (enabled) { ensureContext(); startAmbient(); }
    else stopAmbient();
  }

  return { setEnabled, sparkle, whoosh, chime, blip, get enabled() { return enabled; } };
})();

const soundToggleBtn = document.getElementById("sound-toggle");
soundToggleBtn.addEventListener("click", () => {
  const next = !SoundManager.enabled;
  SoundManager.setEnabled(next);
  soundToggleBtn.textContent = next ? "🔊" : "🔈";
});

/* ===========================================================
   THREE.JS PERSISTENT BACKGROUND
=========================================================== */
const canvas = document.getElementById("bg-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isLowPower, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPower ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 14);

// Ambient + key light
scene.add(new THREE.AmbientLight(0x8f7fd8, 0.55));
const keyLight = new THREE.PointLight(0xb6a4f5, 1.1, 60);
keyLight.position.set(6, 8, 10);
scene.add(keyLight);
const warmLight = new THREE.PointLight(0xe3c27d, 0.5, 40);
warmLight.position.set(-8, -4, 6);
scene.add(warmLight);

/* ---------- starfield ---------- */
function makeStarfield(count, spread, size, color, opacity) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread - 5;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geo, mat);
}

const starField = makeStarfield(PARTICLE_COUNTS.stars, 90, 0.09, 0xffffff, 0.75);
scene.add(starField);

const driftField = makeStarfield(PARTICLE_COUNTS.drift, 40, 0.16, 0xb6a4f5, 0.55);
scene.add(driftField);

/* ---------- glowing rings (gate ambience) ---------- */
const ringGroup = new THREE.Group();
[3.2, 4.4, 5.7].forEach((r, i) => {
  const ringGeo = new THREE.TorusGeometry(r, 0.012, 8, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xb6a4f5, transparent: true, opacity: 0.28 - i * 0.06 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2 + i * 0.15;
  ringGroup.add(ring);
});
ringGroup.position.z = -2;
scene.add(ringGroup);

/* ---------- reusable soft sprite texture for particles/flames/glow ---------- */
function makeGlowTexture(colorInner, colorOuter) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx2d = c.getContext("2d");
  const grad = ctx2d.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, colorInner);
  grad.addColorStop(1, colorOuter);
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTexLavender = makeGlowTexture("rgba(255,255,255,1)", "rgba(182,164,245,0)");
const glowTexGold = makeGlowTexture("rgba(255,244,214,1)", "rgba(227,194,125,0)");
const glowTexWhite = makeGlowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)");

/* ===========================================================
   SCENE-SPECIFIC 3D CONTENT (built lazily, added/removed per scene)
=========================================================== */

/* ---------- Balloons (Scene: reveal) ---------- */
const balloonGroup = new THREE.Group();
(function buildBalloons() {
  const colors = [0xb6a4f5, 0xe3c27d, 0x9d8ce8, 0xf4f1ea];
  const count = isLowPower ? 7 : 12;
  for (let i = 0; i < count; i++) {
    const g = new THREE.SphereGeometry(0.55 + Math.random() * 0.25, 16, 16);
    g.scale(1, 1.2, 1);
    const m = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length], roughness: 0.35, metalness: 0.1,
      emissive: colors[i % colors.length], emissiveIntensity: 0.12
    });
    const balloon = new THREE.Mesh(g, m);
    balloon.position.set((Math.random() - 0.5) * 12, -8 - Math.random() * 6, (Math.random() - 0.5) * 6 - 2);
    balloon.userData.speed = 0.4 + Math.random() * 0.5;
    balloon.userData.sway = Math.random() * Math.PI * 2;
    // string
    const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.4, 4);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
    const string = new THREE.Mesh(stringGeo, stringMat);
    string.position.y = -0.95;
    balloon.add(string);
    balloonGroup.add(balloon);
  }
})();

/* ---------- Ribbons (Scene: reveal) ---------- */
const ribbonGroup = new THREE.Group();
(function buildRibbons() {
  const count = isLowPower ? 4 : 8;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(0.18, 1.1, 1, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0xe3c27d : 0xb6a4f5, transparent: true, opacity: 0.5, side: THREE.DoubleSide
    });
    const ribbon = new THREE.Mesh(geo, mat);
    ribbon.position.set((Math.random() - 0.5) * 10, -6 - Math.random() * 5, (Math.random() - 0.5) * 5 - 1);
    ribbon.rotation.z = Math.random() * Math.PI;
    ribbon.userData.speed = 0.3 + Math.random() * 0.4;
    ribbon.userData.spin = (Math.random() - 0.5) * 0.02;
    ribbonGroup.add(ribbon);
  }
})();

/* ---------- Sparkle burst pool (reused across scenes) ---------- */
function createBurst(position, count, color, spread = 3, texture = glowTexLavender) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      Math.random() * spread * 0.8,
      (Math.random() - 0.5) * spread
    ));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.22, map: texture, color, transparent: true, opacity: 1,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geo, mat);
  points.userData.velocities = velocities;
  points.userData.life = 0;
  points.userData.maxLife = 2.2;
  scene.add(points);
  activeBursts.push(points);
  return points;
}
const activeBursts = [];

/* ---------- Cake (Scene: cake) ---------- */
const cakeGroup = new THREE.Group();
const candles = []; // { mesh, flame, lit, light, x }
(function buildCake() {
  const tierData = [
    { r: 2.1, h: 0.85, y: -1.0, color: 0xf4e6d0 },
    { r: 1.6, h: 0.7, y: -0.15, color: 0xead9c4 },
    { r: 1.15, h: 0.6, y: 0.55, color: 0xf4e6d0 }
  ];
  tierData.forEach(t => {
    const geo = new THREE.CylinderGeometry(t.r, t.r * 1.02, t.h, 32);
    const mat = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.6 });
    const tier = new THREE.Mesh(geo, mat);
    tier.position.y = t.y;
    cakeGroup.add(tier);
    // drip ring
    const ringGeo = new THREE.TorusGeometry(t.r * 0.98, 0.05, 8, 40);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xe3c27d, roughness: 0.4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = t.y + t.h / 2;
    cakeGroup.add(ring);
  });

  const candleCount = 5;
  for (let i = 0; i < candleCount; i++) {
    const angle = (i / candleCount) * Math.PI * 2;
    const cx = Math.cos(angle) * 0.55;
    const cz = Math.sin(angle) * 0.55;
    const candleMat = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xb6a4f5 : 0xf4f1ea });
    const candleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10);
    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.set(cx, 1.15, cz);
    cakeGroup.add(candle);

    const flameSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexGold, color: 0xffcf7a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    flameSprite.scale.set(0.35, 0.5, 1);
    flameSprite.position.set(cx, 1.5, cz);
    cakeGroup.add(flameSprite);

    const flameLight = new THREE.PointLight(0xffcf7a, 0.6, 3);
    flameLight.position.copy(flameSprite.position);
    cakeGroup.add(flameLight);

    candles.push({ mesh: candle, flame: flameSprite, light: flameLight, lit: true, base: flameSprite.position.clone() });
  }

  cakeGroup.scale.set(0.9, 0.9, 0.9);
  cakeGroup.position.set(0, -0.6, 0);
})();

/* smoke particles per extinguished candle */
function spawnSmoke(position) {
  const count = PARTICLE_COUNTS.smoke;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x + (Math.random() - 0.5) * 0.1;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.1;
    velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.18, map: glowTexWhite, color: 0xcfc9e8, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.NormalBlending
  });
  const points = new THREE.Points(geo, mat);
  points.userData.velocities = velocities;
  points.userData.life = 0;
  points.userData.maxLife = 2.6;
  scene.add(points);
  activeBursts.push(points);
}

/* ---------- Constellation text (Scene: finale) ---------- */
const constellationGroup = new THREE.Group();
function buildConstellationFromText(text) {
  while (constellationGroup.children.length) constellationGroup.remove(constellationGroup.children[0]);

  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const ctx2d = c.getContext("2d");
  ctx2d.fillStyle = "#000";
  ctx2d.fillRect(0, 0, c.width, c.height);
  ctx2d.fillStyle = "#fff";
  ctx2d.font = "bold 90px Georgia";
  ctx2d.textAlign = "center";
  ctx2d.textBaseline = "middle";
  ctx2d.fillText(text, c.width / 2, c.height / 2 + 6);

  const data = ctx2d.getImageData(0, 0, c.width, c.height).data;
  const points = [];
  const step = isLowPower ? 4 : 2.4;
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      const idx = (Math.floor(y) * c.width + Math.floor(x)) * 4;
      if (data[idx] > 128) {
        points.push({
          x: (x - c.width / 2) * 0.045,
          y: -(y - c.height / 2) * 0.045
        });
      }
    }
  }

  const count = points.length;
  const targetPositions = new Float32Array(count * 3);
  const startPositions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    targetPositions[i * 3] = points[i].x;
    targetPositions[i * 3 + 1] = points[i].y;
    targetPositions[i * 3 + 2] = 0;
    startPositions[i * 3] = (Math.random() - 0.5) * 30;
    startPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    startPositions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 10;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(startPositions.slice(), 3));
  const mat = new THREE.PointsMaterial({
    size: 0.12, map: glowTexLavender, color: 0xffffff, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  const pointsMesh = new THREE.Points(geo, mat);
  pointsMesh.userData.start = startPositions;
  pointsMesh.userData.target = targetPositions;
  constellationGroup.add(pointsMesh);
  return pointsMesh;
}

/* ===========================================================
   CAMERA / ENVIRONMENT STATE MACHINE
=========================================================== */
let currentEnv = "gate";
const mouse = { x: 0, y: 0 };
const mouseTarget = { x: 0, y: 0 };

window.addEventListener("mousemove", e => {
  mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
});
window.addEventListener("touchmove", e => {
  if (!e.touches || !e.touches[0]) return;
  const t = e.touches[0];
  mouseTarget.x = (t.clientX / window.innerWidth - 0.5) * 2;
  mouseTarget.y = (t.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

const envCameraZ = {
  gate: 14, reveal: 11, appreciation: 10, cards: 9.5, cake: 7.5, heartfelt: 10, finale: 20
};

function setEnvironment(name) {
  currentEnv = name;
  scene.remove(balloonGroup, ribbonGroup, cakeGroup, constellationGroup);

  if (name === "reveal") {
    scene.add(balloonGroup, ribbonGroup);
  } else if (name === "cake") {
    scene.add(cakeGroup);
  } else if (name === "finale") {
    scene.add(constellationGroup);
  }

  gsap.to(camera.position, { z: envCameraZ[name] || 12, duration: 2.2, ease: "power2.inOut" });
  gsap.to(ringGroup.children.map(r => r.material), {
    opacity: name === "gate" ? 0.28 : 0.05, duration: 1.2
  });
}

/* ===========================================================
   RENDER LOOP
=========================================================== */
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  mouse.x += (mouseTarget.x - mouse.x) * 0.04;
  mouse.y += (mouseTarget.y - mouse.y) * 0.04;
  camera.position.x += (mouse.x * 1.1 - camera.position.x) * 0.03;
  camera.position.y += (-mouse.y * 0.7 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  starField.rotation.y += dt * 0.006;
  driftField.rotation.y -= dt * 0.01;
  ringGroup.rotation.z += dt * 0.05;

  if (currentEnv === "reveal") {
    balloonGroup.children.forEach(b => {
      b.position.y += dt * b.userData.speed;
      b.position.x += Math.sin(t * 0.6 + b.userData.sway) * 0.003;
      if (b.position.y > 10) b.position.y = -9;
    });
    ribbonGroup.children.forEach(r => {
      r.position.y += dt * r.userData.speed;
      r.rotation.z += r.userData.spin;
      if (r.position.y > 8) r.position.y = -7;
    });
  }

  if (currentEnv === "cake") {
    candles.forEach(c => {
      if (c.lit) {
        c.flame.position.y = c.base.y + Math.sin(t * 8 + c.base.x * 10) * 0.02;
        c.flame.scale.set(0.32 + Math.sin(t * 10) * 0.03, 0.48 + Math.sin(t * 12) * 0.04, 1);
      }
    });
  }

  if (currentEnv === "finale" && constellationGroup.children[0]) {
    const mesh = constellationGroup.children[0];
    const progress = Math.min(mesh.userData.progress || 0, 1);
    const pos = mesh.geometry.attributes.position.array;
    const start = mesh.userData.start;
    const target = mesh.userData.target;
    for (let i = 0; i < pos.length; i++) {
      pos[i] = start[i] + (target[i] - start[i]) * easeOutCubic(progress);
    }
    mesh.geometry.attributes.position.needsUpdate = true;
  }

  // update active particle bursts
  for (let i = activeBursts.length - 1; i >= 0; i--) {
    const burst = activeBursts[i];
    burst.userData.life += dt;
    const positions = burst.geometry.attributes.position.array;
    const vels = burst.userData.velocities;
    for (let j = 0; j < vels.length; j++) {
      positions[j * 3] += vels[j].x * dt;
      positions[j * 3 + 1] += vels[j].y * dt;
      positions[j * 3 + 2] += vels[j].z * dt;
      vels[j].y -= dt * 0.15;
    }
    burst.geometry.attributes.position.needsUpdate = true;
    const lifeRatio = burst.userData.life / burst.userData.maxLife;
    burst.material.opacity = Math.max(0, 1 - lifeRatio);
    if (lifeRatio >= 1) {
      scene.remove(burst);
      burst.geometry.dispose();
      burst.material.dispose();
      activeBursts.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ===========================================================
   SCENE MANAGER (DOM)
=========================================================== */
const sceneOrder = [
  "scene-gate", "scene-reveal", "scene-appreciation",
  "scene-cards", "scene-cake", "scene-heartfelt", "scene-finale"
];

function goToScene(id) {
  sceneOrder.forEach(s => document.getElementById(s).classList.remove("active"));
  document.getElementById(id).classList.add("active");

  const envMap = {
    "scene-gate": "gate",
    "scene-reveal": "reveal",
    "scene-appreciation": "appreciation",
    "scene-cards": "cards",
    "scene-cake": "cake",
    "scene-heartfelt": "heartfelt",
    "scene-finale": "finale"
  };
  setEnvironment(envMap[id]);

  if (id === "scene-appreciation") runTypeReveal("scene-appreciation");
  if (id === "scene-heartfelt") runTypeReveal("scene-heartfelt");
  if (id === "scene-cake") setupCakeScene();
  if (id === "scene-finale") setupFinaleScene();
}

document.querySelectorAll(".next-btn[data-next]").forEach(btn => {
  btn.addEventListener("click", () => {
    SoundManager.blip(520, 0.15, "sine", 0.04);
    goToScene(btn.dataset.next);
  });
});

/* ---------- generic staggered paragraph reveal ---------- */
function runTypeReveal(sceneId) {
  const container = document.getElementById(sceneId);
  const lines = container.querySelectorAll(".type-line");
  const btn = container.querySelector(".next-btn");
  lines.forEach(l => l.classList.remove("shown"));
  if (btn) btn.classList.remove("visible");

  lines.forEach((line, i) => {
    setTimeout(() => {
      line.classList.add("shown");
      if (i === lines.length - 1 && btn) {
        setTimeout(() => btn.classList.add("visible"), 700);
      }
    }, 500 + i * 1100);
  });
}

/* ===========================================================
   AGE GATE LOGIC
=========================================================== */
const gateMessageEl = document.getElementById("gate-message");
const gateFormEl = document.getElementById("gate-form");
const ageInput = document.getElementById("age-input");
const unlockBtn = document.getElementById("unlock-btn");
const gateFeedback = document.getElementById("gate-feedback");
const bigNumber = document.getElementById("big-number");

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

async function typeMessage(text, holdMs = 1100) {
  gateMessageEl.style.opacity = 0;
  await wait(280);
  gateMessageEl.textContent = text;
  gateMessageEl.style.transition = "opacity 0.5s ease";
  gateMessageEl.style.opacity = 1;
  await wait(holdMs);
}

async function runGateIntro() {
  await wait(400);
  await typeMessage("Wait a second…", 1300);
  await typeMessage("This experience is locked.", 1500);
  await typeMessage("One very important question first.", 1600);
  await typeMessage("How old is Deborah?", 900);
  gateFormEl.classList.add("visible");
  ageInput.focus({ preventScroll: true });
}

let attemptCount = 0;
function checkAge() {
  const val = parseInt(ageInput.value, 10);

  if (val === CONFIG.correctAge) {
    runUnlockSequence();
  } else {
    attemptCount++;
    const msg = CONFIG.wrongAnswerMessages[Math.floor(Math.random() * CONFIG.wrongAnswerMessages.length)];
    gateFeedback.textContent = msg;
    gsap.fromTo(bigNumber, { x: -6 }, { x: 6, duration: 0.06, repeat: 5, yoyo: true, onComplete: () => gsap.set(bigNumber, { x: 0 }) });
    SoundManager.blip(220, 0.2, "sawtooth", 0.03);
    ageInput.value = "";
    ageInput.focus({ preventScroll: true });
  }
}
unlockBtn.addEventListener("click", checkAge);
ageInput.addEventListener("keydown", e => { if (e.key === "Enter") checkAge(); });

async function runUnlockSequence() {
  unlockBtn.disabled = true;
  ageInput.disabled = true;
  gateFeedback.textContent = "";
  SoundManager.chime();

  bigNumber.classList.add("charged");
  gsap.to(ringGroup.scale, { x: 1.6, y: 1.6, z: 1.6, duration: 1.4, ease: "power2.out" });
  gsap.to(ringGroup.children.map(r => r.material), { opacity: 0.55, duration: 0.6 });
  createBurst(new THREE.Vector3(0, 0, 8), PARTICLE_COUNTS.burst, 0xe3c27d, 5, glowTexGold);

  gateFormEl.classList.remove("visible");
  await wait(600);

  await typeMessage("ACCESS GRANTED.", 1200);
  await typeMessage("Okay… officially an adult now. 👀", 1600);
  await typeMessage(`${CONFIG.correctAge} years unlocked.`, 1400);
  await typeMessage("New chapter loading…", 1300);

  goToScene("scene-reveal");
  runRevealIntro();
}

function runRevealIntro() {
  const title = document.getElementById("reveal-title");
  const sub = document.getElementById("reveal-sub");
  const btn = document.querySelector("#scene-reveal .next-btn");
  gsap.fromTo(title, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, delay: 0.2 });
  gsap.fromTo(sub, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, delay: 0.7 });
  setTimeout(() => btn.classList.add("visible"), 1600);
  createBurst(new THREE.Vector3(0, 0, 4), PARTICLE_COUNTS.burst * 0.6, 0xb6a4f5, 4);
}

/* ===========================================================
   TRAIT CARDS (Scene 3)
=========================================================== */
document.querySelectorAll(".trait-card").forEach(card => {
  card.addEventListener("click", () => {
    card.classList.toggle("flipped");
    SoundManager.sparkle();
  });
});

/* subtle tilt on desktop mouse move / mobile device orientation */
const cardField = document.getElementById("card-field");
if (!isMobile) {
  cardField.addEventListener("mousemove", e => {
    const rect = cardField.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    cardField.querySelectorAll(".trait-card-inner").forEach(inner => {
      if (inner.closest(".trait-card").classList.contains("flipped")) return;
      inner.style.transform = `rotateY(${relX * 10}deg) rotateX(${-relY * 10}deg)`;
    });
  });
  cardField.addEventListener("mouseleave", () => {
    cardField.querySelectorAll(".trait-card-inner").forEach(inner => {
      if (!inner.closest(".trait-card").classList.contains("flipped")) inner.style.transform = "";
    });
  });
}

/* ===========================================================
   CAKE SCENE (Scene 4)
=========================================================== */
const cakeLineEl = document.getElementById("cake-line");
const cakeHintEl = document.getElementById("cake-hint");
const cakeContinueBtn = document.getElementById("cake-continue-btn");
let cakeSceneReady = false;

function setupCakeScene() {
  cakeContinueBtn.classList.remove("visible");
  cakeHintEl.classList.remove("visible");
  candles.forEach(c => {
    c.lit = true;
    c.flame.visible = true;
    c.light.intensity = 0.6;
  });
  cakeLineEl.textContent = "Okay, one thing left…";
  cakeSceneReady = false;

  setTimeout(() => { cakeLineEl.textContent = "Make a wish."; }, 1500);
  setTimeout(() => {
    cakeLineEl.textContent = "Tap the candles ✨";
    cakeHintEl.classList.add("visible");
    cakeSceneReady = true;
  }, 3000);
}

const raycaster = new THREE.Raycaster();
const pointerVec = new THREE.Vector2();

function handleCandleTap(clientX, clientY) {
  if (!cakeSceneReady || currentEnv !== "cake") return;
  pointerVec.x = (clientX / window.innerWidth) * 2 - 1;
  pointerVec.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerVec, camera);

  const litFlames = candles.filter(c => c.lit).map(c => c.flame);
  const hits = raycaster.intersectObjects(litFlames);
  if (hits.length === 0) return;

  const hitFlame = hits[0].object;
  const candle = candles.find(c => c.flame === hitFlame);
  extinguishCandle(candle);
}

function extinguishCandle(candle) {
  candle.lit = false;
  const worldPos = candle.flame.position.clone();
  gsap.to(candle.flame.scale, { x: 0, y: 0, duration: 0.3, onComplete: () => { candle.flame.visible = false; } });
  gsap.to(candle.light, { intensity: 0, duration: 0.4 });
  spawnSmoke(worldPos);
  SoundManager.whoosh();

  if (candles.every(c => !c.lit)) {
    setTimeout(finishCakeScene, 900);
  }
}

function finishCakeScene() {
  cakeHintEl.classList.remove("visible");
  cakeLineEl.textContent = "Wish officially sent. ✨";
  createBurst(new THREE.Vector3(0, 0.5, -0.6), PARTICLE_COUNTS.burst, 0xe3c27d, 4, glowTexGold);
  gsap.to(camera.position, { y: camera.position.y + 0.4, duration: 1.4, yoyo: true, repeat: 1, ease: "sine.inOut" });
  SoundManager.chime();
  setTimeout(() => cakeContinueBtn.classList.add("visible"), 1200);
}

/* Listeners are attached to document (not the canvas) because the
   transparent DOM scene layer sits above the canvas and would
   otherwise intercept the click before it reaches renderer.domElement.
   The click still bubbles up to document with the correct coordinates. */
document.addEventListener("click", e => {
  if (currentEnv !== "cake") return;
  handleCandleTap(e.clientX, e.clientY);
});
document.addEventListener("touchstart", e => {
  if (currentEnv !== "cake") return;
  if (!e.touches || !e.touches[0]) return;
  const t = e.touches[0];
  handleCandleTap(t.clientX, t.clientY);
}, { passive: true });

/* ===========================================================
   FINALE SCENE (Scene 6)
=========================================================== */
let finaleReady = false;
function setupFinaleScene() {
  finaleReady = false;
  document.querySelectorAll("#scene-finale .finale-line").forEach(l => l.classList.remove("shown"));

  const mesh = buildConstellationFromText(CONFIG.name.toUpperCase());
  mesh.userData.progress = 0;
  gsap.to(mesh.userData, {
    progress: 1, duration: 3.2, ease: "power2.out",
    onComplete: () => { finaleReady = true; revealFinaleText(); }
  });

  gsap.fromTo(camera.position, { z: camera.position.z }, { z: envCameraZ.finale, duration: 3.2, ease: "power2.out" });
}

function revealFinaleText() {
  const lines = document.querySelectorAll("#scene-finale .finale-line");
  lines.forEach((line, i) => {
    setTimeout(() => line.classList.add("shown"), i * 900);
  });
  setTimeout(() => document.getElementById("replay-btn").classList.add("visible"), lines.length * 900 + 400);
}

document.getElementById("replay-btn").addEventListener("click", () => {
  window.location.reload();
});

/* ===========================================================
   LOADING SCREEN → START
=========================================================== */
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("loading-screen").classList.add("hidden");
    goToScene("scene-gate");
    runGateIntro();
  }, 1400);
});
