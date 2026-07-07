import * as THREE from "/vendor/three/three.module.js";

const socket = io();

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const joinBtn = document.getElementById("joinBtn");
const nameInput = document.getElementById("nameInput");
const canvas = document.getElementById("canvas");
const playerInfo = document.getElementById("playerInfo");
const skillInfo = document.getElementById("skillInfo");
const skillGaugeFill = document.getElementById("skillGaugeFill");
const skillGaugeText = document.getElementById("skillGaugeText");
const scoreboard = document.getElementById("scoreboard");
const lockHint = document.getElementById("lockHint");
const chatPanel = document.getElementById("chatPanel");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

const FALLBACK_WORLD = {
  width: 96,
  depth: 96,
  eyeHeight: 1.55,
  playerHeight: 1.8,
};

const FALLBACK_MAP = {
  bounds: { minX: -48, maxX: 48, minZ: -48, maxZ: 48 },
  colliders: [],
  spawnPoints: [],
};

let myId = null;
let selectedHero = "assault";
let world = FALLBACK_WORLD;
let arenaMap = FALLBACK_MAP;
let state = { players: [], bullets: [], impacts: [] };
let initialLookSynced = false;

let renderer;
let scene;
let camera;
let mapGroup;
let playersGroup;
let bulletsGroup;
let impactsGroup;
let weaponGroup;
let initialized = false;

let yaw = 0;
let pitch = 0;
let wasPointerLocked = false;

const LOOK_SENSITIVITY = 0.0022;
const MAX_PITCH = 1.22;
const playerMeshes = new Map();
const bulletMeshes = new Map();
const impactMeshes = new Map();
const materialCache = new Map();

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
};

const input = {
  shooting: false,
  secondary: false,
  jump: false,
  reload: false,
  skill: false,
};

const chatLog = [];
let chatActive = false;

document.querySelectorAll(".hero").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".hero").forEach((b) => b.classList.remove("selected"));
    button.classList.add("selected");
    selectedHero = button.dataset.hero;
  });
});

joinBtn.addEventListener("click", () => {
  const name = nameInput.value.trim() || "Player";
  initThree();
  resetInputState();
  initialLookSynced = false;
  menu.classList.add("hidden");
  game.classList.remove("hidden");
  resizeRenderer();
  socket.emit("join", { name, hero: selectedHero });
  requestPointerLock();
});

socket.on("hello", (payload) => {
  world = payload.world || FALLBACK_WORLD;
  arenaMap = payload.map || FALLBACK_MAP;
  if (initialized) buildMap();
});

socket.on("joined", (payload) => {
  myId = payload.id;
});

socket.on("chat", (message) => {
  chatLog.push(message);
  if (chatLog.length > 8) chatLog.shift();
  renderChat();
});

socket.on("state", (payload) => {
  state = payload;
  world = payload.world || world;

  const me = getMe();
  if (me && !initialLookSynced) {
    yaw = me.yaw || 0;
    pitch = me.pitch || 0;
    initialLookSynced = true;
  }
});

