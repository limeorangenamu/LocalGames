const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use("/vendor/three", express.static(path.join(__dirname, "node_modules", "three", "build")));

const WORLD = {
  width: 96,
  depth: 96,
  tickRate: 60,
  playerRadius: 0.55,
  playerHeight: 1.8,
  eyeHeight: 1.55,
  bulletRadius: 0.14,
  floorY: 0,
  gravity: 23,
  jumpVelocity: 8.8,
  sprintMultiplier: 1.42,
  skillMaxCharge: 100,
};

const SKILL_CHARGE = {
  max: 100,
  passivePerSecond: 3,
  damageMultiplier: 0.45,
};

const TANK_BARRIER = {
  maxHp: 1000,
  width: 4.8,
  height: 2.8,
  thickness: 0.34,
  distance: 2.25,
  bottomY: 0.15,
};

const TANK_STUN = {
  range: 9.5,
  halfAngle: Math.PI / 4,
  durationMs: 1500,
};

const TANK_HAMMER = {
  range: 4.4,
  halfAngle: Math.PI / 2.35,
  attackMs: 430,
};

const ASSAULT = {
  maxAmmo: 20,
  reloadMs: 1350,
  rifleRange: 82,
  rocketAmmo: 4,
  rocketSpeed: 36,
  rocketFireDelayMs: 360,
};

const SUPPORT = {
  maxAmmo: 15,
  reloadMs: 1350,
  shurikenSpeed: 108,
  boostMs: 5000,
  boostFireRateMultiplier: 0.55,
};

const MAP = {
  bounds: { minX: -48, maxX: 48, minZ: -48, maxZ: 48 },
  spawnPoints: [
    { x: -37, z: -36, yaw: 0.75 },
    { x: 37, z: -36, yaw: -0.75 },
    { x: -38, z: 35, yaw: 2.35 },
    { x: 38, z: 35, yaw: -2.35 },
    { x: -4, z: -41, yaw: 0 },
    { x: 4, z: 41, yaw: Math.PI },
    { x: -42, z: 0, yaw: Math.PI / 2 },
    { x: 42, z: 0, yaw: -Math.PI / 2 },
  ],
  colliders: [
    { id: "north-wall", x: 0, z: -49, w: 98, d: 2, h: 5.5, color: "#323843" },
    { id: "south-wall", x: 0, z: 49, w: 98, d: 2, h: 5.5, color: "#323843" },
    { id: "west-wall", x: -49, z: 0, w: 2, d: 98, h: 5.5, color: "#323843" },
    { id: "east-wall", x: 49, z: 0, w: 2, d: 98, h: 5.5, color: "#323843" },

    { id: "north-manor-left", x: -17, z: -35, w: 22, d: 12, h: 7.5, color: "#4c5260" },
    { id: "north-manor-right", x: 17, z: -35, w: 22, d: 12, h: 7.5, color: "#4c5260" },
    { id: "north-manor-back", x: 0, z: -42, w: 46, d: 4, h: 8.5, color: "#3f4654" },
    { id: "west-gallery", x: -36, z: -15, w: 10, d: 26, h: 5, color: "#454b58" },
    { id: "east-gallery", x: 36, z: -15, w: 10, d: 26, h: 5, color: "#454b58" },
    { id: "west-tower", x: -35, z: 28, w: 10, d: 10, h: 7, color: "#505764" },
    { id: "east-tower", x: 35, z: 28, w: 10, d: 10, h: 7, color: "#505764" },

    { id: "fountain-base", x: 0, z: 0, w: 7, d: 7, h: 1.1, color: "#718096" },
    { id: "fountain-pillar", x: 0, z: 0, w: 2.6, d: 2.6, h: 3.2, color: "#8ba3b3" },
    { id: "courtyard-cover-nw", x: -15, z: -9, w: 9, d: 3, h: 1.7, color: "#595f6b" },
    { id: "courtyard-cover-se", x: 15, z: 9, w: 9, d: 3, h: 1.7, color: "#595f6b" },
    { id: "courtyard-cover-ne", x: 16, z: -11, w: 3, d: 9, h: 1.7, color: "#595f6b" },
    { id: "courtyard-cover-sw", x: -16, z: 11, w: 3, d: 9, h: 1.7, color: "#595f6b" },

    { id: "south-terrace-left", x: -18, z: 32, w: 20, d: 5, h: 2.4, color: "#48505d" },
    { id: "south-terrace-right", x: 18, z: 32, w: 20, d: 5, h: 2.4, color: "#48505d" },
    { id: "center-arch-left", x: -7, z: -23, w: 4, d: 10, h: 4.2, color: "#515968" },
    { id: "center-arch-right", x: 7, z: -23, w: 4, d: 10, h: 4.2, color: "#515968" },
  ],
};

