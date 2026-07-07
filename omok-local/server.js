const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 5 * 1024 * 1024,
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ECONOMY_FILE = path.join(DATA_DIR, 'economy.json');
const SKIN_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'skins');
const OMOK_SIZE = 15;
const JANGGI_ROWS = 10;
const JANGGI_COLS = 9;
const CHESS_SIZE = 8;
const MAX_CHAT_MESSAGES = 50;
const CHESS_PROMOTION_TYPES = new Set(['queen', 'rook', 'bishop', 'knight']);
const ALKKAGI_BOARD_COLS = JANGGI_COLS;
const ALKKAGI_BOARD_ROWS = JANGGI_ROWS;
const ALKKAGI_POWER_SCALE = 0.272;
const ALKKAGI_FRICTION = 0.9552;
const ALKKAGI_RESTITUTION = 0.88;
const ALKKAGI_STOP_SPEED = 0.006;
const ALKKAGI_MAX_STEPS = 460;
const ALKKAGI_FRAME_INTERVAL = 1;
const ALKKAGI_REWARD_INTERVAL = 5;
const ALKKAGI_REWARD_CHOICES = 3;
const ALKKAGI_MAX_EFFECTIVE_POWER = 4;
const ALKKAGI_GIANT_SCALE = 1.5;
const ALKKAGI_RPG_STEP = 0.2;
const ALKKAGI_SIZE_MASS_EXPONENT = 1.55;
const ALKKAGI_COLLISION_MASS_EXPONENT = 1.35;
const GOLD_WIN_REWARD = 5;
const GOLD_LOSS_REWARD = 2;
const MIN_REWARDED_GAME_MS = 2 * 60 * 1000;
const MIN_REWARDED_ACTIONS_PER_PLAYER = 3;
const SHOP_ADMIN_NICKNAME = '서버장';
const SKIN_TARGET_PIECE = 'janggi-piece';
const SKIN_TARGET_TRAIL = 'alkkagi-trail';
const ALKKAGI_TRAIL_SLOT = 'alkkagiTrail';
const ALKKAGI_TRAIL_STYLES = new Set(['fire', 'rainbow', 'comet', 'smoke']);
const ALKKAGI_PIECE_METRICS = {
  jang: { diameter: 0.83, mass: 1.8 },
  cha: { diameter: 0.64, mass: 1 },
  po: { diameter: 0.64, mass: 1 },
  ma: { diameter: 0.64, mass: 1 },
  sang: { diameter: 0.64, mass: 1 },
  sa: { diameter: 0.51, mass: 0.58 },
  soldier: { diameter: 0.51, mass: 0.58 },
};
const ALKKAGI_OPTION_DEFS = {
  tekkai: { target: 'own' },
  mauga: { target: 'none' },
  beer: { target: 'own' },
  zergling: { target: 'none' },
  giant: { target: 'ownNonJang' },
  illusion: { target: 'own', targetCount: 2 },
  rpg: { target: 'own' },
  rezero: { target: 'own' },
};
const ALKKAGI_OPTION_IDS = Object.keys(ALKKAGI_OPTION_DEFS);
const JANGGI_PIECE_SCORES = {
  cha: 13,
  po: 7,
  ma: 5,
  sang: 3,
  sa: 3,
  soldier: 2,
  jang: 0,
};

app.use(express.static(path.join(__dirname, 'public')));

function createEmptyOmokBoard() {
  return Array.from({ length: OMOK_SIZE }, () => Array(OMOK_SIZE).fill(null));
}

function createEmptyJanggiBoard() {
  return Array.from({ length: JANGGI_ROWS }, () => Array(JANGGI_COLS).fill(null));
}

function createEmptyChessBoard() {
  return Array.from({ length: CHESS_SIZE }, () => Array(CHESS_SIZE).fill(null));
}

function createPiece(side, type) {
  return { side, type };
}

function createChessPiece(side, type) {
  return { side, type, hasMoved: false };
}

function createJanggiBoard() {
  const board = createEmptyJanggiBoard();

  const placeBackRank = (side, row) => {
    board[row][0] = createPiece(side, 'cha');
    board[row][1] = createPiece(side, 'ma');
    board[row][2] = createPiece(side, 'sang');
    board[row][3] = createPiece(side, 'sa');
    board[row][5] = createPiece(side, 'sa');
    board[row][6] = createPiece(side, 'sang');
    board[row][7] = createPiece(side, 'ma');
    board[row][8] = createPiece(side, 'cha');
  };

  placeBackRank('white', 0);
  board[1][4] = createPiece('white', 'jang');
  board[2][1] = createPiece('white', 'po');
  board[2][7] = createPiece('white', 'po');
  for (const col of [0, 2, 4, 6, 8]) {
    board[3][col] = createPiece('white', 'soldier');
  }

  placeBackRank('black', 9);
  board[8][4] = createPiece('black', 'jang');
  board[7][1] = createPiece('black', 'po');
  board[7][7] = createPiece('black', 'po');
  for (const col of [0, 2, 4, 6, 8]) {
    board[6][col] = createPiece('black', 'soldier');
  }

  return board;
}

function createAlkkagiPieceObject(id, side, type, x, y, overrides = {}) {
  const metrics = ALKKAGI_PIECE_METRICS[type] || ALKKAGI_PIECE_METRICS.cha;
  return {
    id,
    side,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: metrics.diameter / 2,
    mass: metrics.mass,
    alive: true,
    powerMultiplier: 1,
    originX: x,
    originY: y,
    ...overrides,
  };
}

function createAlkkagiPieces() {
  const board = createJanggiBoard();
  const pieces = [];

  for (let row = 0; row < JANGGI_ROWS; row += 1) {
    for (let col = 0; col < JANGGI_COLS; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;

      pieces.push(createAlkkagiPieceObject(
        `${piece.side}-${piece.type}-${row}-${col}`,
        piece.side,
        piece.type,
        col + 0.5,
        row + 0.5,
      ));
    }
  }

  return pieces;
}

function createChessBoard() {
  const board = createEmptyChessBoard();
  const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  for (let col = 0; col < CHESS_SIZE; col += 1) {
    board[0][col] = createChessPiece('black', backRank[col]);
    board[1][col] = createChessPiece('black', 'pawn');
    board[6][col] = createChessPiece('white', 'pawn');
    board[7][col] = createChessPiece('white', backRank[col]);
  }

  return board;
}

const users = new Map();
const rooms = new Map();
let nextRoomId = 1;
let lobbyChatMessages = [];
let economy = loadEconomy();

function ensureDataDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(SKIN_UPLOAD_DIR, { recursive: true });
}

function loadEconomy() {
  try {
    ensureDataDirs();
    if (!fs.existsSync(ECONOMY_FILE)) {
      return { players: {}, skins: [] };
    }

    const parsed = JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8'));
    const skins = Array.isArray(parsed.skins)
      ? parsed.skins.map((skin) => {
        const target = skin.target === SKIN_TARGET_TRAIL ? SKIN_TARGET_TRAIL : SKIN_TARGET_PIECE;
        return {
          ...skin,
          target,
          active: skin.active !== false,
          effect: target === SKIN_TARGET_TRAIL ? sanitizeTrailEffect(skin.effect) : skin.effect,
        };
      })
      : [];

    return {
      players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
      skins,
    };
  } catch (error) {
    console.error('Failed to load economy data:', error);
    return { players: {}, skins: [] };
  }
}

function saveEconomy() {
  try {
    ensureDataDirs();
    fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save economy data:', error);
  }
}

function sanitizeName(name) {
  return (name || '손님').toString().trim().slice(0, 16) || '손님';
}

function nicknameKey(name) {
  return sanitizeName(name).replace(/\s+/g, ' ').toLocaleLowerCase();
}

function isNicknameTaken(name, ownSocketId) {
  const key = nicknameKey(name);
  for (const [socketId, user] of users) {
    if (socketId === ownSocketId) continue;
    if (nicknameKey(user.name) === key) return true;
  }
  return false;
}

function getWallet(name) {
  const cleanName = sanitizeName(name);
  const key = nicknameKey(cleanName);
  if (!economy.players[key]) {
    economy.players[key] = {
      name: cleanName,
      gold: 0,
      inventory: [],
      equipped: {},
    };
    saveEconomy();
  } else {
    economy.players[key].name = cleanName;
    if (!Array.isArray(economy.players[key].inventory)) {
      economy.players[key].inventory = [];
    }
    if (!economy.players[key].equipped || typeof economy.players[key].equipped !== 'object') {
      economy.players[key].equipped = {};
    }
    if (!Number.isFinite(Number(economy.players[key].gold))) {
      economy.players[key].gold = 0;
    }
  }

  return economy.players[key];
}

function addGoldToNickname(name, amount) {
  const wallet = getWallet(name);
  wallet.gold = Math.max(0, Math.floor(Number(wallet.gold) || 0) + amount);
  saveEconomy();
  return wallet.gold;
}

function publicProfile(socket, accepted = false) {
  const name = getUserName(socket.id);
  const wallet = getWallet(name);
  return {
    name,
    accepted,
    gold: wallet.gold,
    inventory: [...wallet.inventory],
    equipped: { ...wallet.equipped },
    isAdmin: name === SHOP_ADMIN_NICKNAME,
  };
}

function emitProfile(socket, accepted = false) {
  socket.emit('profile', publicProfile(socket, accepted));
}

function publicShopState(socket) {
  const name = getUserName(socket.id);
  const wallet = getWallet(name);
  const owned = new Set(wallet.inventory || []);
  const isAdmin = name === SHOP_ADMIN_NICKNAME;

  return {
    gold: wallet.gold,
    isAdmin,
    skins: (economy.skins || [])
      .filter((skin) => skin.active !== false || isAdmin)
      .map((skin) => ({
        id: skin.id,
        name: skin.name,
        price: skin.price,
        imageUrl: skin.imageUrl || null,
        target: skin.target,
        effect: skin.target === SKIN_TARGET_TRAIL ? sanitizeTrailEffect(skin.effect) : null,
        createdAt: skin.createdAt,
        active: skin.active !== false,
        owned: owned.has(skin.id),
        equippedTypes: Object.entries(wallet.equipped || {})
          .filter(([, skinId]) => skinId === skin.id)
          .map(([pieceType]) => pieceType),
      })),
  };
}

function emitShopState(socket) {
  socket.emit('shopState', publicShopState(socket));
}

function publicInventoryState(socket) {
  const name = getUserName(socket.id);
  const wallet = getWallet(name);

  return {
    gold: wallet.gold,
    equipped: { ...(wallet.equipped || {}) },
    skins: [...new Set(wallet.inventory || [])]
      .map((skinId) => findSkin(skinId))
      .filter(Boolean)
      .map((skin) => ({
        id: skin.id,
        name: skin.name,
        price: skin.price,
        imageUrl: skin.imageUrl || null,
        target: skin.target,
        effect: skin.target === SKIN_TARGET_TRAIL ? sanitizeTrailEffect(skin.effect) : null,
        createdAt: skin.createdAt,
        active: skin.active !== false,
        equippedTypes: Object.entries(wallet.equipped || {})
          .filter(([, skinId]) => skinId === skin.id)
          .map(([pieceType]) => pieceType),
      })),
  };
}

function emitInventoryState(socket) {
  socket.emit('inventoryState', publicInventoryState(socket));
}

function findSkin(skinId) {
  return (economy.skins || []).find((skin) => skin.id === skinId) || null;
}

function isJanggiSkinPieceType(pieceType) {
  return ['jang', 'cha', 'po', 'ma', 'sang', 'sa', 'soldier'].includes(pieceType);
}

function isAlkkagiTrailSkin(skin) {
  return skin?.target === SKIN_TARGET_TRAIL;
}

function isSkinEquipSlot(skin, pieceType) {
  if (isAlkkagiTrailSkin(skin)) return pieceType === ALKKAGI_TRAIL_SLOT;
  return isJanggiSkinPieceType(pieceType);
}

function pieceTypeLabel(pieceType) {
  if (pieceType === ALKKAGI_TRAIL_SLOT) return '이동 효과';

  return {
    jang: '장',
    cha: '차',
    po: '포',
    ma: '마',
    sang: '상',
    sa: '사',
    soldier: '졸/병',
  }[pieceType] || pieceType;
}

function publicSkinLoadout(socketId) {
  if (!socketId) return {};

  const wallet = getWallet(getUserName(socketId));
  const inventory = new Set(wallet.inventory || []);
  const loadout = {};

  for (const [pieceType, skinId] of Object.entries(wallet.equipped || {})) {
    if (!isJanggiSkinPieceType(pieceType) || !inventory.has(skinId)) continue;

    const skin = findSkin(skinId);
    if (!skin) continue;
    loadout[pieceType] = {
      id: skin.id,
      name: skin.name,
      imageUrl: skin.imageUrl,
    };
  }

  return loadout;
}

function publicAlkkagiTrailLoadout(socketId) {
  if (!socketId) return null;

  const wallet = getWallet(getUserName(socketId));
  const skinId = wallet.equipped?.[ALKKAGI_TRAIL_SLOT];
  if (!skinId || !(wallet.inventory || []).includes(skinId)) return null;

  const skin = findSkin(skinId);
  if (!isAlkkagiTrailSkin(skin)) return null;

  return {
    id: skin.id,
    name: skin.name,
    effect: sanitizeTrailEffect(skin.effect),
  };
}

function publicAlkkagiTrailLoadouts(room) {
  return {
    black: publicAlkkagiTrailLoadout(room.players.black),
    white: publicAlkkagiTrailLoadout(room.players.white),
  };
}

function sanitizeShopText(value, fallback = '알까기 말 스킨') {
  return (value || fallback).toString().trim().slice(0, 32) || fallback;
}