function initThree() {
  if (initialized) return;
  initialized = true;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x9ca9a8, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#9ca9a8");
  scene.fog = new THREE.Fog("#9ca9a8", 55, 155);

  camera = new THREE.PerspectiveCamera(76, 1, 0.05, 260);
  scene.add(camera);

  mapGroup = new THREE.Group();
  playersGroup = new THREE.Group();
  bulletsGroup = new THREE.Group();
  impactsGroup = new THREE.Group();
  scene.add(mapGroup, playersGroup, bulletsGroup, impactsGroup);

  const hemi = new THREE.HemisphereLight("#e7dfd1", "#424136", 2.3);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight("#fff2d4", 2.2);
  sun.position.set(-22, 35, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  buildMap();
  buildWeapon();
  resizeRenderer();
  requestAnimationFrame(render);
}

function getMaterial(color, roughness = 0.75, metalness = 0.02) {
  const key = `${color}:${roughness}:${metalness}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    }));
  }
  return materialCache.get(key);
}

function makeBox({ w, h, d, color, roughness = 0.8 }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    getMaterial(color, roughness),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeShuriken(size = 0.32, color = "#d9e2e6") {
  const group = new THREE.Group();
  const bladeMaterial = getMaterial(color, 0.35, 0.25);

  for (let i = 0; i < 4; i += 1) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(size, size * 0.14, size * 0.06),
      bladeMaterial,
    );
    blade.rotation.z = (Math.PI / 4) + i * (Math.PI / 2);
    blade.castShadow = true;
    group.add(blade);
  }

  return group;
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse?.((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
  }
}

function buildMap() {
  if (!mapGroup) return;
  clearGroup(mapGroup);

  const bounds = arenaMap.bounds || FALLBACK_MAP.bounds;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    getMaterial("#665f52", 0.9),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, centerZ);
  floor.receiveShadow = true;
  mapGroup.add(floor);

  const courtyard = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 42),
    getMaterial("#746f64", 0.88),
  );
  courtyard.rotation.x = -Math.PI / 2;
  courtyard.position.set(0, 0.012, 0);
  courtyard.receiveShadow = true;
  mapGroup.add(courtyard);

  const northPath = makeBox({ w: 12, h: 0.06, d: 36, color: "#807467", roughness: 0.95 });
  northPath.position.set(0, 0.03, -22);
  northPath.receiveShadow = true;
  mapGroup.add(northPath);

  const eastPath = makeBox({ w: 30, h: 0.06, d: 10, color: "#807467", roughness: 0.95 });
  eastPath.position.set(25, 0.03, 4);
  eastPath.receiveShadow = true;
  mapGroup.add(eastPath);

  const westPath = makeBox({ w: 30, h: 0.06, d: 10, color: "#807467", roughness: 0.95 });
  westPath.position.set(-25, 0.03, 4);
  westPath.receiveShadow = true;
  mapGroup.add(westPath);

  const grid = new THREE.GridHelper(width, 32, "#3d3a35", "#4b463f");
  grid.position.set(centerX, 0.025, centerZ);
  mapGroup.add(grid);

  for (const collider of arenaMap.colliders || []) {
    const mesh = makeBox({
      w: collider.w,
      h: collider.h,
      d: collider.d,
      color: collider.color || "#4b5563",
    });
    mesh.position.set(collider.x, (collider.y || 0) + collider.h / 2, collider.z);
    mapGroup.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: "#161616", transparent: true, opacity: 0.2 }),
    );
    edges.position.copy(mesh.position);
    mapGroup.add(edges);
  }

  buildFountainWater();
  buildStairDetails();
}

function buildFountainWater() {
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(3.0, 3.0, 0.08, 36),
    getMaterial("#52b7c4", 0.25, 0),
  );
  water.position.set(0, 1.16, 0);
  water.receiveShadow = true;
  mapGroup.add(water);
}

function buildStairDetails() {
  const stairMaterial = getMaterial("#756a5f", 0.9);
  const stairSets = [
    { x: 0, z: -16, rot: 0 },
    { x: 0, z: 24, rot: Math.PI },
    { x: -24, z: 18, rot: Math.PI / 2 },
    { x: 24, z: 18, rot: -Math.PI / 2 },
  ];

  for (const set of stairSets) {
    for (let i = 0; i < 5; i += 1) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(8, 0.16, 0.9), stairMaterial);
      step.position.set(set.x, 0.08 + i * 0.08, set.z + i * 0.9);
      step.rotation.y = set.rot;
      step.castShadow = true;
      step.receiveShadow = true;
      mapGroup.add(step);
    }
  }
}

function buildWeapon() {
  weaponGroup = new THREE.Group();

  const rifle = new THREE.Group();
  rifle.name = "rifle";
  rifle.visible = false;
  const rifleBody = makeBox({ w: 0.18, h: 0.16, d: 0.58, color: "#242424", roughness: 0.55 });
  rifleBody.position.set(0.32, -0.26, -0.62);
  rifle.add(rifleBody);
  const rifleBarrel = makeBox({ w: 0.08, h: 0.08, d: 0.44, color: "#3f4445", roughness: 0.42 });
  rifleBarrel.position.set(0.32, -0.23, -0.98);
  rifle.add(rifleBarrel);
  const rifleHand = makeBox({ w: 0.18, h: 0.18, d: 0.18, color: "#8d6952", roughness: 0.7 });
  rifleHand.position.set(0.22, -0.35, -0.46);
  rifle.add(rifleHand);
  weaponGroup.add(rifle);

  const rocket = new THREE.Group();
  rocket.name = "rocket";
  rocket.visible = false;
  const launcher = makeBox({ w: 0.3, h: 0.24, d: 0.86, color: "#303436", roughness: 0.5 });
  launcher.position.set(0.32, -0.24, -0.66);
  rocket.add(launcher);
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.76, 20),
    getMaterial("#4b5254", 0.42),
  );
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0.32, -0.22, -0.88);
  tube.castShadow = true;
  rocket.add(tube);
  weaponGroup.add(rocket);

  const hammers = new THREE.Group();
  hammers.name = "hammers";
  hammers.visible = false;
  const hammer = new THREE.Group();
  hammer.name = "longHammer";
  hammer.position.set(0.18, -0.28, -0.72);
  hammer.rotation.z = -0.22;

  const handle = makeBox({ w: 0.09, h: 0.09, d: 1.55, color: "#5b3f2e", roughness: 0.72 });
  handle.position.z = -0.18;
  hammer.add(handle);

  const gripA = makeBox({ w: 0.2, h: 0.16, d: 0.18, color: "#8d6952", roughness: 0.72 });
  gripA.position.set(-0.15, -0.03, 0.2);
  hammer.add(gripA);

  const gripB = makeBox({ w: 0.2, h: 0.16, d: 0.18, color: "#8d6952", roughness: 0.72 });
  gripB.position.set(0.15, -0.02, -0.18);
  hammer.add(gripB);

  const head = makeBox({ w: 0.72, h: 0.36, d: 0.32, color: "#4a4f52", roughness: 0.44 });
  head.position.z = -0.98;
  hammer.add(head);
  hammers.add(hammer);
  weaponGroup.add(hammers);

  const shurikenWeapon = new THREE.Group();
  shurikenWeapon.name = "shurikenWeapon";
  shurikenWeapon.visible = false;
  const shuriken = makeShuriken(0.36, "#cfd8dc");
  shuriken.position.set(0.3, -0.23, -0.62);
  shuriken.rotation.x = Math.PI / 2;
  shurikenWeapon.add(shuriken);
  const shurikenHand = makeBox({ w: 0.18, h: 0.18, d: 0.18, color: "#8d6952", roughness: 0.7 });
  shurikenHand.position.set(0.22, -0.34, -0.44);
  shurikenWeapon.add(shurikenHand);
  weaponGroup.add(shurikenWeapon);

  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.86, 0.06),
    new THREE.MeshBasicMaterial({
      color: "#7dd3fc",
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  barrier.name = "barrier";
  barrier.position.set(0, -0.12, -0.76);
  barrier.visible = false;
  weaponGroup.add(barrier);

  camera.add(weaponGroup);
}

function createPlayerMesh(player) {
  const group = new THREE.Group();
  group.userData.id = player.id;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 1.22, 16),
    getMaterial(player.color || "#38bdf8", 0.62),
  );
  body.position.y = 0.78;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 12),
    getMaterial("#f1d6bb", 0.7),
  );
  head.position.y = 1.58;
  head.castShadow = true;
  group.add(head);

  const barrel = makeBox({ w: 0.14, h: 0.12, d: 0.8, color: "#202324", roughness: 0.55 });
  barrel.name = "gun";
  barrel.position.set(0, 1.18, -0.58);
  group.add(barrel);

  const supportShuriken = makeShuriken(0.38, "#e2e8f0");
  supportShuriken.name = "supportShuriken";
  supportShuriken.position.set(0.18, 1.18, -0.52);
  supportShuriken.rotation.x = Math.PI / 2;
  supportShuriken.visible = false;
  group.add(supportShuriken);

  const tankHammers = new THREE.Group();
  tankHammers.name = "tankHammers";
  const longHandle = makeBox({ w: 0.1, h: 0.1, d: 1.4, color: "#5b3f2e", roughness: 0.72 });
  longHandle.position.set(0.26, 1.0, -0.28);
  longHandle.rotation.x = 0.18;
  longHandle.rotation.z = -0.35;
  const longHead = makeBox({ w: 0.7, h: 0.34, d: 0.28, color: "#4a4f52", roughness: 0.44 });
  longHead.position.set(0.48, 1.17, -0.82);
  longHead.rotation.z = -0.35;
  tankHammers.add(longHandle, longHead);
  tankHammers.visible = false;
  group.add(tankHammers);

  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 2.8, 0.16),
    new THREE.MeshBasicMaterial({
      color: "#7dd3fc",
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  barrier.name = "barrier";
  barrier.position.set(0, 1.55, -2.25);
  barrier.visible = false;
  group.add(barrier);

  const stun = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.045, 8, 24),
    new THREE.MeshBasicMaterial({ color: "#facc15" }),
  );
  stun.name = "stun";
  stun.position.y = 2.12;
  stun.rotation.x = Math.PI / 2;
  stun.visible = false;
  group.add(stun);

  playersGroup.add(group);
  playerMeshes.set(player.id, group);
  return group;
}

function updatePlayerMeshes() {
  const liveIds = new Set();
  const now = Date.now();

  for (const player of state.players) {
    if (player.id === myId) continue;
    liveIds.add(player.id);

    const mesh = playerMeshes.get(player.id) || createPlayerMesh(player);
    mesh.visible = player.alive;
    mesh.position.set(player.x, player.y || 0, player.z);
    mesh.rotation.y = -(player.yaw || 0);

    const barrier = mesh.getObjectByName("barrier");
    if (barrier) barrier.visible = !!player.barrierActive;

    const stun = mesh.getObjectByName("stun");
    if (stun) stun.visible = player.stunnedUntil > now;

    const gun = mesh.getObjectByName("gun");
    if (gun) gun.visible = player.hero === "assault";

    const supportShuriken = mesh.getObjectByName("supportShuriken");
    if (supportShuriken) {
      supportShuriken.visible = player.hero === "support";
      if (supportShuriken.visible) supportShuriken.rotation.z += 0.08;
    }

    const tankHammers = mesh.getObjectByName("tankHammers");
    if (tankHammers) {
      tankHammers.visible = player.hero === "tank" && !player.barrierActive;
      tankHammers.rotation.y = 0;
      tankHammers.rotation.z = 0;

      if (tankHammers.visible && player.attackUntil > now) {
        const duration = Math.max(1, player.attackUntil - player.attackStartedAt);
        const progress = clamp((now - player.attackStartedAt) / duration, 0, 1);
        const direction = player.swingSide === "right" ? -1 : 1;
        tankHammers.rotation.y = direction * (-0.9 + progress * 1.8);
        tankHammers.rotation.z = direction * Math.sin(progress * Math.PI) * 0.5;
      }
    }
  }

  for (const [id, mesh] of playerMeshes.entries()) {
    if (liveIds.has(id)) continue;
    playersGroup.remove(mesh);
    mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
    playerMeshes.delete(id);
  }
}

function updateBulletMeshes() {
  const activeIds = new Set();

  for (const bullet of state.bullets) {
    activeIds.add(bullet.id);
    let mesh = bulletMeshes.get(bullet.id);
    if (!mesh) {
      const isRocket = bullet.kind === "rocket";
      const isShuriken = bullet.kind === "shuriken";
      if (isShuriken) {
        mesh = makeShuriken(0.42, "#e2e8f0");
      } else {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(isRocket ? 0.28 : 0.14, 12, 8),
          getMaterial(isRocket ? "#fb923c" : "#fff6cf", 0.22),
        );
      }
      mesh.castShadow = true;
      bulletsGroup.add(mesh);
      bulletMeshes.set(bullet.id, mesh);
    }
    mesh.position.set(bullet.x, bullet.y, bullet.z);
    if (bullet.kind === "shuriken") {
      mesh.rotation.x += 0.35;
      mesh.rotation.z += 0.45;
    }
  }

  for (const [id, mesh] of bulletMeshes.entries()) {
    if (activeIds.has(id)) continue;
    bulletsGroup.remove(mesh);
    mesh.traverse?.((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
    bulletMeshes.delete(id);
  }
}

function updateImpactMeshes() {
  const activeIds = new Set();

  for (const impact of state.impacts || []) {
    activeIds.add(impact.id);
    let mesh = impactMeshes.get(impact.id);

    if (!mesh) {
      mesh = new THREE.Group();
      const color = impact.kind === "player" ? "#ef4444" : impact.kind === "barrier" ? "#7dd3fc" : "#facc15";
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 8),
        new THREE.MeshBasicMaterial({ color }),
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.025, 8, 20),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
      );
      ring.rotation.x = Math.PI / 2;
      mesh.add(spark, ring);
      impactsGroup.add(mesh);
      impactMeshes.set(impact.id, mesh);
    }

    mesh.position.set(impact.x, impact.y, impact.z);
    mesh.rotation.y += 0.16;
    const agePulse = 1 + Math.sin(Date.now() * 0.025) * 0.18;
    mesh.scale.setScalar(agePulse);
  }

  for (const [id, mesh] of impactMeshes.entries()) {
    if (activeIds.has(id)) continue;
    impactsGroup.remove(mesh);
    mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
    impactMeshes.delete(id);
  }
}

function lookDirection(currentYaw = yaw, currentPitch = pitch) {
  const cp = Math.cos(currentPitch);
  return new THREE.Vector3(
    Math.sin(currentYaw) * cp,
    Math.sin(currentPitch),
    -Math.cos(currentYaw) * cp,
  );
}

function updateCamera() {
  const me = getMe();
  if (!me || !camera) return;

  const eyeY = (me.y || 0) + (world.eyeHeight || 1.55);
  camera.position.set(me.x, eyeY, me.z);

  const dir = lookDirection();
  camera.lookAt(camera.position.x + dir.x, camera.position.y + dir.y, camera.position.z + dir.z);

  if (weaponGroup) {
    updateWeaponVisuals(me);
  }
}

function updateWeaponVisuals(me) {
  const rifle = weaponGroup.getObjectByName("rifle");
  const rocket = weaponGroup.getObjectByName("rocket");
  const hammers = weaponGroup.getObjectByName("hammers");
  const shurikenWeapon = weaponGroup.getObjectByName("shurikenWeapon");
  const barrier = weaponGroup.getObjectByName("barrier");

  const isTank = me.hero === "tank";
  const isSupport = me.hero === "support";
  const isRocket = me.hero === "assault" && me.weaponMode === "rocket";
  const isRifle = me.hero === "assault" && !isRocket;

  if (rifle) rifle.visible = isRifle;
  if (rocket) rocket.visible = isRocket;
  if (hammers) hammers.visible = isTank && !me.barrierActive;
  if (shurikenWeapon) shurikenWeapon.visible = isSupport;
  if (barrier) barrier.visible = isTank && me.barrierActive;

  const attacking = me.attackUntil > Date.now();
  weaponGroup.position.y = attacking ? -0.03 : 0;

  const longHammer = weaponGroup.getObjectByName("longHammer");
  if (longHammer) {
    longHammer.rotation.y = 0;
    longHammer.rotation.z = -0.22;

    if (isTank && attacking) {
      const duration = Math.max(1, me.attackUntil - me.attackStartedAt);
      const progress = clamp((Date.now() - me.attackStartedAt) / duration, 0, 1);
      const eased = Math.sin(progress * Math.PI);
      const direction = me.swingSide === "right" ? -1 : 1;
      longHammer.rotation.y = direction * (-0.95 + progress * 1.9);
      longHammer.rotation.z = -0.22 + direction * eased * 0.55;
    }
  }

  const shuriken = shurikenWeapon?.children?.[0];
  if (shuriken) shuriken.rotation.z += attacking && isSupport ? 0.25 : 0.04;
}

function renderHud() {
  const me = getMe();

  if (!me) {
    playerInfo.textContent = "Connecting...";
    skillInfo.textContent = "Space jump | Shift sprint";
    skillGaugeFill.style.width = "0%";
    skillGaugeText.textContent = "Q Gauge 0/100";
    scoreboard.textContent = "";
    return;
  }

  playerInfo.textContent = `${me.name} | ${me.hero} | HP ${me.hp}/${me.maxHp} | K ${me.score} / D ${me.deaths}`;

  const now = Date.now();
  const movementText = `${me.grounded ? "Grounded" : "Airborne"} | ${me.sprinting ? "Sprinting" : "Walking"}`;
  const skillCharge = Math.max(0, Math.min(me.skillCharge || 0, me.skillMaxCharge || 100));
  const skillRatio = skillCharge / (me.skillMaxCharge || 100);
  skillGaugeFill.style.width = `${skillRatio * 100}%`;
  skillGaugeText.textContent = skillCharge >= (me.skillMaxCharge || 100)
    ? "Q Ready"
    : `Q Gauge ${Math.round(skillCharge)}/${me.skillMaxCharge || 100}`;

  let weaponText = "";
  if (me.hero === "assault") {
    if (me.weaponMode === "rocket") {
      weaponText = `Rocket ${me.rocketAmmo}/4`;
    } else if (me.reloadingUntil > now) {
      weaponText = `Reloading ${((me.reloadingUntil - now) / 1000).toFixed(1)}s`;
    } else {
      weaponText = `Rifle ${me.ammo}/${me.maxAmmo}`;
    }
  }

  if (me.hero === "support") {
    if (me.reloadingUntil > now) {
      weaponText = `Shuriken Reloading ${((me.reloadingUntil - now) / 1000).toFixed(1)}s`;
    } else {
      weaponText = `Shuriken ${me.ammo}/${me.maxAmmo}`;
    }

    if (me.fireBoostUntil > now) {
      weaponText += ` | Boost ${((me.fireBoostUntil - now) / 1000).toFixed(1)}s`;
    }
  }

  if (me.hero === "tank") {
    weaponText = me.barrierActive
      ? `Barrier ${me.barrierHp}/${me.barrierMaxHp}`
      : `Hammer | Barrier ${me.barrierHp}/${me.barrierMaxHp}`;
  }

  const statusParts = [movementText, weaponText];
  if (me.stunnedUntil > now) {
    statusParts.unshift(`Stunned ${((me.stunnedUntil - now) / 1000).toFixed(1)}s`);
  }
  skillInfo.textContent = statusParts.filter(Boolean).join(" | ");

  const ranking = [...state.players]
    .sort((a, b) => b.score - a.score)
    .map((p) => `${p.name}: ${p.score}`)
    .join(" | ");

  scoreboard.textContent = ranking || "Waiting for players";
}

function render() {
  if (!initialized) return;

  updatePlayerMeshes();
  updateBulletMeshes();
  updateImpactMeshes();
  updateCamera();
  renderHud();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function getMe() {
  return state.players.find((p) => p.id === myId);
}

function resetInputState() {
  keys.forward = false;
  keys.backward = false;
  keys.left = false;
  keys.right = false;
  keys.sprint = false;
  input.shooting = false;
  input.secondary = false;
  input.jump = false;
  input.reload = false;
  input.skill = false;
}

function returnToHeroSelect() {
  if (game.classList.contains("hidden")) return;

  socket.emit("leave");
  myId = null;
  state = { players: [], bullets: [], impacts: [] };
  initialLookSynced = false;
  resetInputState();
  closeChat();
  wasPointerLocked = false;
  document.exitPointerLock?.();
  game.classList.add("hidden");
  menu.classList.remove("hidden");
  lockHint.classList.add("hidden");
}

function openChat() {
  if (game.classList.contains("hidden")) return;
  chatActive = true;
  chatInput.classList.remove("hidden");
  chatInput.value = "";
  chatInput.focus();
  resetInputState();
}

function closeChat() {
  chatActive = false;
  chatInput.classList.add("hidden");
  chatInput.value = "";
  canvas.focus();
}

function submitChat() {
  const text = chatInput.value.trim();
  if (text) {
    socket.emit("chat", { text });
  }
  closeChat();
}

function renderChat() {
  chatMessages.innerHTML = "";

  for (const message of chatLog) {
    const line = document.createElement("div");
    line.className = "chat-line";

    const name = document.createElement("span");
    name.className = "chat-name";
    name.textContent = `${message.name}:`;

    line.append(name, document.createTextNode(message.text));
    chatMessages.appendChild(line);
  }
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function requestPointerLock() {
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
  }
}

function setMovementKey(code, value) {
  if (code === "KeyW" || code === "ArrowUp") keys.forward = value;
  if (code === "KeyS" || code === "ArrowDown") keys.backward = value;
  if (code === "KeyA" || code === "ArrowLeft") keys.left = value;
  if (code === "KeyD" || code === "ArrowRight") keys.right = value;
  if (code === "ShiftLeft" || code === "ShiftRight") keys.sprint = value;
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && !game.classList.contains("hidden")) {
    event.preventDefault();
    returnToHeroSelect();
    return;
  }

  if (chatActive) {
    if (event.code === "Enter") {
      event.preventDefault();
      submitChat();
    }
    return;
  }

  if (!menu.classList.contains("hidden") && document.activeElement === nameInput) return;

  if (event.code === "Enter" && !game.classList.contains("hidden")) {
    event.preventDefault();
    openChat();
    return;
  }

  setMovementKey(event.code, true);

  if (event.code === "Space") {
    input.jump = true;
    event.preventDefault();
  }

  if (event.code === "KeyQ") {
    input.skill = true;
  }

  if (event.code === "KeyR") {
    input.reload = true;
  }

  if (event.code.startsWith("Arrow") || event.code === "Space") {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  setMovementKey(event.code, false);
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) return;
  if (chatActive) return;
  yaw += event.movementX * LOOK_SENSITIVITY;
  pitch = clamp(pitch - event.movementY * LOOK_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
});

canvas.addEventListener("mousedown", (event) => {
  if (chatActive) return;
  requestPointerLock();
  if (event.button === 0) input.shooting = true;
  if (event.button === 2) input.secondary = true;
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 0) input.shooting = false;
  if (event.button === 2) input.secondary = false;
});

canvas.addEventListener("click", requestPointerLock);

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  if (wasPointerLocked && !locked && !game.classList.contains("hidden") && !chatActive) {
    returnToHeroSelect();
  }
  wasPointerLocked = locked;
  lockHint.classList.toggle("hidden", locked || game.classList.contains("hidden"));
});

window.addEventListener("blur", () => {
  resetInputState();
});

window.addEventListener("resize", resizeRenderer);
window.addEventListener("contextmenu", (event) => event.preventDefault());

setInterval(() => {
  if (!myId) return;
  socket.emit("input", {
    forward: keys.forward,
    backward: keys.backward,
    left: keys.left,
    right: keys.right,
    sprint: keys.sprint,
    jump: input.jump,
    shooting: input.shooting,
    secondary: input.secondary,
    reload: input.reload,
    skill: input.skill,
    yaw,
    pitch,
  });
  input.jump = false;
  input.reload = false;
  input.skill = false;
}, 1000 / 60);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