const HEROES = {
  assault: {
    label: "Assault",
    maxHp: 100,
    speed: 7.2,
    bulletSpeed: ASSAULT.rocketSpeed,
    damage: 10,
    rocketDamage: 40,
    fireDelayMs: 95,
    maxAmmo: ASSAULT.maxAmmo,
    reloadMs: ASSAULT.reloadMs,
  },
  tank: {
    label: "Tank",
    maxHp: 200,
    speed: 5.6,
    bulletSpeed: 0,
    damage: 50,
    fireDelayMs: 760,
  },
  support: {
    label: "Support",
    maxHp: 95,
    speed: 6.8,
    bulletSpeed: SUPPORT.shurikenSpeed,
    damage: 8,
    fireDelayMs: 180,
    maxAmmo: SUPPORT.maxAmmo,
    reloadMs: SUPPORT.reloadMs,
  },
};

const COLORS = ["#ef4444", "#38bdf8", "#22c55e", "#facc15", "#a78bfa", "#2dd4bf", "#fb923c"];

const players = new Map();
const bullets = new Map();
const impacts = new Map();
let bulletSeq = 0;
let impactSeq = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeName(name) {
  const cleaned = String(name || "").trim().slice(0, 14);
  return cleaned || "Player";
}

function sanitizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

function sanitizeHero(hero) {
  return HEROES[hero] ? hero : "assault";
}

function colliderBounds(c) {
  return {
    minX: c.x - c.w / 2,
    maxX: c.x + c.w / 2,
    minY: c.y || 0,
    maxY: (c.y || 0) + c.h,
    minZ: c.z - c.d / 2,
    maxZ: c.z + c.d / 2,
  };
}

function circleHitsBox(x, z, radius, collider) {
  const b = colliderBounds(collider);
  const closestX = clamp(x, b.minX, b.maxX);
  const closestZ = clamp(z, b.minZ, b.maxZ);
  const dx = x - closestX;
  const dz = z - closestZ;
  return dx * dx + dz * dz < radius * radius;
}

function pointInsideBox(x, y, z, collider) {
  const b = colliderBounds(collider);
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ;
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function isBlocked(x, z, radius) {
  return MAP.colliders.some((collider) => circleHitsBox(x, z, radius, collider));
}

function moveWithCollision(p, nextX, nextZ) {
  const bounds = MAP.bounds;
  const radius = WORLD.playerRadius;

  const clampedX = clamp(nextX, bounds.minX + radius, bounds.maxX - radius);
  if (!isBlocked(clampedX, p.z, radius)) {
    p.x = clampedX;
  }

  const clampedZ = clamp(nextZ, bounds.minZ + radius, bounds.maxZ - radius);
  if (!isBlocked(p.x, clampedZ, radius)) {
    p.z = clampedZ;
  }
}

function directionFromAngles(yaw, pitch = 0) {
  const clampedPitch = clamp(pitch, -1.25, 1.25);
  const cp = Math.cos(clampedPitch);
  return {
    x: Math.sin(yaw) * cp,
    y: Math.sin(clampedPitch),
    z: -Math.cos(yaw) * cp,
  };
}

function playerEye(p) {
  return { x: p.x, y: p.y + WORLD.eyeHeight, z: p.z };
}

function spawnPoint() {
  const sorted = [...MAP.spawnPoints].sort(() => Math.random() - 0.5);
  const point = sorted.find((candidate) => {
    if (isBlocked(candidate.x, candidate.z, WORLD.playerRadius)) return false;
    for (const p of players.values()) {
      if (!p.alive) continue;
      if (Math.hypot(p.x - candidate.x, p.z - candidate.z) < 8) return false;
    }
    return true;
  });
  return point || sorted[0] || { x: 0, z: 8, yaw: 0 };
}

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    hero: p.hero,
    x: Number(p.x.toFixed(3)),
    y: Number(p.y.toFixed(3)),
    z: Number(p.z.toFixed(3)),
    hp: Math.round(p.hp),
    maxHp: p.maxHp,
    yaw: p.yaw,
    pitch: p.pitch,
    grounded: p.grounded,
    sprinting: p.sprinting,
    stunnedUntil: p.stunnedUntil,
    color: p.color,
    score: p.score,
    deaths: p.deaths,
    skillCharge: Math.round(p.skillCharge),
    skillMaxCharge: SKILL_CHARGE.max,
    alive: p.alive,
    weaponMode: p.weaponMode,
    ammo: p.ammo,
    maxAmmo: p.maxAmmo,
    reloadingUntil: p.reloadingUntil,
    reloadMs: p.reloadMs,
    rocketAmmo: p.rocketAmmo,
    barrierActive: p.barrierActive,
    barrierHp: Math.max(0, Math.round(p.barrierHp)),
    barrierMaxHp: p.barrierMaxHp,
    attackUntil: p.attackUntil,
    attackStartedAt: p.attackStartedAt,
    swingSide: p.swingSide,
    fireBoostUntil: p.fireBoostUntil,
  };
}