function sanitizeHexColor(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : fallback;
}

function sanitizeTrailEffect(effect = {}) {
  const source = effect && typeof effect === 'object' ? effect : {};
  const style = ALKKAGI_TRAIL_STYLES.has(source.style) ? source.style : 'fire';
  return {
    style,
    colorA: sanitizeHexColor(source.colorA, style === 'rainbow' ? '#ff4fd8' : '#ff4a1c'),
    colorB: sanitizeHexColor(source.colorB, style === 'rainbow' ? '#45d8ff' : '#ffd15a'),
    length: Number(clampNumber(Number(source.length) || 1.1, 0.6, 2).toFixed(2)),
    size: Number(clampNumber(Number(source.size) || 1, 0.6, 1.8).toFixed(2)),
    opacity: Number(clampNumber(Number(source.opacity) || 0.78, 0.35, 1).toFixed(2)),
  };
}

function parseSkinImageData(imageData) {
  const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(imageData || ''));
  if (!match) return null;

  const rawExt = match[1].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 3 * 1024 * 1024) return null;
  return { ext, buffer };
}

function createSkinItem({ name, price, imageData, createdBy }) {
  const image = parseSkinImageData(imageData);
  if (!image) {
    return { ok: false, message: 'PNG, JPG, WEBP, GIF 이미지만 3MB 이하로 업로드할 수 있습니다.' };
  }

  const cleanName = sanitizeShopText(name);
  const cleanPrice = Math.max(0, Math.min(999999, Math.floor(Number(price) || 0)));
  const id = `skin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${id}.${image.ext}`;
  const absolutePath = path.join(SKIN_UPLOAD_DIR, fileName);
  ensureDataDirs();
  fs.writeFileSync(absolutePath, image.buffer);

  const skin = {
    id,
    name: cleanName,
    price: cleanPrice,
    imageUrl: `/uploads/skins/${fileName}`,
    target: SKIN_TARGET_PIECE,
    createdBy,
    createdAt: Date.now(),
    active: true,
  };
  economy.skins.push(skin);
  saveEconomy();
  return { ok: true, skin };
}