function applyHeroStats(p) {
  const hero = HEROES[p.hero];
  p.hp = hero.maxHp;
  p.maxHp = hero.maxHp;
  p.speed = hero.speed;
  p.bulletSpeed = hero.bulletSpeed;
  p.damage = hero.damage;
  p.rocketDamage = hero.rocketDamage || 0;
  p.fireDelayMs = hero.fireDelayMs;
  p.maxAmmo = hero.maxAmmo || 0;
  p.reloadMs = hero.reloadMs || 0;
  p.ammo = hero.maxAmmo || 0;
  p.weaponMode = p.hero === "assault" ? "rifle" : p.hero === "tank" ? "hammer" : "shuriken";
  p.rocketAmmo = 0;
  p.reloadingUntil = 0;
  p.barrierMaxHp = p.hero === "tank" ? TANK_BARRIER.maxHp : 0;
  p.barrierHp = p.barrierMaxHp;
  p.barrierActive = false;
  p.attackUntil = 0;
  p.attackStartedAt = 0;
  p.swingSide = "left";
  p.nextSwingSide = "left";
  p.fireBoostUntil = 0;
  p.stunnedUntil = 0;
}

function respawn(p) {
  const point = spawnPoint();

  p.x = point.x;
  p.y = WORLD.floorY;
  p.z = point.z;
  p.vy = 0;
  p.yaw = point.yaw || 0;
  p.pitch = 0;
  p.grounded = true;
  p.sprinting = false;
  p.lastShotAt = 0;
  p.skillCharge = 0;
  p.alive = true;
  applyHeroStats(p);
}

function makePlayer(socket, payload) {
  const heroKey = sanitizeHero(payload.hero);
  const point = spawnPoint();
  const player = {
    id: socket.id,
    name: sanitizeName(payload.name),
    hero: heroKey,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    x: point.x,
    y: WORLD.floorY,
    z: point.z,
    vy: 0,
    yaw: point.yaw || 0,
    pitch: 0,
    grounded: true,
    sprinting: false,
    input: {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      shooting: false,
      secondary: false,
      reload: false,
      skill: false,
      yaw: point.yaw || 0,
      pitch: 0,
    },
    lastShotAt: 0,
    skillCharge: 0,
    score: 0,
    deaths: 0,
    alive: true,
  };
  applyHeroStats(player);
  return player;
}

io.on("connection", (socket) => {
  socket.emit("hello", {
    id: socket.id,
    world: WORLD,
    map: MAP,
    heroes: Object.fromEntries(Object.entries(HEROES).map(([key, h]) => [key, {
      label: h.label,
      maxHp: h.maxHp,
      speed: h.speed,
      damage: h.damage,
      fireDelayMs: h.fireDelayMs,
      maxAmmo: h.maxAmmo || 0,
      reloadMs: h.reloadMs || 0,
    }])),
  });

  socket.on("join", (payload = {}) => {
    const player = makePlayer(socket, payload);
    players.set(socket.id, player);
    socket.emit("joined", { id: socket.id });
  });

  socket.on("leave", () => {
    players.delete(socket.id);
  });

  socket.on("chat", (payload = {}) => {
    const p = players.get(socket.id);
    if (!p) return;

    const text = sanitizeText(payload.text);
    if (!text) return;

    io.emit("chat", {
      id: socket.id,
      name: p.name,
      text,
      at: Date.now(),
    });
  });

  socket.on("input", (input = {}) => {
    const p = players.get(socket.id);
    if (!p || !p.alive) return;

    p.input.forward = !!input.forward;
    p.input.backward = !!input.backward;
    p.input.left = !!input.left;
    p.input.right = !!input.right;
    p.input.sprint = !!input.sprint;
    p.input.jump = p.input.jump || !!input.jump;
    p.input.shooting = !!input.shooting;
    p.input.secondary = !!input.secondary;
    p.input.reload = p.input.reload || !!input.reload;
    p.input.skill = !!input.skill;
    p.input.yaw = Number.isFinite(input.yaw) ? input.yaw : p.yaw;
    p.input.pitch = Number.isFinite(input.pitch) ? clamp(input.pitch, -1.25, 1.25) : p.pitch;
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
  });
});

function rayIntersectsAabb(origin, dir, min, max) {
  let tMin = -Infinity;
  let tMax = Infinity;

  for (const axis of ["x", "y", "z"]) {
    if (Math.abs(dir[axis]) < 0.00001) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      continue;
    }

    let t1 = (min[axis] - origin[axis]) / dir[axis];
    let t2 = (max[axis] - origin[axis]) / dir[axis];
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (tMax < 0) return null;
  return tMin >= 0 ? tMin : tMax;
}

function rayHitsWorldDistance(origin, dir, maxDistance) {
  let best = null;
  for (const collider of MAP.colliders) {
    const b = colliderBounds(collider);
    const hit = rayIntersectsAabb(
      origin,
      dir,
      { x: b.minX, y: b.minY, z: b.minZ },
      { x: b.maxX, y: b.maxY, z: b.maxZ },
    );
    if (hit === null || hit > maxDistance) continue;
    if (best === null || hit < best) best = hit;
  }
  return best;
}

function rayHitsPlayer(origin, dir, target, maxDistance) {
  const targetMid = {
    x: target.x,
    y: target.y + WORLD.playerHeight * 0.5,
    z: target.z,
  };
  const toTarget = {
    x: targetMid.x - origin.x,
    y: targetMid.y - origin.y,
    z: targetMid.z - origin.z,
  };
  const t = dot(toTarget, dir);
  if (t < 0 || t > maxDistance) return null;

  const hitPoint = {
    x: origin.x + dir.x * t,
    y: origin.y + dir.y * t,
    z: origin.z + dir.z * t,
  };
  const nearestY = clamp(hitPoint.y, target.y, target.y + WORLD.playerHeight);
  const dx = target.x - hitPoint.x;
  const dy = nearestY - hitPoint.y;
  const dz = target.z - hitPoint.z;
  const radius = WORLD.playerRadius + WORLD.bulletRadius;
  return dx * dx + dy * dy + dz * dz <= radius * radius ? t : null;
}

function barrierFrame(owner) {
  const forward = directionFromAngles(owner.yaw, 0);
  const right = { x: Math.cos(owner.yaw), y: 0, z: Math.sin(owner.yaw) };
  const up = { x: 0, y: 1, z: 0 };
  const center = {
    x: owner.x + forward.x * TANK_BARRIER.distance,
    y: TANK_BARRIER.bottomY + TANK_BARRIER.height / 2,
    z: owner.z + forward.z * TANK_BARRIER.distance,
  };

  return {
    center,
    axes: { x: right, y: up, z: forward },
    half: {
      x: TANK_BARRIER.width / 2,
      y: TANK_BARRIER.height / 2,
      z: TANK_BARRIER.thickness / 2,
    },
  };
}