function createTrailSkinItem({ name, price, effect, createdBy }) {
  const cleanName = sanitizeShopText(name, '알까기 이동 효과');
  const cleanPrice = Math.max(0, Math.min(999999, Math.floor(Number(price) || 0)));
  const id = `trail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const skin = {
    id,
    name: cleanName,
    price: cleanPrice,
    target: SKIN_TARGET_TRAIL,
    effect: sanitizeTrailEffect(effect),
    createdBy,
    createdAt: Date.now(),
    active: true,
  };
  economy.skins.push(skin);
  saveEconomy();
  return { ok: true, skin };
}

function addSkinToWallet(name, skinId) {
  const wallet = getWallet(name);
  if (!wallet.inventory.includes(skinId)) {
    wallet.inventory.push(skinId);
  }
  saveEconomy();
  return wallet;
}

function deleteSkinImageFile(skin) {
  if (!skin?.imageUrl?.startsWith('/uploads/skins/')) return;

  const uploadDir = path.resolve(SKIN_UPLOAD_DIR);
  const filePath = path.resolve(SKIN_UPLOAD_DIR, path.basename(skin.imageUrl));
  if (!filePath.startsWith(`${uploadDir}${path.sep}`)) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Failed to delete skin image file:', error);
  }
}

function removeSkinFromWallets(skinId) {
  for (const wallet of Object.values(economy.players || {})) {
    wallet.inventory = Array.isArray(wallet.inventory)
      ? wallet.inventory.filter((id) => id !== skinId)
      : [];

    if (!wallet.equipped || typeof wallet.equipped !== 'object') {
      wallet.equipped = {};
      continue;
    }

    for (const [pieceType, equippedSkinId] of Object.entries(wallet.equipped)) {
      if (equippedSkinId === skinId) {
        delete wallet.equipped[pieceType];
      }
    }
  }
}

function removeSkinItem(skinId) {
  const skinIndex = (economy.skins || []).findIndex((skin) => skin.id === skinId);
  if (skinIndex < 0) {
    return { ok: false, message: '존재하지 않는 스킨입니다.' };
  }

  const [skin] = economy.skins.splice(skinIndex, 1);
  removeSkinFromWallets(skin.id);
  deleteSkinImageFile(skin);
  saveEconomy();
  return { ok: true, skin };
}

function broadcastShopState() {
  for (const socket of io.sockets.sockets.values()) {
    emitShopState(socket);
    emitInventoryState(socket);
  }
}

function sanitizeRoomName(name, userName) {
  return (name || `${userName}의 방`).toString().trim().slice(0, 24) || `${userName}의 방`;
}

function getUserName(socketId) {
  return users.get(socketId)?.name || '손님';
}

function getRoomRole(room, socketId) {
  if (!room) return 'lobby';
  if (room.players.black === socketId) return 'black';
  if (room.players.white === socketId) return 'white';
  if (room.spectators.has(socketId)) return 'spectator';
  return 'lobby';
}

function initialBoardFor(room) {
  if (room.gameType === 'chess') return createChessBoard();
  if (room.gameType === 'alkkagi') return createJanggiBoard();
  if (room.gameType === 'janggi') return createJanggiBoard();
  return createEmptyOmokBoard();
}

function initialTurnFor(room) {
  return room.gameType === 'chess' ? 'white' : 'black';
}

function gameTypeLabel(gameType) {
  if (gameType === 'omok') return '오목';
  if (gameType === 'janggi') return '장기';
  if (gameType === 'chess') return '체스';
  if (gameType === 'alkkagi') return '알까기';
  return '게임';
}

function createRoom(ownerId, name) {
  const ownerName = getUserName(ownerId);
  const id = `room-${nextRoomId}`;
  nextRoomId += 1;

  return {
    id,
    name: sanitizeRoomName(name, ownerName),
    createdAt: Date.now(),
    gameType: null,
    board: createEmptyOmokBoard(),
    players: {
      black: null,
      white: null,
    },
    spectators: new Set(),
    status: 'waiting',
    turn: 'black',
    winner: null,
    winningStones: [],
    lastMove: null,
    moveCount: 0,
    turnCounts: { black: 0, white: 0 },
    gameStartedAt: null,
    goldRewardGranted: false,
    finishReason: null,
    swapRequest: null,
    ready: {
      black: false,
      white: false,
    },
    consecutivePasses: 0,
    positionCounts: new Map(),
    checkAlert: null,
    checkAlertSeq: 1,
    chessEnPassant: null,
    halfMoveClock: 0,
    alkkagiPieces: [],
    alkkagiShotSeq: 0,
    alkkagiRound: 0,
    alkkagiShotsInRound: { black: false, white: false },
    alkkagiChoicePhase: null,
    alkkagiPieceSeq: 0,
    chatMessages: [],
  };
}

function resetRoomBoard(room, status = 'waiting') {
  room.board = initialBoardFor(room);
  room.status = status;
  room.turn = initialTurnFor(room);
  room.winner = null;
  room.winningStones = [];
  room.lastMove = null;
  room.moveCount = 0;
  room.turnCounts = { black: 0, white: 0 };
  room.gameStartedAt = status === 'playing' ? Date.now() : null;
  room.goldRewardGranted = false;
  room.finishReason = null;
  room.swapRequest = null;
  clearReady(room);
  room.consecutivePasses = 0;
  room.positionCounts = new Map();
  room.checkAlert = null;
  room.chessEnPassant = null;
  room.halfMoveClock = 0;
  room.alkkagiPieces = room.gameType === 'alkkagi' ? createAlkkagiPieces() : [];
  room.alkkagiShotSeq = 0;
  room.alkkagiRound = 0;
  room.alkkagiShotsInRound = { black: false, white: false };
  room.alkkagiChoicePhase = null;
  room.alkkagiPieceSeq = 0;
}

function roomParticipants(room) {
  return [...new Set([
    room.players.black,
    room.players.white,
    ...room.spectators,
  ].filter(Boolean))];
}

function publicPlayer(socketId) {
  return socketId ? { id: socketId, name: getUserName(socketId) } : null;
}

function publicRoomState(room) {
  return {
    id: room.id,
    name: room.name,
    gameType: room.gameType,
    board: room.board,
    players: {
      black: publicPlayer(room.players.black),
      white: publicPlayer(room.players.white),
    },
    spectators: [...room.spectators].map((id) => ({ id, name: getUserName(id) })),
    status: room.status,
    turn: room.turn,
    winner: room.winner,
    winningStones: room.winningStones,
    lastMove: room.lastMove,
    moveCount: room.moveCount,
    checkAlert: room.checkAlert,
    ready: room.ready,
    chessEnPassant: room.chessEnPassant,
    janggiSkins: {
      black: publicSkinLoadout(room.players.black),
      white: publicSkinLoadout(room.players.white),
    },
    alkkagiTrailSkins: publicAlkkagiTrailLoadouts(room),
    alkkagiPieces: (room.alkkagiPieces || []).map(publicAlkkagiPiece),
    alkkagiShotSeq: room.alkkagiShotSeq,
    alkkagiRound: room.alkkagiRound || 0,
    alkkagiChoicePhase: publicAlkkagiChoicePhase(room),
    swapRequest: room.swapRequest ? {
      requesterRole: getRoomRole(room, room.swapRequest.fromId),
      requesterName: getUserName(room.swapRequest.fromId),
    } : null,
  };
}

function publicRoomSummary(room) {
  return {
    id: room.id,
    name: room.name,
    gameType: room.gameType,
    status: room.status,
    playerCount: Number(Boolean(room.players.black)) + Number(Boolean(room.players.white)),
    spectatorCount: room.spectators.size,
    blackName: room.players.black ? getUserName(room.players.black) : null,
    whiteName: room.players.white ? getUserName(room.players.white) : null,
  };
}

function publicLobbyState() {
  return {
    rooms: [...rooms.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(publicRoomSummary),
    userCount: users.size,
  };
}

function emitLobbyState() {
  io.to('lobby').emit('lobbyState', publicLobbyState());
}

function emitRole(socket, room = null) {
  socket.emit('role', {
    role: room ? getRoomRole(room, socket.id) : 'lobby',
    roomId: room?.id || null,
  });
}

function recordGameAction(room, role) {
  room.moveCount += 1;
  if (role === 'black' || role === 'white') {
    room.turnCounts = room.turnCounts || { black: 0, white: 0 };
    room.turnCounts[role] = (room.turnCounts[role] || 0) + 1;
  }
}

function goldRewardBlockReason(room) {
  if (room.goldRewardGranted) return 'already-granted';
  if (room.status !== 'finished' || !room.winner || room.winner === 'draw') return 'not-win-loss';
  if (room.finishReason === 'resign') return '기권으로 끝난 게임은 골드를 지급하지 않습니다.';
  if (!room.players.black || !room.players.white) return '두 플레이어가 모두 있어야 골드가 지급됩니다.';

  const elapsed = Date.now() - (room.gameStartedAt || 0);
  if (!room.gameStartedAt || elapsed < MIN_REWARDED_GAME_MS) {
    return '골드는 2분 이상 진행된 정상 경기에서만 지급됩니다.';
  }

  const counts = room.turnCounts || {};
  if ((counts.black || 0) < MIN_REWARDED_ACTIONS_PER_PLAYER
    || (counts.white || 0) < MIN_REWARDED_ACTIONS_PER_PLAYER) {
    return '골드는 양쪽이 최소 3번 이상 행동한 정상 경기에서만 지급됩니다.';
  }

  return null;
}

function maybeAwardGameGold(room) {
  return;

  if (room.goldRewardGranted || room.status !== 'finished') return;

  const blockReason = goldRewardBlockReason(room);
  room.goldRewardGranted = true;
  if (blockReason) {
    if (blockReason !== 'already-granted' && blockReason !== 'not-win-loss') {
      io.to(room.id).emit('roomMessage', blockReason);
    }
    return;
  }

  const winnerId = room.players[room.winner];
  const loserRole = opposite(room.winner);
  const loserId = room.players[loserRole];
  if (!winnerId || !loserId) return;

  const winnerName = getUserName(winnerId);
  const loserName = getUserName(loserId);
  addGoldToNickname(winnerName, GOLD_WIN_REWARD);
  addGoldToNickname(loserName, GOLD_LOSS_REWARD);

  const winnerSocket = io.sockets.sockets.get(winnerId);
  const loserSocket = io.sockets.sockets.get(loserId);
  if (winnerSocket) {
    emitProfile(winnerSocket, true);
    emitShopState(winnerSocket);
  }
  if (loserSocket) {
    emitProfile(loserSocket, true);
    emitShopState(loserSocket);
  }

  io.to(room.id).emit('roomMessage', `골드 지급: ${winnerName} +${GOLD_WIN_REWARD}G, ${loserName} +${GOLD_LOSS_REWARD}G`);
}

function emitRoomState(room) {
  maybeAwardGameGold(room);
  const state = publicRoomState(room);
  for (const socketId of roomParticipants(room)) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;
    emitRole(socket, room);
    socket.emit('roomState', state);
  }
}

function addChatMessage(messageList, socket, text) {
  const cleanText = (text || '').toString().trim().slice(0, 160);
  if (!cleanText) return null;

  const roomId = users.get(socket.id)?.roomId;
  const entry = {
    id: `${Date.now()}-${socket.id}`,
    role: roomId ? getRoomRole(rooms.get(roomId), socket.id) : 'lobby',
    author: getUserName(socket.id),
    text: cleanText,
    time: Date.now(),
  };

  messageList.push(entry);
  if (messageList.length > MAX_CHAT_MESSAGES) {
    messageList.splice(0, messageList.length - MAX_CHAT_MESSAGES);
  }

  return entry;
}

function leaveCurrentRoom(socket, { sendSelfToLobby = true, notice = null } = {}) {
  const user = users.get(socket.id);
  if (!user?.roomId) return null;

  const room = rooms.get(user.roomId);
  user.roomId = null;
  socket.leave(room?.id || '');

  if (!room) {
    if (sendSelfToLobby) {
      socket.join('lobby');
      emitRole(socket);
      socket.emit('leftRoom');
    }
    return null;
  }

  const oldRole = getRoomRole(room, socket.id);
  if (room.players.black === socket.id) room.players.black = null;
  if (room.players.white === socket.id) room.players.white = null;
  room.spectators.delete(socket.id);

  if (room.swapRequest?.fromId === socket.id) {
    room.swapRequest = null;
  }

  if ((oldRole === 'black' || oldRole === 'white') && room.status === 'playing') {
    resetRoomBoard(room);
    io.to(room.id).emit('roomMessage', '플레이어가 방을 나가서 게임이 대기 상태로 돌아갔습니다.');
  } else if (notice) {
    io.to(room.id).emit('roomMessage', notice);
  }

  if (roomParticipants(room).length === 0) {
    rooms.delete(room.id);
  } else {
    emitRoomState(room);
  }

  if (sendSelfToLobby) {
    socket.join('lobby');
    emitRole(socket);
    socket.emit('leftRoom');
    socket.emit('lobbyState', publicLobbyState());
    socket.emit('lobbyChatHistory', lobbyChatMessages);
  }

  emitLobbyState();
  return room;
}

function assignRoomSeat(room, socket, asSpectator = false) {
  if (getRoomRole(room, socket.id) !== 'lobby') {
    return;
  }

  if (!asSpectator && room.status !== 'playing') {
    if (!room.players.black) {
      room.players.black = socket.id;
      return;
    }

    if (!room.players.white) {
      room.players.white = socket.id;
      return;
    }
  }

  room.spectators.add(socket.id);
}

function moveToSeat(socket, seat) {
  const room = currentRoomFor(socket);
  if (!room || (seat !== 'black' && seat !== 'white')) return;

  if (room.status === 'playing') {
    socket.emit('roomMessage', '게임 진행 중에는 자리를 옮길 수 없습니다.');
    return;
  }

  if (room.players[seat] && room.players[seat] !== socket.id) {
    socket.emit('roomMessage', '이미 다른 플레이어가 있는 자리입니다.');
    return;
  }

  const currentRole = getRoomRole(room, socket.id);
  if (currentRole === seat) return;

  if (room.players.black === socket.id) room.players.black = null;
  if (room.players.white === socket.id) room.players.white = null;
  room.spectators.delete(socket.id);
  room.players[seat] = socket.id;
  resetRoomBoard(room);

  io.to(room.id).emit('roomMessage', `${getUserName(socket.id)}님이 ${sideLabel(room, seat)} 자리에 앉았습니다.`);
  emitRoomState(room);
  emitLobbyState();
}

function enterRoom(socket, room, asSpectator = false) {
  const user = users.get(socket.id);
  if (!user || !room) return;

  leaveCurrentRoom(socket, { sendSelfToLobby: false });
  socket.leave('lobby');
  socket.join(room.id);
  user.roomId = room.id;

  assignRoomSeat(room, socket, asSpectator);
  socket.emit('roomJoined', publicRoomState(room));
  socket.emit('roomChatHistory', room.chatMessages);
  emitRoomState(room);
  emitLobbyState();
}

function sideLabel(room, role) {
  if (room?.gameType === 'alkkagi') {
    if (role === 'black') return '초나라';
    if (role === 'white') return '한나라';
  }

  if (room?.gameType === 'chess') {
    if (role === 'black') return '흑';
    if (role === 'white') return '백';
  }

  if (room?.gameType === 'janggi') {
    if (role === 'black') return '초나라';
    if (role === 'white') return '한나라';
  }
  if (role === 'black') return '흑돌';
  if (role === 'white') return '백돌';
  return '관전자';
}

function opposite(role) {
  return role === 'black' ? 'white' : 'black';
}

function isInsideOmok(row, col) {
  return row >= 0 && row < OMOK_SIZE && col >= 0 && col < OMOK_SIZE;
}

function matchesOpenThreePattern(board, row, col, color, dr, dc, pattern, startOffset) {
  for (let index = 0; index < pattern.length; index += 1) {
    const r = row + (startOffset + index) * dr;
    const c = col + (startOffset + index) * dc;

    if (!isInsideOmok(r, c)) return false;

    const value = board[r][c];
    if (pattern[index] === 'stone' && value !== color) return false;
    if (pattern[index] === 'empty' && value !== null) return false;
  }

  return true;
}

function hasFourInDirection(board, row, col, color, dr, dc) {
  for (let startOffset = -4; startOffset <= 0; startOffset += 1) {
    let colorCount = 0;
    let emptyCount = 0;

    for (let offset = 0; offset < 5; offset += 1) {
      const r = row + (startOffset + offset) * dr;
      const c = col + (startOffset + offset) * dc;

      if (!isInsideOmok(r, c)) {
        colorCount = -1;
        break;
      }

      const value = board[r][c];
      if (value === color) {
        colorCount += 1;
      } else if (value === null) {
        emptyCount += 1;
      } else {
        colorCount = -1;
        break;
      }
    }

    if (colorCount === 4 && emptyCount === 1) {
      return true;
    }
  }

  return false;
}

function hasOpenThreeInDirection(board, row, col, color, dr, dc) {
  if (hasFourInDirection(board, row, col, color, dr, dc)) {
    return false;
  }

  const patterns = [
    ['empty', 'stone', 'stone', 'stone', 'empty'],
    ['empty', 'stone', 'stone', 'empty', 'stone', 'empty'],
    ['empty', 'stone', 'empty', 'stone', 'stone', 'empty'],
  ];

  for (const pattern of patterns) {
    for (let startOffset = -(pattern.length - 1); startOffset <= 0; startOffset += 1) {
      const placedIndex = -startOffset;
      if (pattern[placedIndex] !== 'stone') continue;

      if (matchesOpenThreePattern(board, row, col, color, dr, dc, pattern, startOffset)) {
        return true;
      }
    }
  }

  return false;
}

function isForbiddenDoubleThree(board, row, col, color) {
  if (color !== 'black') return false;

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  let threeLineCount = 0;
  for (const [dr, dc] of directions) {
    if (hasOpenThreeInDirection(board, row, col, color, dr, dc)) {
      threeLineCount += 1;
    }
  }

  return threeLineCount >= 2;
}

function omokLineStones(board, row, col, color, dr, dc) {
  const stones = [[row, col]];

  let r = row + dr;
  let c = col + dc;
  while (isInsideOmok(r, c) && board[r][c] === color) {
    stones.push([r, c]);
    r += dr;
    c += dc;
  }

  r = row - dr;
  c = col - dc;
  while (isInsideOmok(r, c) && board[r][c] === color) {
    stones.unshift([r, c]);
    r -= dr;
    c -= dc;
  }

  return stones;
}

function isForbiddenOmokOverline(board, row, col, color) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  return directions.some(([dr, dc]) => omokLineStones(board, row, col, color, dr, dc).length > 5);
}

function checkOmokWinner(board, row, col, color) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const stones = omokLineStones(board, row, col, color, dr, dc);
    if (stones.length === 5) {
      return stones;
    }
  }

  return null;
}

function isInsideJanggi(row, col) {
  return row >= 0 && row < JANGGI_ROWS && col >= 0 && col < JANGGI_COLS;
}

function palaceStartFor(row) {
  if (row >= 0 && row <= 2) return 0;
  if (row >= 7 && row <= 9) return 7;
  return null;
}

function isPalaceOfSide(side, row, col) {
  const startRow = side === 'white' ? 0 : 7;
  return row >= startRow && row <= startRow + 2 && col >= 3 && col <= 5;
}

function palaceLineKey(row, col) {
  const startRow = palaceStartFor(row);
  if (startRow === null || col < 3 || col > 5) return null;

  const localRow = row - startRow;
  const localCol = col - 3;
  const keys = [];
  if (localRow === localCol) keys.push('down');
  if (localRow + localCol === 2) keys.push('up');
  return keys;
}

function isPalaceDiagonalLine(fromRow, fromCol, toRow, toCol) {
  const fromStart = palaceStartFor(fromRow);
  const toStart = palaceStartFor(toRow);
  if (fromStart === null || fromStart !== toStart) return false;
  if (fromCol < 3 || fromCol > 5 || toCol < 3 || toCol > 5) return false;
  if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;

  const fromKeys = palaceLineKey(fromRow, fromCol) || [];
  const toKeys = palaceLineKey(toRow, toCol) || [];
  return fromKeys.some((key) => toKeys.includes(key));
}

function getLineStep(fromRow, fromCol, toRow, toCol) {
  const dr = Math.sign(toRow - fromRow);
  const dc = Math.sign(toCol - fromCol);

  if (fromRow === toRow && fromCol !== toCol) return [0, dc];
  if (fromCol === toCol && fromRow !== toRow) return [dr, 0];
  if (isPalaceDiagonalLine(fromRow, fromCol, toRow, toCol)) return [dr, dc];
  return null;
}

function isPathClear(board, fromRow, fromCol, toRow, toCol, stepRow, stepCol) {
  let row = fromRow + stepRow;
  let col = fromCol + stepCol;
  while (row !== toRow || col !== toCol) {
    if (board[row][col]) return false;
    row += stepRow;
    col += stepCol;
  }

  return true;
}

function countScreens(board, fromRow, fromCol, toRow, toCol, stepRow, stepCol) {
  let count = 0;
  let screen = null;
  let row = fromRow + stepRow;
  let col = fromCol + stepCol;
  while (row !== toRow || col !== toCol) {
    if (board[row][col]) {
      count += 1;
      screen = board[row][col];
    }
    row += stepRow;
    col += stepCol;
  }

  return { count, screen };
}

function findGeneral(board, side) {
  for (let row = 0; row < JANGGI_ROWS; row += 1) {
    for (let col = 0; col < JANGGI_COLS; col += 1) {
      const piece = board[row][col];
      if (piece?.side === side && piece.type === 'jang') {
        return { row, col };
      }
    }
  }

  return null;
}

function generalsFace(board, side) {
  const own = findGeneral(board, side);
  const enemy = findGeneral(board, opposite(side));
  if (!own || !enemy || own.col !== enemy.col) return false;

  const step = Math.sign(enemy.row - own.row);
  for (let row = own.row + step; row !== enemy.row; row += step) {
    if (board[row][own.col]) return false;
  }

  return true;
}

function isJanggiMoveShapeLegal(board, fromRow, fromCol, toRow, toCol, piece) {
  if (!isInsideJanggi(toRow, toCol)) return false;
  const target = board[toRow][toCol];
  if (target?.side === piece.side) return false;

  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  if (piece.type === 'jang' || piece.type === 'sa') {
    if (!isPalaceOfSide(piece.side, toRow, toCol)) return false;
    if (absDr + absDc === 1) return true;
    return absDr === 1 && absDc === 1 && isPalaceDiagonalLine(fromRow, fromCol, toRow, toCol);
  }

  if (piece.type === 'soldier') {
    const forward = piece.side === 'black' ? -1 : 1;
    if (dr === forward && dc === 0) return true;
    if (dr === 0 && absDc === 1) return true;
    return dr === forward && absDc === 1 && isPalaceDiagonalLine(fromRow, fromCol, toRow, toCol);
  }

  if (piece.type === 'cha') {
    const step = getLineStep(fromRow, fromCol, toRow, toCol);
    return Boolean(step && isPathClear(board, fromRow, fromCol, toRow, toCol, step[0], step[1]));
  }

  if (piece.type === 'po') {
    const step = getLineStep(fromRow, fromCol, toRow, toCol);
    if (!step) return false;

    const { count, screen } = countScreens(board, fromRow, fromCol, toRow, toCol, step[0], step[1]);
    if (count !== 1 || screen?.type === 'po') return false;
    return !target || target.type !== 'po';
  }

  if (piece.type === 'ma') {
    if (!((absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2))) return false;

    const blockRow = fromRow + (absDr === 2 ? Math.sign(dr) : 0);
    const blockCol = fromCol + (absDc === 2 ? Math.sign(dc) : 0);
    return !board[blockRow][blockCol];
  }

  if (piece.type === 'sang') {
    if (!((absDr === 3 && absDc === 2) || (absDr === 2 && absDc === 3))) return false;

    const rowStep = Math.sign(dr);
    const colStep = Math.sign(dc);
    const firstBlock = absDr === 3
      ? [fromRow + rowStep, fromCol]
      : [fromRow, fromCol + colStep];
    const secondBlock = absDr === 3
      ? [fromRow + rowStep * 2, fromCol + colStep]
      : [fromRow + rowStep, fromCol + colStep * 2];

    return !board[firstBlock[0]][firstBlock[1]] && !board[secondBlock[0]][secondBlock[1]];
  }

  return false;
}

function pieceAttacks(board, fromRow, fromCol, toRow, toCol, piece) {
  return isJanggiMoveShapeLegal(board, fromRow, fromCol, toRow, toCol, piece);
}

function isGeneralInCheck(board, side) {
  const general = findGeneral(board, side);
  if (!general) return true;
  if (generalsFace(board, side)) return true;

  const enemy = opposite(side);
  for (let row = 0; row < JANGGI_ROWS; row += 1) {
    for (let col = 0; col < JANGGI_COLS; col += 1) {
      const piece = board[row][col];
      if (piece?.side === enemy && pieceAttacks(board, row, col, general.row, general.col, piece)) {
        return true;
      }
    }
  }

  return false;
}

function isLegalJanggiMove(board, fromRow, fromCol, toRow, toCol, side) {
  if (!isInsideJanggi(fromRow, fromCol) || !isInsideJanggi(toRow, toCol)) return false;

  const piece = board[fromRow][fromCol];
  if (!piece || piece.side !== side) return false;
  if (!isJanggiMoveShapeLegal(board, fromRow, fromCol, toRow, toCol, piece)) return false;

  const captured = board[toRow][toCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;
  const leavesOwnGeneralInCheck = isGeneralInCheck(board, side);
  board[fromRow][fromCol] = piece;
  board[toRow][toCol] = captured;

  return !leavesOwnGeneralInCheck;
}

function getJanggiInvalidMoveMessage(board, fromRow, fromCol, toRow, toCol, side) {
  const piece = board[fromRow]?.[fromCol];
  if (!piece || piece.side !== side) return '자기 말만 움직일 수 있습니다.';

  if (!isJanggiMoveShapeLegal(board, fromRow, fromCol, toRow, toCol, piece)) {
    return '그 자리로는 움직일 수 없습니다.';
  }

  const captured = board[toRow][toCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;
  const makesBigjang = generalsFace(board, side);
  const leavesOwnGeneralInCheck = isGeneralInCheck(board, side);
  board[fromRow][fromCol] = piece;
  board[toRow][toCol] = captured;

  if (makesBigjang) return '빅장이 되는 수는 둘 수 없습니다.';
  if (leavesOwnGeneralInCheck) return '궁이 잡히는 자리로는 움직일 수 없습니다.';
  return '그 자리로는 움직일 수 없습니다.';
}

function hasAnyLegalJanggiMove(board, side) {
  for (let fromRow = 0; fromRow < JANGGI_ROWS; fromRow += 1) {
    for (let fromCol = 0; fromCol < JANGGI_COLS; fromCol += 1) {
      const piece = board[fromRow][fromCol];
      if (piece?.side !== side) continue;

      for (let toRow = 0; toRow < JANGGI_ROWS; toRow += 1) {
        for (let toCol = 0; toCol < JANGGI_COLS; toCol += 1) {
          if (isLegalJanggiMove(board, fromRow, fromCol, toRow, toCol, side)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

function janggiPositionKey(room) {
  const boardKey = room.board
    .map((row) => row.map((piece) => (piece ? `${piece.side}:${piece.type}` : '-')).join(','))
    .join('|');
  return `${room.turn}|${boardKey}`;
}

function recordJanggiPosition(room) {
  if (room.gameType !== 'janggi' || room.status !== 'playing') return 0;
  if (!room.positionCounts) room.positionCounts = new Map();

  const key = janggiPositionKey(room);
  const nextCount = (room.positionCounts.get(key) || 0) + 1;
  room.positionCounts.set(key, nextCount);
  return nextCount;
}

function scoreJanggiBoard(board) {
  const scores = {
    black: 0,
    white: 1.5,
  };

  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      scores[piece.side] += JANGGI_PIECE_SCORES[piece.type] || 0;
    }
  }

  return scores;
}

function startPreparedJanggiGame(room) {
  room.status = 'playing';
  room.turn = 'black';
  room.winner = null;
  room.winningStones = [];
  room.lastMove = null;
  room.moveCount = 0;
  room.turnCounts = { black: 0, white: 0 };
  room.gameStartedAt = Date.now();
  room.goldRewardGranted = false;
  room.finishReason = null;
  room.swapRequest = null;
  clearReady(room);
  room.consecutivePasses = 0;
  room.positionCounts = new Map();
  room.checkAlert = null;
  recordJanggiPosition(room);
}

function finishJanggiByScore(room) {
  const scores = scoreJanggiBoard(room.board);
  room.status = 'finished';
  room.winner = scores.black > scores.white ? 'black' : 'white';
  if (scores.black === scores.white) {
    room.winner = 'draw';
  }
  room.checkAlert = null;

  const blackScore = Number.isInteger(scores.black) ? scores.black : scores.black.toFixed(1);
  const whiteScore = Number.isInteger(scores.white) ? scores.white : scores.white.toFixed(1);
  return `연속 한 수 쉼으로 점수 판정: 초나라 ${blackScore}점 / 한나라 ${whiteScore}점`;
}

function isInsideChess(row, col) {
  return row >= 0 && row < CHESS_SIZE && col >= 0 && col < CHESS_SIZE;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function normalizePromotion(promotion) {
  return CHESS_PROMOTION_TYPES.has(promotion) ? promotion : 'queen';
}

function findChessKing(board, side) {
  for (let row = 0; row < CHESS_SIZE; row += 1) {
    for (let col = 0; col < CHESS_SIZE; col += 1) {
      const piece = board[row][col];
      if (piece?.side === side && piece.type === 'king') {
        return { row, col };
      }
    }
  }

  return null;
}

function isChessPathClear(board, fromRow, fromCol, toRow, toCol) {
  const stepRow = Math.sign(toRow - fromRow);
  const stepCol = Math.sign(toCol - fromCol);
  let row = fromRow + stepRow;
  let col = fromCol + stepCol;

  while (row !== toRow || col !== toCol) {
    if (board[row][col]) return false;
    row += stepRow;
    col += stepCol;
  }

  return true;
}

function canChessPieceAttack(board, fromRow, fromCol, toRow, toCol, piece) {
  if (!isInsideChess(toRow, toCol)) return false;
  if (fromRow === toRow && fromCol === toCol) return false;

  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  if (piece.type === 'pawn') {
    const forward = piece.side === 'white' ? -1 : 1;
    return dr === forward && absDc === 1;
  }

  if (piece.type === 'knight') {
    return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
  }

  if (piece.type === 'bishop') {
    return absDr === absDc && isChessPathClear(board, fromRow, fromCol, toRow, toCol);
  }

  if (piece.type === 'rook') {
    return (fromRow === toRow || fromCol === toCol)
      && isChessPathClear(board, fromRow, fromCol, toRow, toCol);
  }

  if (piece.type === 'queen') {
    return (absDr === absDc || fromRow === toRow || fromCol === toCol)
      && isChessPathClear(board, fromRow, fromCol, toRow, toCol);
  }

  if (piece.type === 'king') {
    return absDr <= 1 && absDc <= 1;
  }

  return false;
}

function isChessSquareAttacked(board, row, col, bySide) {
  for (let fromRow = 0; fromRow < CHESS_SIZE; fromRow += 1) {
    for (let fromCol = 0; fromCol < CHESS_SIZE; fromCol += 1) {
      const piece = board[fromRow][fromCol];
      if (piece?.side === bySide && canChessPieceAttack(board, fromRow, fromCol, row, col, piece)) {
        return true;
      }
    }
  }

  return false;
}

function isChessKingInCheck(room, side, board = room.board) {
  const king = findChessKing(board, side);
  if (!king) return true;
  return isChessSquareAttacked(board, king.row, king.col, opposite(side));
}

function isChessEnPassantTarget(room, piece, fromRow, fromCol, toRow, toCol) {
  const enPassant = room.chessEnPassant;
  return Boolean(piece.type === 'pawn'
    && enPassant
    && enPassant.capturableBy === piece.side
    && enPassant.row === toRow
    && enPassant.col === toCol
    && enPassant.capturedRow === fromRow
    && Math.abs(enPassant.capturedCol - fromCol) === 1);
}

function isChessMoveShapeLegal(room, board, fromRow, fromCol, toRow, toCol, piece) {
  if (!isInsideChess(toRow, toCol)) return false;
  if (fromRow === toRow && fromCol === toCol) return false;

  const target = board[toRow][toCol];
  if (target?.side === piece.side || target?.type === 'king') return false;

  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  if (piece.type === 'pawn') {
    const forward = piece.side === 'white' ? -1 : 1;
    const startRow = piece.side === 'white' ? 6 : 1;

    if (dc === 0 && dr === forward && !target) return true;
    if (dc === 0 && dr === forward * 2 && fromRow === startRow && !target && !board[fromRow + forward][fromCol]) {
      return true;
    }

    if (absDc === 1 && dr === forward) {
      return Boolean(target && target.side !== piece.side) || isChessEnPassantTarget(room, piece, fromRow, fromCol, toRow, toCol);
    }

    return false;
  }

  if (piece.type === 'knight') {
    return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
  }

  if (piece.type === 'bishop') {
    return absDr === absDc && isChessPathClear(board, fromRow, fromCol, toRow, toCol);
  }

  if (piece.type === 'rook') {
    return (fromRow === toRow || fromCol === toCol)
      && isChessPathClear(board, fromRow, fromCol, toRow, toCol);
  }

  if (piece.type === 'queen') {
    return (absDr === absDc || fromRow === toRow || fromCol === toCol)
      && isChessPathClear(board, fromRow, fromCol, toRow, toCol);
  }

  if (piece.type === 'king') {
    if (absDr <= 1 && absDc <= 1) return true;

    if (dr !== 0 || absDc !== 2 || piece.hasMoved || fromCol !== 4) return false;
    if (isChessKingInCheck(room, piece.side, board)) return false;

    const rookCol = dc > 0 ? 7 : 0;
    const rook = board[fromRow][rookCol];
    if (!rook || rook.side !== piece.side || rook.type !== 'rook' || rook.hasMoved) return false;

    const step = Math.sign(dc);
    for (let col = fromCol + step; col !== rookCol; col += step) {
      if (board[fromRow][col]) return false;
    }

    const enemy = opposite(piece.side);
    return !isChessSquareAttacked(board, fromRow, fromCol + step, enemy)
      && !isChessSquareAttacked(board, toRow, toCol, enemy);
  }

  return false;
}

function applyChessMoveOnBoard(room, board, fromRow, fromCol, toRow, toCol, promotion = 'queen') {
  const piece = board[fromRow][fromCol];
  const target = board[toRow][toCol];
  const moveInfo = {
    piece,
    captured: target,
    enPassant: false,
    castling: false,
    promotion: null,
  };

  if (piece.type === 'pawn' && !target && isChessEnPassantTarget(room, piece, fromRow, fromCol, toRow, toCol)) {
    moveInfo.enPassant = true;
    moveInfo.captured = board[room.chessEnPassant.capturedRow][room.chessEnPassant.capturedCol];
    board[room.chessEnPassant.capturedRow][room.chessEnPassant.capturedCol] = null;
  }

  board[toRow][toCol] = { ...piece, hasMoved: true };
  board[fromRow][fromCol] = null;

  if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
    const rookFromCol = toCol > fromCol ? 7 : 0;
    const rookToCol = toCol > fromCol ? 5 : 3;
    const rook = board[fromRow][rookFromCol];
    board[fromRow][rookToCol] = { ...rook, hasMoved: true };
    board[fromRow][rookFromCol] = null;
    moveInfo.castling = true;
  }

  if (piece.type === 'pawn' && (toRow === 0 || toRow === CHESS_SIZE - 1)) {
    const promotionType = normalizePromotion(promotion);
    board[toRow][toCol].type = promotionType;
    moveInfo.promotion = promotionType;
  }

  return moveInfo;
}

function isLegalChessMove(room, board, fromRow, fromCol, toRow, toCol, side, promotion = 'queen') {
  if (!isInsideChess(fromRow, fromCol) || !isInsideChess(toRow, toCol)) return false;

  const piece = board[fromRow][fromCol];
  if (!piece || piece.side !== side) return false;
  if (!isChessMoveShapeLegal(room, board, fromRow, fromCol, toRow, toCol, piece)) return false;

  const testBoard = cloneBoard(board);
  const testRoom = { ...room, board: testBoard };
  applyChessMoveOnBoard(testRoom, testBoard, fromRow, fromCol, toRow, toCol, promotion);
  return !isChessKingInCheck(testRoom, side, testBoard);
}

function getChessInvalidMoveMessage(room, fromRow, fromCol, toRow, toCol, side, promotion = 'queen') {
  const piece = room.board[fromRow]?.[fromCol];
  if (!piece || piece.side !== side) return '자기 말만 움직일 수 있습니다.';

  if (!isChessMoveShapeLegal(room, room.board, fromRow, fromCol, toRow, toCol, piece)) {
    return '그 자리로는 움직일 수 없습니다.';
  }

  const testBoard = cloneBoard(room.board);
  const testRoom = { ...room, board: testBoard };
  applyChessMoveOnBoard(testRoom, testBoard, fromRow, fromCol, toRow, toCol, promotion);
  if (isChessKingInCheck(testRoom, side, testBoard)) {
    return '킹이 체크를 받는 수는 둘 수 없습니다.';
  }

  return '그 자리로는 움직일 수 없습니다.';
}

function hasAnyLegalChessMove(room, side) {
  for (let fromRow = 0; fromRow < CHESS_SIZE; fromRow += 1) {
    for (let fromCol = 0; fromCol < CHESS_SIZE; fromCol += 1) {
      const piece = room.board[fromRow][fromCol];
      if (piece?.side !== side) continue;

      for (let toRow = 0; toRow < CHESS_SIZE; toRow += 1) {
        for (let toCol = 0; toCol < CHESS_SIZE; toCol += 1) {
          if (isLegalChessMove(room, room.board, fromRow, fromCol, toRow, toCol, side)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isAlkkagiOut(piece) {
  return piece.x < 0
    || piece.x > ALKKAGI_BOARD_COLS
    || piece.y < 0
    || piece.y > ALKKAGI_BOARD_ROWS;
}

function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function drawAlkkagiChoices() {
  return shuffled(ALKKAGI_OPTION_IDS).slice(0, Math.min(ALKKAGI_REWARD_CHOICES, ALKKAGI_OPTION_IDS.length));
}

function createAlkkagiChoicePhase(room, turnAfterChoice = null) {
  room.alkkagiChoicePhase = {
    round: room.alkkagiRound || 0,
    turnAfterChoice,
    turnSwap: Boolean(turnAfterChoice),
    choices: {
      black: drawAlkkagiChoices(),
      white: drawAlkkagiChoices(),
    },
    pending: {
      black: true,
      white: true,
    },
  };
}

function publicAlkkagiChoicePhase(room) {
  const phase = room.alkkagiChoicePhase;
  if (!phase) return null;

  return {
    round: phase.round,
    turnSwap: Boolean(phase.turnSwap),
    choices: {
      black: [...(phase.choices?.black || [])],
      white: [...(phase.choices?.white || [])],
    },
    pending: {
      black: Boolean(phase.pending?.black),
      white: Boolean(phase.pending?.white),
    },
  };
}

function completeAlkkagiShotRound(room, role) {
  const shots = room.alkkagiShotsInRound || { black: false, white: false };
  shots[role] = true;
  room.alkkagiShotsInRound = shots;

  if (!shots.black || !shots.white) return false;

  room.alkkagiRound = (room.alkkagiRound || 0) + 1;
  room.alkkagiShotsInRound = { black: false, white: false };

  if (room.alkkagiRound % ALKKAGI_REWARD_INTERVAL === 0) {
    createAlkkagiChoicePhase(room, role);
    return true;
  }

  return false;
}

function alkkagiCampRows(side) {
  return side === 'black'
    ? { minRow: 6, maxRow: 9 }
    : { minRow: 0, maxRow: 3 };
}

function isAlkkagiPositionFree(room, x, y, radius, ignoreId = null) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < radius || x > ALKKAGI_BOARD_COLS - radius) return false;
  if (y < radius || y > ALKKAGI_BOARD_ROWS - radius) return false;

  return liveAlkkagiPieces(room).every((piece) => {
    if (piece.id === ignoreId) return true;
    return Math.hypot(piece.x - x, piece.y - y) >= piece.radius + radius + 0.05;
  });
}

function findNearestFreeAlkkagiPosition(room, targetX, targetY, radius, options = {}) {
  const minRow = Number.isInteger(options.minRow) ? options.minRow : 0;
  const maxRow = Number.isInteger(options.maxRow) ? options.maxRow : ALKKAGI_BOARD_ROWS - 1;
  const centerCandidates = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = 0; col < ALKKAGI_BOARD_COLS; col += 1) {
      centerCandidates.push({ x: col + 0.5, y: row + 0.5 });
    }
  }

  const candidates = options.random
    ? shuffled(centerCandidates)
    : centerCandidates.sort((a, b) => (
      Math.hypot(a.x - targetX, a.y - targetY) - Math.hypot(b.x - targetX, b.y - targetY)
    ));

  for (const candidate of candidates) {
    if (isAlkkagiPositionFree(room, candidate.x, candidate.y, radius)) {
      return candidate;
    }
  }

  if (options.random) return null;

  const minY = minRow;
  const maxY = maxRow + 1;
  const clampedX = clampNumber(targetX, radius, ALKKAGI_BOARD_COLS - radius);
  const clampedY = clampNumber(targetY, Math.max(radius, minY), Math.min(ALKKAGI_BOARD_ROWS - radius, maxY));

  for (let ring = 0.25; ring <= 4.5; ring += 0.25) {
    for (let angleIndex = 0; angleIndex < 24; angleIndex += 1) {
      const angle = (Math.PI * 2 * angleIndex) / 24;
      const x = clampedX + Math.cos(angle) * ring;
      const y = clampedY + Math.sin(angle) * ring;
      if (y < minY || y > maxY) continue;
      if (isAlkkagiPositionFree(room, x, y, radius)) {
        return { x, y };
      }
    }
  }

  return null;
}

function summonAlkkagiPiece(room, side, type, x, y) {
  room.alkkagiPieceSeq = (room.alkkagiPieceSeq || 0) + 1;
  const piece = createAlkkagiPieceObject(`${side}-${type}-summon-${room.alkkagiPieceSeq}`, side, type, x, y);
  room.alkkagiPieces.push(piece);
  return piece;
}

function enemyClusterPoint(room, role) {
  const enemies = liveAlkkagiPieces(room).filter((piece) => piece.side === opposite(role));
  if (!enemies.length) {
    return { x: ALKKAGI_BOARD_COLS / 2, y: role === 'black' ? 1.5 : ALKKAGI_BOARD_ROWS - 1.5 };
  }

  let cluster = [enemies[0]];
  for (const anchor of enemies) {
    const nearby = enemies.filter((piece) => Math.hypot(piece.x - anchor.x, piece.y - anchor.y) <= 2.25);
    if (nearby.length > cluster.length) {
      cluster = nearby;
    }
  }

  return {
    x: cluster.reduce((sum, piece) => sum + piece.x, 0) / cluster.length,
    y: cluster.reduce((sum, piece) => sum + piece.y, 0) / cluster.length,
  };
}

function alkkagiOptionTargetCount(option) {
  return Number.isInteger(option?.targetCount) ? option.targetCount : (option?.target === 'none' ? 0 : 1);
}

function getAlkkagiOptionTargets(room, role, option, targetPieceIds = []) {
  const targetCount = alkkagiOptionTargetCount(option);
  if (!targetCount) return { ok: true, pieces: [] };

  const ids = [...new Set(targetPieceIds.filter(Boolean))];
  if (ids.length !== targetCount) {
    return { ok: false, message: targetCount > 1 ? `${targetCount}개의 아군 말을 선택하세요.` : '적용할 아군 말을 선택하세요.' };
  }

  const pieces = ids.map((id) => (room.alkkagiPieces || []).find((piece) => piece.id === id && piece.alive));
  if (pieces.some((piece) => !piece || piece.side !== role)) {
    return { ok: false, message: '적용할 아군 말을 선택하세요.' };
  }

  if (option.target === 'ownNonJang' && pieces.some((piece) => piece.type === 'jang')) {
    return { ok: false, message: '장군 말에는 사용할 수 없습니다.' };
  }

  return { ok: true, pieces };
}

function growAlkkagiPiece(piece, step = ALKKAGI_RPG_STEP) {
  const currentScale = Number(piece.rpgScale) || 1;
  const nextScale = Number((currentScale + step).toFixed(2));
  const ratio = nextScale / currentScale;
  scaleAlkkagiPiece(piece, ratio);
  piece.rpgScale = nextScale;
}

function scaleAlkkagiPiece(piece, ratio) {
  const safeRatio = Number.isFinite(Number(ratio)) && Number(ratio) > 0 ? Number(ratio) : 1;
  piece.radius *= safeRatio;
  piece.mass *= Math.pow(safeRatio, ALKKAGI_SIZE_MASS_EXPONENT);
  piece.powerMultiplier = (Number(piece.powerMultiplier) || 1) * safeRatio;
}

function alkkagiRpgStacks(piece) {
  const stacks = Math.floor(Number(piece.rpgStacks) || 0);
  if (stacks > 0) return stacks;
  return piece.rpg ? 1 : 0;
}

function applyAlkkagiOption(room, role, optionId, targetPieceIds = []) {
  const option = ALKKAGI_OPTION_DEFS[optionId];
  if (!option) return { ok: false, message: '아직 사용할 수 없는 선택지입니다.' };

  const targetResult = getAlkkagiOptionTargets(room, role, option, targetPieceIds);
  if (!targetResult.ok) return targetResult;
  const [targetPiece] = targetResult.pieces;

  if (optionId === 'tekkai') {
    targetPiece.tekkai = true;
    return { ok: true };
  }

  if (optionId === 'illusion') {
    for (const piece of targetResult.pieces) {
      piece.illusion = true;
    }
    return { ok: true };
  }

  if (optionId === 'beer') {
    targetPiece.oneShotPowerMultiplier = Math.max(Number(targetPiece.oneShotPowerMultiplier) || 1, 2);
    return { ok: true };
  }

  if (optionId === 'rpg') {
    const currentStacks = alkkagiRpgStacks(targetPiece);
    targetPiece.rpg = true;
    targetPiece.rpgStacks = currentStacks + 1;
    targetPiece.rpgScale = Number(targetPiece.rpgScale) || 1;
    return { ok: true };
  }

  if (optionId === 'rezero') {
    targetPiece.rezero = true;
    return { ok: true };
  }

  if (optionId === 'giant') {
    scaleAlkkagiPiece(targetPiece, ALKKAGI_GIANT_SCALE);
    targetPiece.giantLevel = (targetPiece.giantLevel || 0) + 1;
    return { ok: true };
  }

  if (optionId === 'mauga') {
    const jangRadius = ALKKAGI_PIECE_METRICS.jang.diameter / 2;
    const cluster = enemyClusterPoint(room, role);
    const position = findNearestFreeAlkkagiPosition(room, cluster.x, cluster.y, jangRadius);
    if (!position) return { ok: false, message: '장군을 소환할 빈자리가 없습니다.' };
    summonAlkkagiPiece(room, role, 'jang', position.x, position.y);
    return { ok: true };
  }

  if (optionId === 'zergling') {
    const soldierRadius = ALKKAGI_PIECE_METRICS.soldier.diameter / 2;
    const rows = alkkagiCampRows(role);
    const summoned = [];
    for (let count = 0; count < 2; count += 1) {
      const position = findNearestFreeAlkkagiPosition(
        room,
        ALKKAGI_BOARD_COLS / 2,
        role === 'black' ? 8.5 : 1.5,
        soldierRadius,
        { ...rows, random: true },
      );
      if (!position) {
        for (const piece of summoned) {
          const index = room.alkkagiPieces.indexOf(piece);
          if (index >= 0) room.alkkagiPieces.splice(index, 1);
        }
        return { ok: false, message: '졸을 소환할 빈자리가 부족합니다.' };
      }
      summoned.push(summonAlkkagiPiece(room, role, 'soldier', position.x, position.y));
    }
    return { ok: true };
  }

  return { ok: false, message: '아직 구현되지 않은 선택지입니다.' };
}

function isAlkkagiDefensiveTrigger(defender, attacker, shotSide) {
  return Boolean(shotSide && defender.side !== shotSide && attacker.side === shotSide);
}

function addAlkkagiPassThrough(first, second) {
  first.passThrough = first.passThrough || {};
  second.passThrough = second.passThrough || {};
  first.passThrough[second.id] = true;
  second.passThrough[first.id] = true;
}

function hasAlkkagiPassThrough(first, second) {
  return Boolean(first.passThrough?.[second.id] || second.passThrough?.[first.id]);
}

function cleanupAlkkagiPassThrough(room) {
  const livePieces = liveAlkkagiPieces(room);
  const byId = new Map(livePieces.map((piece) => [piece.id, piece]));

  for (const piece of livePieces) {
    if (!piece.passThrough) continue;

    for (const otherId of Object.keys(piece.passThrough)) {
      const other = byId.get(otherId);
      if (!other || Math.hypot(piece.x - other.x, piece.y - other.y) > piece.radius + other.radius + 0.03) {
        delete piece.passThrough[otherId];
      }
    }
  }
}

function alkkagiCollisionMass(piece) {
  const mass = Math.max(0.2, Number(piece.mass) || 1);
  return Math.pow(mass, ALKKAGI_COLLISION_MASS_EXPONENT);
}

function resolveAlkkagiCollision(first, second, shotSide) {
  if (hasAlkkagiPassThrough(first, second)) return null;

  let dx = second.x - first.x;
  let dy = second.y - first.y;
  let distance = Math.hypot(dx, dy);
  const minDistance = first.radius + second.radius;

  if (distance <= 0) {
    dx = 1;
    dy = 0;
    distance = 1;
  }

  if (distance >= minDistance) return;

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;
  const relativeVx = second.vx - first.vx;
  const relativeVy = second.vy - first.vy;
  const velocityAlongNormal = relativeVx * nx + relativeVy * ny;

  const bounceFromTekkai = (defender, attacker, awayX, awayY) => {
    defender.tekkai = false;
    defender.vx = 0;
    defender.vy = 0;
    attacker.lastHitBy = defender.id;
    attacker.x = defender.x + awayX * (defender.radius + attacker.radius + 0.002);
    attacker.y = defender.y + awayY * (defender.radius + attacker.radius + 0.002);

    const impactSpeed = Math.max(
      Math.abs(velocityAlongNormal),
      Math.hypot(attacker.vx - defender.vx, attacker.vy - defender.vy),
      ALKKAGI_POWER_SCALE * 0.12,
    );
    const reflectedSpeed = Math.min(impactSpeed * 3, ALKKAGI_POWER_SCALE * ALKKAGI_MAX_EFFECTIVE_POWER);
    attacker.vx = awayX * reflectedSpeed;
    attacker.vy = awayY * reflectedSpeed;

    return {
      type: 'tekkai',
      text: '텟카이!',
      x: defender.x,
      y: defender.y,
      pieceId: defender.id,
    };
  };

  const passThroughIllusion = (defender, attacker) => {
    defender.illusion = false;
    defender.vx = 0;
    defender.vy = 0;
    addAlkkagiPassThrough(defender, attacker);

    return {
      type: 'illusion',
      text: '환영술!',
      x: defender.x,
      y: defender.y,
      pieceId: defender.id,
    };
  };

  if (first.tekkai && isAlkkagiDefensiveTrigger(first, second, shotSide)) {
    return bounceFromTekkai(first, second, nx, ny);
  }

  if (second.tekkai && isAlkkagiDefensiveTrigger(second, first, shotSide)) {
    return bounceFromTekkai(second, first, -nx, -ny);
  }

  if (first.illusion && isAlkkagiDefensiveTrigger(first, second, shotSide)) {
    return passThroughIllusion(first, second);
  }

  if (second.illusion && isAlkkagiDefensiveTrigger(second, first, shotSide)) {
    return passThroughIllusion(second, first);
  }

  const firstMass = alkkagiCollisionMass(first);
  const secondMass = alkkagiCollisionMass(second);
  const totalMass = firstMass + secondMass;

  first.x -= nx * overlap * (secondMass / totalMass);
  first.y -= ny * overlap * (secondMass / totalMass);
  second.x += nx * overlap * (firstMass / totalMass);
  second.y += ny * overlap * (firstMass / totalMass);

  if (velocityAlongNormal > 0) return;

  const impulse = -(1 + ALKKAGI_RESTITUTION) * velocityAlongNormal
    / ((1 / firstMass) + (1 / secondMass));

  first.vx -= (impulse * nx) / firstMass;
  first.vy -= (impulse * ny) / firstMass;
  second.vx += (impulse * nx) / secondMass;
  second.vy += (impulse * ny) / secondMass;
  first.lastHitBy = second.id;
  second.lastHitBy = first.id;
}

function liveAlkkagiPieces(room) {
  return (room.alkkagiPieces || []).filter((piece) => piece.alive);
}

function publicAlkkagiPiece(piece) {
  return {
    id: piece.id,
    side: piece.side,
    type: piece.type,
    x: Number(piece.x.toFixed(4)),
    y: Number(piece.y.toFixed(4)),
    radius: piece.radius,
    mass: piece.mass,
    alive: piece.alive,
  };
}

function publicAlkkagiFrame(room, removedPieces = [], effects = []) {
  return {
    pieces: liveAlkkagiPieces(room).map(publicAlkkagiPiece),
    removedPieces,
    effects,
  };
}

function reviveAlkkagiPiece(room, piece) {
  piece.rezero = false;
  piece.alive = false;
  const position = findNearestFreeAlkkagiPosition(
    room,
    Number(piece.originX) || piece.x,
    Number(piece.originY) || piece.y,
    piece.radius,
  ) || {
    x: clampNumber(Number(piece.originX) || piece.x, piece.radius, ALKKAGI_BOARD_COLS - piece.radius),
    y: clampNumber(Number(piece.originY) || piece.y, piece.radius, ALKKAGI_BOARD_ROWS - piece.radius),
  };

  piece.x = position.x;
  piece.y = position.y;
  piece.vx = 0;
  piece.vy = 0;
  piece.alive = true;
  piece.lastHitBy = null;

  return {
    type: 'rezero',
    text: '...꿈인가.',
    x: piece.x,
    y: piece.y,
    pieceId: piece.id,
  };
}

function applyAlkkagiOutRewards(room, removedPiece) {
  if (!removedPiece.lastHitBy) return;

  const hitter = (room.alkkagiPieces || []).find((piece) => piece.id === removedPiece.lastHitBy && piece.alive);
  if (!hitter || hitter.side === removedPiece.side || !hitter.rpg) return;

  growAlkkagiPiece(hitter, ALKKAGI_RPG_STEP * Math.max(1, alkkagiRpgStacks(hitter)));
}

function simulateAlkkagiShot(room, shotPiece, directionX, directionY, power) {
  const speed = clampNumber(power, 0, ALKKAGI_MAX_EFFECTIVE_POWER) * ALKKAGI_POWER_SCALE;
  shotPiece.vx = directionX * speed;
  shotPiece.vy = directionY * speed;
  shotPiece.lastHitBy = null;

  const removedPieces = [];
  const animationFrames = [publicAlkkagiFrame(room)];
  const shotSeq = (room.alkkagiShotSeq || 0) + 1;
  let effectSeq = 0;
  for (let step = 0; step < ALKKAGI_MAX_STEPS; step += 1) {
    const pieces = liveAlkkagiPieces(room);
    const removedThisStep = [];
    const effectsThisStep = [];
    let moving = false;

    for (const piece of pieces) {
      piece.x += piece.vx;
      piece.y += piece.vy;
    }

    for (let i = 0; i < pieces.length; i += 1) {
      for (let j = i + 1; j < pieces.length; j += 1) {
        const effect = resolveAlkkagiCollision(pieces[i], pieces[j], shotPiece.side);
        if (effect) {
          effectSeq += 1;
          effectsThisStep.push({
            id: `${shotSeq}-${step}-${effectSeq}`,
            ...effect,
          });
        }
      }
    }

    for (const piece of pieces) {
      if (isAlkkagiOut(piece)) {
        if (piece.rezero) {
          effectSeq += 1;
          effectsThisStep.push({
            id: `${shotSeq}-${step}-rezero-${effectSeq}`,
            ...reviveAlkkagiPiece(room, piece),
          });
          moving = true;
          continue;
        }

        applyAlkkagiOutRewards(room, piece);
        piece.alive = false;
        piece.vx = 0;
        piece.vy = 0;
        const removedPiece = publicAlkkagiPiece(piece);
        removedPieces.push(removedPiece);
        removedThisStep.push(removedPiece);
        continue;
      }

      piece.vx *= ALKKAGI_FRICTION;
      piece.vy *= ALKKAGI_FRICTION;

      if (Math.hypot(piece.vx, piece.vy) < ALKKAGI_STOP_SPEED) {
        piece.vx = 0;
        piece.vy = 0;
      } else {
        moving = true;
      }
    }

    cleanupAlkkagiPassThrough(room);

    if (step % ALKKAGI_FRAME_INTERVAL === 0 || removedThisStep.length || effectsThisStep.length) {
      animationFrames.push(publicAlkkagiFrame(room, removedThisStep, effectsThisStep));
    }

    if (!moving) break;
  }

  for (const piece of liveAlkkagiPieces(room)) {
    piece.vx = 0;
    piece.vy = 0;
  }

  animationFrames.push(publicAlkkagiFrame(room));
  return { removedPieces, animationFrames };
}

function alkkagiWinner(room) {
  const livePieces = liveAlkkagiPieces(room);
  const blackCount = livePieces.filter((piece) => piece.side === 'black').length;
  const whiteCount = livePieces.filter((piece) => piece.side === 'white').length;

  if (blackCount === 0 && whiteCount === 0) return 'draw';
  if (blackCount === 0) return 'white';
  if (whiteCount === 0) return 'black';
  return null;
}

function clearReady(room) {
  room.ready = {
    black: false,
    white: false,
  };
}

function currentRoomFor(socket) {
  const roomId = users.get(socket.id)?.roomId;
  return roomId ? rooms.get(roomId) : null;
}

function canSwapColors(room) {
  return Boolean(room?.gameType
    && room.players.black
    && room.players.white
    && room.status === 'waiting'
    && room.moveCount === 0
    && !room.ready?.black
    && !room.ready?.white);
}

io.on('connection', (socket) => {
  users.set(socket.id, { id: socket.id, name: '손님', roomId: null });
  socket.join('lobby');
  emitProfile(socket, false);
  socket.emit('lobbyState', publicLobbyState());
  socket.emit('lobbyChatHistory', lobbyChatMessages);

  socket.on('setNickname', ({ name } = {}) => {
    const user = users.get(socket.id);
    if (!user) return;

    const cleanName = sanitizeName(name);
    if (isNicknameTaken(cleanName, socket.id)) {
      socket.emit('nicknameError', {
        name: cleanName,
        message: `"${cleanName}" 닉네임은 이미 사용 중입니다.`,
      });
      emitProfile(socket, false);
      return;
    }

    user.name = cleanName;
    getWallet(user.name);
    emitProfile(socket, true);
    emitShopState(socket);

    const room = currentRoomFor(socket);
    if (room) emitRoomState(room);
    emitLobbyState();
  });

  socket.on('requestShopState', () => {
    emitProfile(socket, Boolean(users.get(socket.id)?.name && getUserName(socket.id) !== '손님'));
    emitShopState(socket);
  });

  socket.on('requestInventoryState', () => {
    emitProfile(socket, Boolean(users.get(socket.id)?.name && getUserName(socket.id) !== '손님'));
    emitInventoryState(socket);
  });

  socket.on('buySkin', ({ skinId, pieceType } = {}) => {
    const user = users.get(socket.id);
    if (!user || user.name === '손님') {
      socket.emit('shopMessage', '닉네임을 먼저 설정해야 구매할 수 있습니다.');
      return;
    }

    const skin = findSkin(skinId);
    if (!skin) {
      socket.emit('shopMessage', '존재하지 않는 스킨입니다.');
      return;
    }

    if (!isSkinEquipSlot(skin, pieceType)) {
      socket.emit('shopMessage', isAlkkagiTrailSkin(skin)
        ? '알까기 이동 효과로 장착할 수 있는 스킨입니다.'
        : '스킨을 적용할 알까기 말을 선택하세요.');
      return;
    }

    const wallet = getWallet(user.name);
    const alreadyOwned = wallet.inventory.includes(skin.id);
    if (!alreadyOwned) {
      if (skin.active === false) {
        socket.emit('shopMessage', '판매가 종료된 스킨입니다.');
        emitShopState(socket);
        return;
      }

      if (wallet.gold < skin.price) {
        socket.emit('shopMessage', '골드가 부족합니다.');
        emitShopState(socket);
        return;
      }

      wallet.gold -= skin.price;
      wallet.inventory.push(skin.id);
    }

    wallet.equipped = wallet.equipped || {};
    const wasEquipped = alreadyOwned && wallet.equipped[pieceType] === skin.id;
    if (wasEquipped) {
      delete wallet.equipped[pieceType];
    } else {
      wallet.equipped[pieceType] = skin.id;
    }
    saveEconomy();
    socket.emit('shopMessage', wasEquipped
      ? `${skin.name} 스킨을 ${pieceTypeLabel(pieceType)}에서 장착 해제했습니다.`
      : (alreadyOwned ? `${skin.name} 스킨을 장착했습니다.` : `${skin.name} 스킨을 구매하고 장착했습니다.`));
    emitProfile(socket, true);
    emitShopState(socket);
    emitInventoryState(socket);

    const room = currentRoomFor(socket);
    if (room) emitRoomState(room);
  });

  socket.on('equipSkin', ({ skinId, pieceType } = {}) => {
    const user = users.get(socket.id);
    if (!user || user.name === '손님') {
      socket.emit('inventoryMessage', '닉네임을 먼저 설정해야 장착할 수 있습니다.');
      return;
    }

    const skin = findSkin(skinId);
    const wallet = getWallet(user.name);
    if (!skin || !wallet.inventory.includes(skinId)) {
      socket.emit('inventoryMessage', '보유한 스킨만 장착할 수 있습니다.');
      emitInventoryState(socket);
      return;
    }

    if (!isSkinEquipSlot(skin, pieceType)) {
      socket.emit('inventoryMessage', isAlkkagiTrailSkin(skin)
        ? '알까기 이동 효과로 장착할 수 있는 스킨입니다.'
        : '스킨을 적용할 알까기 말을 선택하세요.');
      return;
    }

    wallet.equipped = wallet.equipped || {};
    const wasEquipped = wallet.equipped[pieceType] === skin.id;
    if (wasEquipped) {
      delete wallet.equipped[pieceType];
    } else {
      wallet.equipped[pieceType] = skin.id;
    }
    saveEconomy();
    socket.emit('inventoryMessage', wasEquipped
      ? `${skin.name} 스킨을 ${pieceTypeLabel(pieceType)}에서 장착 해제했습니다.`
      : `${skin.name} 스킨을 장착했습니다.`);
    emitProfile(socket, true);
    emitInventoryState(socket);
    emitShopState(socket);

    const room = currentRoomFor(socket);
    if (room) emitRoomState(room);
  });

  socket.on('unequipSkin', ({ skinId } = {}) => {
    const user = users.get(socket.id);
    if (!user || user.name === '손님') {
      socket.emit('inventoryMessage', '닉네임을 먼저 설정해야 장착 해제할 수 있습니다.');
      return;
    }

    const skin = findSkin(skinId);
    const wallet = getWallet(user.name);
    const isEquippedSomewhere = Object.values(wallet.equipped || {}).includes(skinId);
    if (!skin || (!wallet.inventory.includes(skinId) && !isEquippedSomewhere)) {
      socket.emit('inventoryMessage', '보유하거나 장착 중인 스킨만 장착 해제할 수 있습니다.');
      emitInventoryState(socket);
      return;
    }

    wallet.equipped = wallet.equipped || {};
    let removedCount = 0;
    for (const [pieceType, equippedSkinId] of Object.entries(wallet.equipped)) {
      if (equippedSkinId === skinId) {
        delete wallet.equipped[pieceType];
        removedCount += 1;
      }
    }

    saveEconomy();
    socket.emit('inventoryMessage', removedCount
      ? `${skin.name} 스킨을 모든 말에서 장착 해제했습니다.`
      : `${skin.name} 스킨은 장착 중이 아닙니다.`);
    emitProfile(socket, true);
    emitInventoryState(socket);
    emitShopState(socket);

    const room = currentRoomFor(socket);
    if (room) emitRoomState(room);
  });

  socket.on('toggleSkinSale', ({ skinId, active } = {}) => {
    const user = users.get(socket.id);
    if (!user || user.name !== SHOP_ADMIN_NICKNAME) {
      socket.emit('shopMessage', '서버장 닉네임만 스킨 판매 상태를 바꿀 수 있습니다.');
      return;
    }

    const skin = findSkin(skinId);
    if (!skin) {
      socket.emit('shopMessage', '존재하지 않는 스킨입니다.');
      return;
    }

    skin.active = Boolean(active);
    skin.updatedAt = Date.now();
    saveEconomy();
    socket.emit('shopMessage', skin.active
      ? `${skin.name} 스킨 판매를 시작했습니다.`
      : `${skin.name} 스킨 판매를 중지했습니다.`);
    broadcastShopState();
  });

  socket.on('removeSkin', ({ skinId } = {}) => {
    const user = users.get(socket.id);
    if (!user || user.name !== SHOP_ADMIN_NICKNAME) {
      socket.emit('shopMessage', '서버장 닉네임만 스킨을 완전히 삭제할 수 있습니다.');
      return;
    }

    const result = removeSkinItem(skinId);
    if (!result.ok) {
      socket.emit('shopMessage', result.message);
      return;
    }

    socket.emit('shopMessage', `${result.skin.name} 스킨을 완전히 삭제했습니다.`);
    broadcastShopState();
    for (const room of rooms.values()) {
      if (room.gameType === 'alkkagi' && room.status !== 'finished') {
        emitRoomState(room);
      }
    }
  });

  socket.on('createJanggiSkin', ({ name, price, imageData } = {}) => {
    const user = users.get(socket.id);
    if (!user || user.name === '손님') {
      socket.emit('inventoryMessage', '닉네임을 먼저 설정해야 스킨을 만들 수 있습니다.');
      return;
    }

    const result = createSkinItem({
      name,
      price: 0,
      imageData,
      createdBy: user.name,
    });
    if (!result.ok) {
      socket.emit('inventoryMessage', result.message);
      return;
    }

    addSkinToWallet(user.name, result.skin.id);
    socket.emit('inventoryMessage', `${result.skin.name} 말 스킨을 보관함에 만들었습니다.`);
    emitProfile(socket, true);
    emitInventoryState(socket);

    const room = currentRoomFor(socket);
    if (room) emitRoomState(room);
  });

  socket.on('createAlkkagiTrailSkin', ({ name, price, effect } = {}) => {
    const user = users.get(socket.id);
    if (!user || user.name === '손님') {
      socket.emit('inventoryMessage', '닉네임을 먼저 설정해야 효과 스킨을 만들 수 있습니다.');
      return;
    }

    const result = createTrailSkinItem({
      name,
      price: 0,
      effect,
      createdBy: user.name,
    });
    addSkinToWallet(user.name, result.skin.id);
    socket.emit('inventoryMessage', `${result.skin.name} 효과 스킨을 보관함에 만들었습니다.`);
    emitProfile(socket, true);
    emitInventoryState(socket);

    const room = currentRoomFor(socket);
    if (room) emitRoomState(room);
  });

  socket.on('createRoom', ({ name } = {}) => {
    const room = createRoom(socket.id, name);
    rooms.set(room.id, room);
    enterRoom(socket, room);
  });

  socket.on('enterRoom', ({ roomId } = {}) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('lobbyMessage', '존재하지 않는 방입니다.');
      emitLobbyState();
      return;
    }

    enterRoom(socket, room);
  });

  socket.on('leaveRoom', () => {
    leaveCurrentRoom(socket);
  });

  socket.on('setGameType', ({ gameType } = {}) => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 게임 종류를 선택할 수 있습니다.');
      return;
    }

    if (room.status === 'playing') {
      socket.emit('roomMessage', '게임 진행 중에는 게임 종류를 바꿀 수 없습니다.');
      return;
    }

    if (room.ready?.black || room.ready?.white) {
      socket.emit('roomMessage', '준비 후에는 게임 종류를 바꿀 수 없습니다.');
      return;
    }

    if (gameType !== 'omok' && gameType !== 'janggi' && gameType !== 'chess' && gameType !== 'alkkagi') return;

    room.gameType = gameType;
    resetRoomBoard(room);
    io.to(room.id).emit('roomMessage', `${gameTypeLabel(gameType)}방으로 설정했습니다.`);
    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('joinAsSpectator', () => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const role = getRoomRole(room, socket.id);
    if (role === 'spectator') return;

    if (room.status === 'playing') {
      socket.emit('roomMessage', '게임 진행 중에는 관전자로 전환할 수 없습니다.');
      return;
    }

    if (room.players.black === socket.id) room.players.black = null;
    if (room.players.white === socket.id) room.players.white = null;
    room.spectators.add(socket.id);
    resetRoomBoard(room);
    io.to(room.id).emit('roomMessage', `${getUserName(socket.id)}님이 관전자로 전환했습니다.`);
    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('chooseSeat', ({ seat } = {}) => {
    moveToSeat(socket, seat);
  });

  socket.on('startGame', () => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 게임을 시작할 수 있습니다.');
      return;
    }

    if (!room.gameType) {
      socket.emit('roomMessage', '오목, 장기, 체스 또는 알까기를 먼저 선택하세요.');
      return;
    }

    if (!room.players.black || !room.players.white) {
      socket.emit('roomMessage', '두 명의 플레이어가 있어야 시작할 수 있습니다.');
      return;
    }

    if (room.status === 'playing') return;

    if (room.gameType === 'janggi') {
      socket.emit('roomMessage', '장기는 두 플레이어가 준비하면 시작됩니다.');
      return;
    }

    resetRoomBoard(room, 'playing');
    io.to(room.id).emit('roomMessage', `${gameTypeLabel(room.gameType)} 게임이 시작되었습니다.`);
    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('toggleReady', () => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 준비할 수 있습니다.');
      return;
    }

    if (room.gameType !== 'janggi') {
      socket.emit('roomMessage', '장기방에서만 준비를 사용할 수 있습니다.');
      return;
    }

    if (!room.players.black || !room.players.white) {
      socket.emit('roomMessage', '두 명의 플레이어가 있어야 준비할 수 있습니다.');
      return;
    }

    if (room.status !== 'waiting') return;

    room.ready[role] = !room.ready[role];
    if (room.ready.black && room.ready.white) {
      startPreparedJanggiGame(room);
      io.to(room.id).emit('roomMessage', '장기 게임이 시작되었습니다.');
    } else {
      const action = room.ready[role] ? '준비했습니다.' : '준비를 취소했습니다.';
      io.to(room.id).emit('roomMessage', `${getUserName(socket.id)}님이 ${action}`);
    }

    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('newGame', () => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 새 게임을 준비할 수 있습니다.');
      return;
    }

    if (room.status !== 'finished') {
      socket.emit('roomMessage', '게임이 끝난 뒤 새 게임을 준비할 수 있습니다.');
      return;
    }

    resetRoomBoard(room);
    io.to(room.id).emit('roomMessage', '새 게임을 준비했습니다.');
    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('resignGame', () => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 기권할 수 있습니다.');
      return;
    }

    if (room.status !== 'playing') {
      socket.emit('roomMessage', '게임 진행 중에만 기권할 수 있습니다.');
      return;
    }

    const winner = opposite(role);
    room.status = 'finished';
    room.winner = winner;
    room.finishReason = 'resign';
    room.checkAlert = null;
    room.swapRequest = null;
    room.alkkagiChoicePhase = null;
    io.to(room.id).emit('roomMessage', `${sideLabel(room, role)} 기권. ${sideLabel(room, winner)} 승리!`);
    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('placeStone', ({ row, col } = {}) => {
    const room = currentRoomFor(socket);
    if (!room) return;

    if (room.gameType !== 'omok') {
      socket.emit('roomMessage', '오목방에서만 돌을 둘 수 있습니다.');
      return;
    }

    row = Number(row);
    col = Number(col);

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '관전자는 돌을 둘 수 없습니다.');
      return;
    }

    if (room.status !== 'playing') {
      socket.emit('roomMessage', '게임 시작 후 돌을 둘 수 있습니다.');
      return;
    }

    if (role !== room.turn) {
      socket.emit('roomMessage', '지금은 당신의 차례가 아닙니다.');
      return;
    }

    if (!Number.isInteger(row) || !Number.isInteger(col) || !isInsideOmok(row, col)) {
      socket.emit('roomMessage', '잘못된 위치입니다.');
      return;
    }

    if (room.board[row][col]) {
      socket.emit('roomMessage', '이미 돌이 놓인 자리입니다.');
      return;
    }

    room.board[row][col] = role;
    if (isForbiddenOmokOverline(room.board, row, col, role)) {
      room.board[row][col] = null;
      socket.emit('roomMessage', '같은 색 돌을 6개 이상 이어지게 둘 수 없습니다.');
      return;
    }

    const winningStones = checkOmokWinner(room.board, row, col, role);

    if (!winningStones && isForbiddenDoubleThree(room.board, row, col, role)) {
      room.board[row][col] = null;
      socket.emit('roomMessage', '흑돌은 33 자리에 둘 수 없습니다.');
      return;
    }

    recordGameAction(room, role);
    room.swapRequest = null;
    room.lastMove = { row, col, color: role };

    if (winningStones) {
      room.status = 'finished';
      room.winner = role;
      room.winningStones = winningStones;
      io.to(room.id).emit('roomMessage', `${sideLabel(room, role)} 승리!`);
    } else if (room.moveCount >= OMOK_SIZE * OMOK_SIZE) {
      room.status = 'finished';
      room.winner = 'draw';
      io.to(room.id).emit('roomMessage', '무승부입니다.');
    } else {
      room.turn = opposite(role);
    }

    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('shootAlkkagi', ({ pieceId, direction, power } = {}) => {
    const room = currentRoomFor(socket);
    if (!room) return;

    if (room.gameType !== 'alkkagi') {
      socket.emit('roomMessage', '알까기방에서만 말을 튕길 수 있습니다.');
      return;
    }

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '관전자는 말을 튕길 수 없습니다.');
      return;
    }

    if (room.status !== 'playing') {
      socket.emit('roomMessage', '게임 시작 후 말을 튕길 수 있습니다.');
      return;
    }

    if (role !== room.turn) {
      socket.emit('roomMessage', '지금은 당신의 차례가 아닙니다.');
      return;
    }

    if (room.alkkagiChoicePhase) {
      socket.emit('roomMessage', '보상 선택이 끝난 뒤 말을 튕길 수 있습니다.');
      return;
    }

    const shotPiece = (room.alkkagiPieces || []).find((piece) => piece.id === pieceId && piece.alive);
    if (!shotPiece || shotPiece.side !== role) {
      socket.emit('roomMessage', '자기 말만 튕길 수 있습니다.');
      return;
    }

    const rawDx = Number(direction?.x);
    const rawDy = Number(direction?.y);
    const rawPower = Number(power);
    const length = Math.hypot(rawDx, rawDy);

    if (!Number.isFinite(rawDx) || !Number.isFinite(rawDy) || !Number.isFinite(rawPower) || length <= 0) {
      socket.emit('roomMessage', '방향을 다시 잡아주세요.');
      return;
    }

    const shotPower = clampNumber(rawPower, 0, 1);
    if (shotPower < 0.04) {
      socket.emit('roomMessage', '힘이 너무 약합니다.');
      return;
    }

    const directionX = rawDx / length;
    const directionY = rawDy / length;
    const powerMultiplier = Number(shotPiece.powerMultiplier) || 1;
    const oneShotPowerMultiplier = Number(shotPiece.oneShotPowerMultiplier) || 1;
    const effectivePower = shotPower * powerMultiplier * oneShotPowerMultiplier;
    delete shotPiece.oneShotPowerMultiplier;

    const { removedPieces, animationFrames } = simulateAlkkagiShot(
      room,
      shotPiece,
      directionX,
      directionY,
      effectivePower,
    );

    recordGameAction(room, role);
    room.alkkagiShotSeq = (room.alkkagiShotSeq || 0) + 1;
    room.swapRequest = null;
    room.lastMove = {
      pieceId: shotPiece.id,
      color: role,
      direction: {
        x: Number(directionX.toFixed(4)),
        y: Number(directionY.toFixed(4)),
      },
      power: Number(shotPower.toFixed(4)),
      effectivePower: Number(effectivePower.toFixed(4)),
      removedPieces,
      animationFrames,
      trailSkins: publicAlkkagiTrailLoadouts(room),
      shotSeq: room.alkkagiShotSeq,
    };

    const winner = alkkagiWinner(room);
    if (winner) {
      room.status = 'finished';
      room.winner = winner;
      const message = winner === 'draw'
        ? '모든 말이 떨어져 무승부입니다.'
        : `${getUserName(room.players[winner])}의 승리!`;
      io.to(room.id).emit('roomMessage', message);
    } else {
      const rewardStarted = completeAlkkagiShotRound(room, role);
      room.turn = rewardStarted ? room.alkkagiChoicePhase.turnAfterChoice : opposite(role);
      const removedText = removedPieces.length ? ` ${removedPieces.length}개가 떨어졌습니다.` : '';
      const rewardText = rewardStarted ? ` ${room.alkkagiRound}턴 보상이 열렸습니다.` : '';
      io.to(room.id).emit('roomMessage', `${sideLabel(room, role)}이 알을 깠습니다.${removedText}${rewardText}`);
    }

    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('chooseAlkkagiOption', ({ optionId, targetPieceId, targetPieceIds } = {}) => {
    const room = currentRoomFor(socket);
    if (!room) return;

    if (room.gameType !== 'alkkagi') {
      socket.emit('roomMessage', '알까기방에서만 보상을 선택할 수 있습니다.');
      return;
    }

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 보상을 선택할 수 있습니다.');
      return;
    }

    if (room.status !== 'playing') {
      socket.emit('roomMessage', '게임 진행 중에만 보상을 선택할 수 있습니다.');
      return;
    }

    const phase = room.alkkagiChoicePhase;
    if (!phase || !phase.pending?.[role]) {
      socket.emit('roomMessage', '선택할 보상이 없습니다.');
      return;
    }

    if (!(phase.choices?.[role] || []).includes(optionId)) {
      socket.emit('roomMessage', '이번 보상 선택지에 없는 항목입니다.');
      return;
    }

    const normalizedTargetIds = Array.isArray(targetPieceIds)
      ? targetPieceIds
      : (targetPieceId ? [targetPieceId] : []);
    const result = applyAlkkagiOption(room, role, optionId, normalizedTargetIds);
    if (!result.ok) {
      socket.emit('roomMessage', result.message);
      return;
    }

    phase.pending[role] = false;
    const isChoiceDone = !phase.pending.black && !phase.pending.white;
    if (isChoiceDone) {
      if (phase.turnAfterChoice === 'black' || phase.turnAfterChoice === 'white') {
        room.turn = phase.turnAfterChoice;
      }
      room.alkkagiChoicePhase = null;
      io.to(room.id).emit('roomMessage', '보상 선택이 끝났습니다. 알까기를 계속하세요.');
    } else {
      io.to(room.id).emit('roomMessage', `${sideLabel(room, role)}이 보상을 선택했습니다.`);
    }

    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('moveChess', ({ from, to, promotion } = {}) => {
    const room = currentRoomFor(socket);
    if (!room) return;

    if (room.gameType !== 'chess') {
      socket.emit('roomMessage', '체스방에서만 말을 움직일 수 있습니다.');
      return;
    }

    const fromRow = Number(from?.row);
    const fromCol = Number(from?.col);
    const toRow = Number(to?.row);
    const toCol = Number(to?.col);
    const role = getRoomRole(room, socket.id);
    const promotionType = normalizePromotion(promotion);

    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '관전자는 말을 움직일 수 없습니다.');
      return;
    }

    if (room.status !== 'playing') {
      socket.emit('roomMessage', '게임 시작 후 말을 움직일 수 있습니다.');
      return;
    }

    if (role !== room.turn) {
      socket.emit('roomMessage', '지금은 당신의 차례가 아닙니다.');
      return;
    }

    if (![fromRow, fromCol, toRow, toCol].every(Number.isInteger)
      || !isInsideChess(fromRow, fromCol)
      || !isInsideChess(toRow, toCol)) {
      socket.emit('roomMessage', '잘못된 위치입니다.');
      return;
    }

    if (!isLegalChessMove(room, room.board, fromRow, fromCol, toRow, toCol, role, promotionType)) {
      socket.emit('roomMessage', getChessInvalidMoveMessage(room, fromRow, fromCol, toRow, toCol, role, promotionType));
      return;
    }

    const movingPiece = room.board[fromRow][fromCol];
    const moveInfo = applyChessMoveOnBoard(room, room.board, fromRow, fromCol, toRow, toCol, promotionType);
    recordGameAction(room, role);
    room.swapRequest = null;
    room.chessEnPassant = null;
    room.halfMoveClock = movingPiece.type === 'pawn' || moveInfo.captured ? 0 : (room.halfMoveClock || 0) + 1;

    if (movingPiece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
      room.chessEnPassant = {
        row: (fromRow + toRow) / 2,
        col: fromCol,
        capturedRow: toRow,
        capturedCol: toCol,
        capturableBy: opposite(role),
      };
    }

    room.lastMove = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      color: role,
      piece: movingPiece.type,
      capture: Boolean(moveInfo.captured),
      promotion: moveInfo.promotion,
      castling: moveInfo.castling,
      enPassant: moveInfo.enPassant,
    };

    const nextTurn = opposite(role);
    const nextInCheck = isChessKingInCheck(room, nextTurn);
    const nextHasMove = hasAnyLegalChessMove(room, nextTurn);

    if (nextInCheck) {
      room.checkAlert = {
        id: room.checkAlertSeq,
        side: nextTurn,
      };
      room.checkAlertSeq += 1;

      if (!nextHasMove) {
        room.status = 'finished';
        room.winner = role;
        io.to(room.id).emit('roomMessage', `체크메이트입니다. ${sideLabel(room, role)} 승리!`);
      } else {
        io.to(room.id).emit('roomMessage', '체크!');
      }
    } else {
      room.checkAlert = null;
      if (!nextHasMove) {
        room.status = 'finished';
        room.winner = 'draw';
        io.to(room.id).emit('roomMessage', '스테일메이트로 무승부입니다.');
      } else if (room.halfMoveClock >= 100) {
        room.status = 'finished';
        room.winner = 'draw';
        io.to(room.id).emit('roomMessage', '50수 규칙으로 무승부입니다.');
      }
    }

    if (room.status !== 'finished') {
      room.turn = nextTurn;
    }

    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('swapSetupPieces', ({ first, second } = {}) => {
    const room = currentRoomFor(socket);
    if (!room) return;

    if (room.gameType !== 'janggi') {
      socket.emit('roomMessage', '장기방에서만 마와 상의 자리를 바꿀 수 있습니다.');
      return;
    }

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 마와 상의 자리를 바꿀 수 있습니다.');
      return;
    }

    if (room.status !== 'waiting' || room.moveCount !== 0) {
      socket.emit('roomMessage', '게임 시작 전 차림에서만 마와 상의 자리를 바꿀 수 있습니다.');
      return;
    }

    if (room.ready[role]) {
      socket.emit('roomMessage', '준비 후에는 배치를 바꿀 수 없습니다. 준비를 취소한 뒤 바꿔주세요.');
      return;
    }

    const firstRow = Number(first?.row);
    const firstCol = Number(first?.col);
    const secondRow = Number(second?.row);
    const secondCol = Number(second?.col);
    const setupRow = role === 'black' ? 9 : 0;
    const setupCols = new Set([1, 2, 6, 7]);

    if (![firstRow, firstCol, secondRow, secondCol].every(Number.isInteger)
      || firstRow !== setupRow
      || secondRow !== setupRow
      || !setupCols.has(firstCol)
      || !setupCols.has(secondCol)
      || (firstRow === secondRow && firstCol === secondCol)) {
      socket.emit('roomMessage', '시작 전에는 자기 진영의 마/상 자리만 바꿀 수 있습니다.');
      return;
    }

    const firstPiece = room.board[firstRow][firstCol];
    const secondPiece = room.board[secondRow][secondCol];
    const isSetupPiece = (piece) => piece?.side === role && (piece.type === 'ma' || piece.type === 'sang');
    if (!isSetupPiece(firstPiece) || !isSetupPiece(secondPiece)) {
      socket.emit('roomMessage', '마와 상끼리만 자리를 바꿀 수 있습니다.');
      return;
    }

    room.board[firstRow][firstCol] = secondPiece;
    room.board[secondRow][secondCol] = firstPiece;
    room.swapRequest = null;
    io.to(room.id).emit('roomMessage', `${getUserName(socket.id)}님이 마/상 차림을 바꿨습니다.`);
    emitRoomState(room);
  });

  socket.on('moveJanggi', ({ from, to } = {}) => {
    const room = currentRoomFor(socket);
    if (!room) return;

    if (room.gameType !== 'janggi') {
      socket.emit('roomMessage', '장기방에서만 말을 움직일 수 있습니다.');
      return;
    }

    const fromRow = Number(from?.row);
    const fromCol = Number(from?.col);
    const toRow = Number(to?.row);
    const toCol = Number(to?.col);
    const role = getRoomRole(room, socket.id);

    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '관전자는 말을 움직일 수 없습니다.');
      return;
    }

    if (room.status !== 'playing') {
      socket.emit('roomMessage', '게임 시작 후 말을 움직일 수 있습니다.');
      return;
    }

    if (role !== room.turn) {
      socket.emit('roomMessage', '지금은 당신의 차례가 아닙니다.');
      return;
    }

    if (![fromRow, fromCol, toRow, toCol].every(Number.isInteger)
      || !isInsideJanggi(fromRow, fromCol)
      || !isInsideJanggi(toRow, toCol)) {
      socket.emit('roomMessage', '잘못된 위치입니다.');
      return;
    }

    if (!isLegalJanggiMove(room.board, fromRow, fromCol, toRow, toCol, role)) {
      socket.emit('roomMessage', getJanggiInvalidMoveMessage(room.board, fromRow, fromCol, toRow, toCol, role));
      return;
    }

    const piece = room.board[fromRow][fromCol];
    const captured = room.board[toRow][toCol];
    room.board[toRow][toCol] = piece;
    room.board[fromRow][fromCol] = null;
    recordGameAction(room, role);
    room.consecutivePasses = 0;
    room.swapRequest = null;
    room.lastMove = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      color: role,
    };

    if (captured?.type === 'jang') {
      room.status = 'finished';
      room.winner = role;
      room.checkAlert = null;
      io.to(room.id).emit('roomMessage', `${sideLabel(room, role)} 승리!`);
    } else {
      const nextTurn = opposite(role);
      if (isGeneralInCheck(room.board, nextTurn)) {
        room.checkAlert = {
          id: room.checkAlertSeq,
          side: nextTurn,
        };
        room.checkAlertSeq += 1;
        if (!hasAnyLegalJanggiMove(room.board, nextTurn)) {
          room.status = 'finished';
          room.winner = role;
          io.to(room.id).emit('roomMessage', `외통수입니다. ${sideLabel(room, role)} 승리!`);
        } else {
          io.to(room.id).emit('roomMessage', '장군이요!');
        }
      } else {
        room.checkAlert = null;
      }

      if (room.status !== 'finished') {
        room.turn = nextTurn;
        const repetitionCount = recordJanggiPosition(room);
        if (repetitionCount >= 3) {
          room.status = 'finished';
          room.winner = 'draw';
          room.checkAlert = null;
          io.to(room.id).emit('roomMessage', '같은 형태가 세 번 반복되어 무승부입니다.');
        }
      }
    }

    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('passJanggiTurn', () => {
    const room = currentRoomFor(socket);
    if (!room) return;

    if (room.gameType !== 'janggi') {
      socket.emit('roomMessage', '장기방에서만 한 수 쉴 수 있습니다.');
      return;
    }

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '관전자는 한 수 쉴 수 없습니다.');
      return;
    }

    if (room.status !== 'playing') {
      socket.emit('roomMessage', '게임 시작 후 한 수 쉴 수 있습니다.');
      return;
    }

    if (role !== room.turn) {
      socket.emit('roomMessage', '지금은 당신의 차례가 아닙니다.');
      return;
    }

    if (isGeneralInCheck(room.board, role)) {
      socket.emit('roomMessage', '장군을 받은 상태에서는 한 수 쉴 수 없습니다.');
      return;
    }

    recordGameAction(room, role);
    room.consecutivePasses = (room.consecutivePasses || 0) + 1;
    room.swapRequest = null;
    room.checkAlert = null;
    room.lastMove = {
      pass: true,
      color: role,
    };

    if (room.consecutivePasses >= 2) {
      const message = finishJanggiByScore(room);
      io.to(room.id).emit('roomMessage', message);
    } else {
      room.turn = opposite(role);
      const repetitionCount = recordJanggiPosition(room);
      if (repetitionCount >= 3) {
        room.status = 'finished';
        room.winner = 'draw';
        io.to(room.id).emit('roomMessage', '같은 형태가 세 번 반복되어 무승부입니다.');
      } else {
        io.to(room.id).emit('roomMessage', `${sideLabel(room, role)}이 한 수 쉬었습니다.`);
      }
    }

    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('requestSwapColors', () => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 진영 변경을 요청할 수 있습니다.');
      return;
    }

    if (!canSwapColors(room)) {
      socket.emit('roomMessage', '두 플레이어가 있고 게임 시작 전일 때만 진영을 바꿀 수 있습니다.');
      return;
    }

    if (room.swapRequest?.fromId === socket.id) {
      room.swapRequest = null;
      socket.emit('roomMessage', '진영 변경 요청을 취소했습니다.');
      emitRoomState(room);
      return;
    }

    room.swapRequest = { fromId: socket.id };
    io.to(room.id).emit('roomMessage', `${getUserName(socket.id)}님이 진영 바꾸기를 요청했습니다.`);
    emitRoomState(room);
  });

  socket.on('acceptSwapColors', () => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const role = getRoomRole(room, socket.id);
    if (role !== 'black' && role !== 'white') {
      socket.emit('roomMessage', '플레이어만 진영 변경을 수락할 수 있습니다.');
      return;
    }

    if (!room.swapRequest) {
      socket.emit('roomMessage', '수락할 진영 변경 요청이 없습니다.');
      return;
    }

    if (room.swapRequest.fromId === socket.id) {
      socket.emit('roomMessage', '상대가 수락해야 진영을 바꿀 수 있습니다.');
      return;
    }

    if (!canSwapColors(room)) {
      room.swapRequest = null;
      socket.emit('roomMessage', '두 플레이어가 있고 게임 시작 전일 때만 진영을 바꿀 수 있습니다.');
      emitRoomState(room);
      return;
    }

    const oldBlack = room.players.black;
    room.players.black = room.players.white;
    room.players.white = oldBlack;
    room.turn = initialTurnFor(room);
    room.swapRequest = null;

    io.to(room.id).emit('roomMessage', '진영이 서로 바뀌었습니다.');
    emitRoomState(room);
    emitLobbyState();
  });

  socket.on('sendLobbyChat', ({ text } = {}) => {
    const entry = addChatMessage(lobbyChatMessages, socket, text);
    if (entry) io.to('lobby').emit('lobbyChatMessage', entry);
  });

  socket.on('sendRoomChat', ({ text } = {}) => {
    const room = currentRoomFor(socket);
    if (!room) return;

    const entry = addChatMessage(room.chatMessages, socket, text);
    if (entry) io.to(room.id).emit('roomChatMessage', entry);
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom(socket, { sendSelfToLobby: false });
    users.delete(socket.id);
    emitLobbyState();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Board game server running on http://localhost:${PORT}`);
  console.log('Other devices on the same Wi-Fi/LAN can connect with http://YOUR_PC_IP:3000');
});