function rayHitsBarrier(origin, dir, owner, maxDistance) {
  const frame = barrierFrame(owner);
  const localOrigin = {
    x: dot({ x: origin.x - frame.center.x, y: origin.y - frame.center.y, z: origin.z - frame.center.z }, frame.axes.x),
    y: dot({ x: origin.x - frame.center.x, y: origin.y - frame.center.y, z: origin.z - frame.center.z }, frame.axes.y),
    z: dot({ x: origin.x - frame.center.x, y: origin.y - frame.center.y, z: origin.z - frame.center.z }, frame.axes.z),
  };
  const localDir = {
    x: dot(dir, frame.axes.x),
    y: dot(dir, frame.axes.y),
    z: dot(dir, frame.axes.z),
  };

  const hit = rayIntersectsAabb(
    localOrigin,
    localDir,
    { x: -frame.half.x, y: -frame.half.y, z: -frame.half.z },
    { x: frame.half.x, y: frame.half.y, z: frame.half.z },
  );
  return hit !== null && hit <= maxDistance ? hit : null;
}

function pointInsideBarrier(point, owner) {
  const frame = barrierFrame(owner);
  const delta = {
    x: point.x - frame.center.x,
    y: point.y - frame.center.y,
    z: point.z - frame.center.z,
  };
  const local = {
    x: dot(delta, frame.axes.x),
    y: dot(delta, frame.axes.y),
    z: dot(delta, frame.axes.z),
  };

  return (
    Math.abs(local.x) <= frame.half.x &&
    Math.abs(local.y) <= frame.half.y &&
    Math.abs(local.z) <= frame.half.z
  );
}

function activeBarrierOwners(exceptId = null) {
  return [...players.values()].filter((p) => (
    p.id !== exceptId &&
    p.alive &&
    p.hero === "tank" &&
    p.barrierActive &&
    p.barrierHp > 0
  ));
}

function finishReload(p, now) {
  if (!p.maxAmmo) return;
  if (p.reloadingUntil && now >= p.reloadingUntil) {
    p.ammo = p.maxAmmo;
    p.reloadingUntil = 0;
  }
}

function startReload(p, now) {
  if (!p.maxAmmo) return;
  if (p.hero === "assault" && p.weaponMode !== "rifle") return;
  if (p.reloadingUntil || p.ammo >= p.maxAmmo) return;

  p.reloadingUntil = now + p.reloadMs;
}

function addSkillCharge(p, amount) {
  if (!p || !p.alive) return;
  p.skillCharge = clamp((p.skillCharge || 0) + amount, 0, SKILL_CHARGE.max);
}

function addDamageCharge(attacker, actualDamage) {
  if (!attacker || actualDamage <= 0) return;
  addSkillCharge(attacker, actualDamage * SKILL_CHARGE.damageMultiplier);
}

function damageBarrier(owner, damage, attacker = null) {
  const before = owner.barrierHp;
  owner.barrierHp = clamp(owner.barrierHp - damage, 0, owner.barrierMaxHp);
  addDamageCharge(attacker, Math.max(0, before - owner.barrierHp));
  if (owner.barrierHp <= 0) {
    owner.barrierActive = false;
  }
}

function hitPointAt(origin, dir, distance) {
  return {
    x: origin.x + dir.x * distance,
    y: origin.y + dir.y * distance,
    z: origin.z + dir.z * distance,
  };
}

function addImpact(kind, ownerId, point, now) {
  impactSeq += 1;
  impacts.set(String(impactSeq), {
    id: String(impactSeq),
    kind,
    ownerId,
    x: point.x,
    y: point.y,
    z: point.z,
    createdAt: now,
    ttlMs: 420,
  });
}

function eliminate(target, attacker) {
  target.alive = false;
  target.deaths += 1;
  target.barrierActive = false;
  if (attacker && attacker.id !== target.id) attacker.score += 1;

  setTimeout(() => {
    const stillHere = players.get(target.id);
    if (stillHere) respawn(stillHere);
  }, 1200);
}

function applyDamage(target, damage, attacker) {
  if (!target.alive) return;
  const before = target.hp;
  target.hp -= damage;
  addDamageCharge(attacker, Math.max(0, Math.min(before, damage)));
  if (target.hp <= 0) {
    eliminate(target, attacker);
  }
}

function fireRifle(p, now) {
  if (p.reloadingUntil) return;

  if (p.ammo <= 0) {
    startReload(p, now);
    return;
  }

  if (now - p.lastShotAt < p.fireDelayMs) return;
  p.lastShotAt = now;
  p.attackUntil = now + 90;
  p.attackStartedAt = now;
  p.ammo -= 1;

  const origin = playerEye(p);
  const dir = directionFromAngles(p.yaw, p.pitch);
  const maxRange = ASSAULT.rifleRange;
  const worldDistance = rayHitsWorldDistance(origin, dir, maxRange);
  let best = {
    type: worldDistance === null ? "none" : "world",
    distance: worldDistance ?? maxRange,
  };

  for (const owner of activeBarrierOwners(p.id)) {
    const hit = rayHitsBarrier(origin, dir, owner, best.distance);
    if (hit !== null && hit < best.distance) {
      best = { type: "barrier", distance: hit, owner };
    }
  }

  for (const target of players.values()) {
    if (!target.alive || target.id === p.id) continue;
    const hit = rayHitsPlayer(origin, dir, target, best.distance);
    if (hit !== null && hit < best.distance) {
      best = { type: "player", distance: hit, target };
    }
  }

  if (best.type === "barrier") {
    damageBarrier(best.owner, p.damage, p);
    addImpact("barrier", p.id, hitPointAt(origin, dir, best.distance), now);
  }

  if (best.type === "player") {
    applyDamage(best.target, p.damage, p);
    addImpact("player", p.id, hitPointAt(origin, dir, best.distance), now);
  }

  if (best.type === "world") {
    addImpact("world", p.id, hitPointAt(origin, dir, best.distance), now);
  }

  if (p.ammo <= 0) {
    startReload(p, now);
  }
}

function fireRocket(p, now) {
  if (now - p.lastShotAt < ASSAULT.rocketFireDelayMs) return;

  if (p.rocketAmmo <= 0) {
    p.weaponMode = "rifle";
    return;
  }

  const dir = directionFromAngles(p.yaw, p.pitch);
  p.lastShotAt = now;
  p.attackUntil = now + 160;
  p.attackStartedAt = now;
  bulletSeq += 1;

  bullets.set(String(bulletSeq), {
    id: String(bulletSeq),
    kind: "rocket",
    ownerId: p.id,
    x: p.x + dir.x * 0.9,
    y: p.y + WORLD.eyeHeight + dir.y * 0.25,
    z: p.z + dir.z * 0.9,
    vx: dir.x * ASSAULT.rocketSpeed,
    vy: dir.y * ASSAULT.rocketSpeed,
    vz: dir.z * ASSAULT.rocketSpeed,
    damage: p.rocketDamage,
    radius: 0.26,
    createdAt: now,
    ttlMs: 2200,
  });

  p.rocketAmmo -= 1;
  if (p.rocketAmmo <= 0) {
    p.weaponMode = "rifle";
  }
}

function swingHammer(p, now) {
  if (p.barrierActive) return;
  if (now - p.lastShotAt < p.fireDelayMs) return;

  p.lastShotAt = now;
  p.attackUntil = now + TANK_HAMMER.attackMs;
  p.attackStartedAt = now;
  p.swingSide = p.nextSwingSide || "left";
  p.nextSwingSide = p.swingSide === "left" ? "right" : "left";

  for (const target of players.values()) {
    if (!target.alive || target.id === p.id) continue;
    if (!targetInCone(p, target, TANK_HAMMER.range, TANK_HAMMER.halfAngle)) continue;
    applyDamage(target, p.damage, p);
  }
}

function shootProjectile(p, now) {
  if (p.reloadingUntil) return;

  if (p.maxAmmo && p.ammo <= 0) {
    startReload(p, now);
    return;
  }

  const fireDelay = p.fireBoostUntil > now
    ? p.fireDelayMs * SUPPORT.boostFireRateMultiplier
    : p.fireDelayMs;
  if (now - p.lastShotAt < fireDelay) return;

  const dir = directionFromAngles(p.yaw, p.pitch);
  p.lastShotAt = now;
  p.attackUntil = now + 110;
  p.attackStartedAt = now;
  if (p.maxAmmo) p.ammo -= 1;
  bulletSeq += 1;

  bullets.set(String(bulletSeq), {
    id: String(bulletSeq),
    kind: p.hero === "support" ? "shuriken" : "support",
    ownerId: p.id,
    x: p.x + dir.x * 0.9,
    y: p.y + WORLD.eyeHeight + dir.y * 0.25,
    z: p.z + dir.z * 0.9,
    vx: dir.x * p.bulletSpeed,
    vy: dir.y * p.bulletSpeed,
    vz: dir.z * p.bulletSpeed,
    damage: p.damage,
    radius: WORLD.bulletRadius,
    createdAt: now,
    ttlMs: 1400,
  });

  if (p.maxAmmo && p.ammo <= 0) {
    startReload(p, now);
  }
}

function shoot(p, now) {
  if (p.hero === "assault") {
    if (p.weaponMode === "rocket") {
      fireRocket(p, now);
    } else {
      fireRifle(p, now);
    }
    return;
  }

  if (p.hero === "tank") {
    swingHammer(p, now);
    return;
  }

  shootProjectile(p, now);
}

function targetInCone(source, target, range, halfAngle) {
  const dx = target.x - source.x;
  const dz = target.z - source.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 0.001 || dist > range) return false;

  const forward = directionFromAngles(source.yaw, 0);
  const facing = (forward.x * dx + forward.z * dz) / dist;
  return facing >= Math.cos(halfAngle);
}

function useSkill(p, now) {
  if ((p.skillCharge || 0) < SKILL_CHARGE.max) return;

  if (p.hero === "assault") {
    if (p.weaponMode === "rocket") return;
    p.skillCharge = 0;
    p.weaponMode = "rocket";
    p.rocketAmmo = ASSAULT.rocketAmmo;
    p.reloadingUntil = 0;
    return;
  }

  if (p.hero === "tank") {
    p.skillCharge = 0;
    p.attackStartedAt = now;
    p.attackUntil = now + 280;

    for (const target of players.values()) {
      if (!target.alive || target.id === p.id) continue;
      if (!targetInCone(p, target, TANK_STUN.range, TANK_STUN.halfAngle)) continue;
      target.stunnedUntil = Math.max(target.stunnedUntil, now + TANK_STUN.durationMs);
    }
    return;
  }

  if (p.hero === "support") {
    p.skillCharge = 0;
    p.hp = clamp(p.hp + 32, 0, p.maxHp);
    p.fireBoostUntil = now + SUPPORT.boostMs;
  }
}

function updatePlayers(dt, now) {
  for (const p of players.values()) {
    if (!p.alive) continue;

    finishReload(p, now);
    addSkillCharge(p, SKILL_CHARGE.passivePerSecond * dt);

    p.yaw = p.input.yaw;
    p.pitch = p.input.pitch;

    const stunned = p.stunnedUntil > now;
    p.barrierActive = p.hero === "tank" && !stunned && p.input.secondary && p.barrierHp > 0;

    if (!stunned && p.input.reload) {
      startReload(p, now);
    }
    p.input.reload = false;

    let moveX = 0;
    let moveZ = 0;

    if (!stunned) {
      const forward = directionFromAngles(p.yaw, 0);
      const right = { x: Math.cos(p.yaw), z: Math.sin(p.yaw) };

      if (p.input.forward) {
        moveX += forward.x;
        moveZ += forward.z;
      }
      if (p.input.backward) {
        moveX -= forward.x;
        moveZ -= forward.z;
      }
      if (p.input.right) {
        moveX += right.x;
        moveZ += right.z;
      }
      if (p.input.left) {
        moveX -= right.x;
        moveZ -= right.z;
      }

      const moveLen = Math.hypot(moveX, moveZ);
      if (moveLen > 0) {
        moveX /= moveLen;
        moveZ /= moveLen;
      }

      p.sprinting = p.input.sprint && p.input.forward && !p.input.backward;
      const speed = p.speed * (p.sprinting ? WORLD.sprintMultiplier : 1);
      moveWithCollision(p, p.x + moveX * speed * dt, p.z + moveZ * speed * dt);

      if (p.input.jump && p.grounded) {
        p.vy = WORLD.jumpVelocity;
        p.grounded = false;
      }
    } else {
      p.sprinting = false;
    }
    p.input.jump = false;

    p.vy -= WORLD.gravity * dt;
    p.y += p.vy * dt;
    if (p.y <= WORLD.floorY) {
      p.y = WORLD.floorY;
      p.vy = 0;
      p.grounded = true;
    }

    if (!stunned && p.input.shooting) shoot(p, now);

    if (!stunned && p.input.skill) {
      useSkill(p, now);
      p.input.skill = false;
    }
    if (stunned) {
      p.input.skill = false;
    }
  }
}

function bulletHitsPlayer(b, p, previous = null) {
  if (previous) {
    const delta = { x: b.x - previous.x, y: b.y - previous.y, z: b.z - previous.z };
    const distance = Math.hypot(delta.x, delta.y, delta.z);
    if (distance > 0) {
      const dir = { x: delta.x / distance, y: delta.y / distance, z: delta.z / distance };
      return rayHitsPlayer(previous, dir, p, distance) !== null;
    }
  }

  const nearestY = clamp(b.y, p.y, p.y + WORLD.playerHeight);
  const dx = p.x - b.x;
  const dy = nearestY - b.y;
  const dz = p.z - b.z;
  const radius = WORLD.playerRadius + (b.radius || WORLD.bulletRadius);
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

function bulletHitsWorld(b) {
  if (
    b.x < MAP.bounds.minX - 2 ||
    b.x > MAP.bounds.maxX + 2 ||
    b.z < MAP.bounds.minZ - 2 ||
    b.z > MAP.bounds.maxZ + 2 ||
    b.y < -2 ||
    b.y > 28
  ) {
    return true;
  }

  return MAP.colliders.some((collider) => pointInsideBox(b.x, b.y, b.z, collider));
}

function bulletHitsBarrier(b, previous = null) {
  if (previous) {
    const delta = { x: b.x - previous.x, y: b.y - previous.y, z: b.z - previous.z };
    const distance = Math.hypot(delta.x, delta.y, delta.z);
    if (distance > 0) {
      const dir = { x: delta.x / distance, y: delta.y / distance, z: delta.z / distance };
      const owner = activeBarrierOwners(b.ownerId).find((barrierOwner) => (
        rayHitsBarrier(previous, dir, barrierOwner, distance + (b.radius || WORLD.bulletRadius)) !== null
      ));
      if (owner) return owner;
    }
  }

  const point = { x: b.x, y: b.y, z: b.z };
  return activeBarrierOwners(b.ownerId).find((owner) => pointInsideBarrier(point, owner));
}

function updateBullets(dt, now) {
  for (const [id, b] of bullets.entries()) {
    const previous = { x: b.x, y: b.y, z: b.z };
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    if (now - b.createdAt > b.ttlMs || bulletHitsWorld(b)) {
      bullets.delete(id);
      continue;
    }

    const barrierOwner = bulletHitsBarrier(b, previous);
    if (barrierOwner) {
      damageBarrier(barrierOwner, b.damage, players.get(b.ownerId));
      bullets.delete(id);
      continue;
    }

    for (const target of players.values()) {
      if (!target.alive || target.id === b.ownerId) continue;
      if (!bulletHitsPlayer(b, target, previous)) continue;

      const attacker = players.get(b.ownerId);
      applyDamage(target, b.damage, attacker);
      bullets.delete(id);
      break;
    }
  }
}

function updateImpacts(now) {
  for (const [id, impact] of impacts.entries()) {
    if (now - impact.createdAt > impact.ttlMs) {
      impacts.delete(id);
    }
  }
}

function broadcastState() {
  io.emit("state", {
    now: Date.now(),
    world: WORLD,
    players: [...players.values()].map(publicPlayer),
    bullets: [...bullets.values()].map((b) => ({
      id: b.id,
      kind: b.kind,
      ownerId: b.ownerId,
      x: Number(b.x.toFixed(3)),
      y: Number(b.y.toFixed(3)),
      z: Number(b.z.toFixed(3)),
    })),
    impacts: [...impacts.values()].map((impact) => ({
      id: impact.id,
      kind: impact.kind,
      ownerId: impact.ownerId,
      x: Number(impact.x.toFixed(3)),
      y: Number(impact.y.toFixed(3)),
      z: Number(impact.z.toFixed(3)),
    })),
  });
}

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  updatePlayers(dt, now);
  updateBullets(dt, now);
  updateImpacts(now);
  broadcastState();
}, 1000 / WORLD.tickRate);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Academy Hero Arena running on http://localhost:${PORT}`);
  console.log(`LAN players can join with http://YOUR_PC_LOCAL_IP:${PORT}`);
});
