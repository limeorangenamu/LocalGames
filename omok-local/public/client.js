const socket = io();

const lobbyView = document.getElementById('lobbyView');
const gameView = document.getElementById('gameView');
const shopView = document.getElementById('shopView');
const inventoryView = document.getElementById('inventoryView');
const roomList = document.getElementById('roomList');
const lobbyInfo = document.getElementById('lobbyInfo');
const createRoomBtn = document.getElementById('createRoomBtn');
const shopOpenBtn = document.getElementById('shopOpenBtn');
const inventoryOpenBtn = document.getElementById('inventoryOpenBtn');
const shopBackBtn = document.getElementById('shopBackBtn');
const inventoryBackBtn = document.getElementById('inventoryBackBtn');
const shopInfo = document.getElementById('shopInfo');
const inventoryInfo = document.getElementById('inventoryInfo');
const shopAdminPanel = document.getElementById('shopAdminPanel');
const skinCreateForm = document.getElementById('skinCreateForm');
const skinNameInput = document.getElementById('skinNameInput');
const skinPriceInput = document.getElementById('skinPriceInput');
const skinImageInput = document.getElementById('skinImageInput');
const effectCreateForm = document.getElementById('effectCreateForm');
const effectNameInput = document.getElementById('effectNameInput');
const effectPriceInput = document.getElementById('effectPriceInput');
const effectStyleInput = document.getElementById('effectStyleInput');
const effectColorAInput = document.getElementById('effectColorAInput');
const effectColorBInput = document.getElementById('effectColorBInput');
const effectLengthInput = document.getElementById('effectLengthInput');
const effectSizeInput = document.getElementById('effectSizeInput');
const skinShopGrid = document.getElementById('skinShopGrid');
const inventoryGrid = document.getElementById('inventoryGrid');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const roomTitle = document.getElementById('roomTitle');
const boardEl = document.getElementById('board');
const checkAlertEl = document.getElementById('checkAlert');

const nicknameText = document.getElementById('nicknameText');
const goldAmount = document.getElementById('goldAmount');
const goldBadge = goldAmount?.closest('.gold-badge');
const editNicknameBtn = document.getElementById('editNicknameBtn');
const nicknameModal = document.getElementById('nicknameModal');
const nicknameForm = document.getElementById('nicknameForm');
const nicknameInput = document.getElementById('nicknameInput');
const cancelNicknameBtn = document.getElementById('cancelNicknameBtn');

const gameTypePanel = document.getElementById('gameTypePanel');
const omokTypeBtn = document.getElementById('omokTypeBtn');
const janggiTypeBtn = document.getElementById('janggiTypeBtn');
const chessTypeBtn = document.getElementById('chessTypeBtn');
const alkkagiTypeBtn = document.getElementById('alkkagiTypeBtn');
const myRoleCard = document.getElementById('myRoleCard');
const myRoleEl = document.getElementById('myRole');
const turnTextEl = document.getElementById('turnText');
const blackPlayerEl = document.getElementById('blackPlayer');
const whitePlayerEl = document.getElementById('whitePlayer');
const blackSeatBtn = document.getElementById('blackSeatBtn');
const whiteSeatBtn = document.getElementById('whiteSeatBtn');
const blackSeatLabel = document.getElementById('blackSeatLabel');
const whiteSeatLabel = document.getElementById('whiteSeatLabel');
const gameMessageEl = document.getElementById('gameMessage');
const startGameBtn = document.getElementById('startGameBtn');
const newGameBtn = document.getElementById('newGameBtn');
const passTurnBtn = document.getElementById('passTurnBtn');
const resignBtn = document.getElementById('resignBtn');
const alkkagiChoicePanel = document.getElementById('alkkagiChoicePanel');
const alkkagiChoiceHint = document.getElementById('alkkagiChoiceHint');
const alkkagiChoiceList = document.getElementById('alkkagiChoiceList');
const swapPanel = document.getElementById('swapPanel');
const swapRequestBtn = document.getElementById('swapRequestBtn');
const swapHint = document.getElementById('swapHint');

const spectatorPanel = document.getElementById('spectatorPanel');
const joinSpectatorBtn = document.getElementById('joinSpectatorBtn');
const spectatorList = document.getElementById('spectatorList');

const lobbyChat = document.getElementById('lobbyChat');
const lobbyChatForm = document.getElementById('lobbyChatForm');
const lobbyChatInput = document.getElementById('lobbyChatInput');
const lobbyChatMessages = document.getElementById('lobbyChatMessages');
const roomChat = document.getElementById('roomChat');
const roomChatForm = document.getElementById('roomChatForm');
const roomChatInput = document.getElementById('roomChatInput');
const roomChatMessages = document.getElementById('roomChatMessages');

const OMOK_SIZE = 15;
const JANGGI_ROWS = 10;
const JANGGI_COLS = 9;
const CHESS_SIZE = 8;
const ALKKAGI_MAX_AIM_PX = 120;
const NICKNAME_KEY = 'omokNickname';
const starPoints = new Set(['3,3', '3,11', '7,7', '11,3', '11,11']);
const chessFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const chessPromotionTypes = new Set(['queen', 'rook', 'bishop', 'knight']);
const janggiSkinPieceTypes = [
  ['jang', '장'],
  ['cha', '차'],
  ['po', '포'],
  ['ma', '마'],
  ['sang', '상'],
  ['sa', '사'],
  ['soldier', '졸/병'],
];
const ALKKAGI_TRAIL_SLOT = 'alkkagiTrail';
const alkkagiTrailStyleLabels = {
  fire: '불꽃',
  rainbow: '무지개',
  comet: '빛꼬리',
  smoke: '안개',
};
const alkkagiPieceDiameters = {
  jang: 0.83,
  cha: 0.64,
  po: 0.64,
  ma: 0.64,
  sang: 0.64,
  sa: 0.51,
  soldier: 0.51,
};
const alkkagiOptionText = {
  tekkai: {
    title: '텟카이',
    lines: ['"겨우 그까짓 힘으로 감히..!"'],
    description: '지정한 말을 한번 부딪히기 전까지 무적 상태로 만든다. 상대방 말은 부딪힌 힘의 3배의 힘으로 튕겨져 나간다.',
    target: 'own',
  },
  mauga: {
    title: '마우가',
    lines: ['"아니, 그렇게 생각없이 들어가면 바로 죽는거 몰라요?"', '"알아"'],
    description: '장군을 적진 한가운데에 소환한다.',
    target: 'none',
  },
  beer: {
    title: '맥주!',
    lines: ['"맥주!"'],
    description: '지정한 말의 파워가 2배 상승한다.',
    target: 'own',
  },
  zergling: {
    title: '저글링 블러드',
    lines: ['"스스메!!"'],
    description: '졸을 2마리 소환한다.',
    target: 'none',
  },
  giant: {
    title: '거밍아웃',
    lines: ['"사실 내가 돌격형 거인이고 얘가 초대형 거인이야."'],
    description: '지정한 말 하나의 크기를 1.5배 증가시킨다.(단, 장군 말 제외)',
    target: 'ownNonJang',
  },
  illusion: {
    title: '환영술',
    lines: ['"그건 제 잔상입니다만"'],
    description: '상대의 공격을 통과시키는 잔상 효과를 두마리에게 적용시킨다.',
    target: 'own',
    targetCount: 2,
  },
  rpg: {
    title: 'RPG',
    lines: ['"나혼자만 레벨업"'],
    description: '지정된 말이 상대를 아웃시킬때마다 점점 강해진다.',
    target: 'own',
  },
  rezero: {
    title: 'RE:제로부터 시작하는 장기말생활',
    lines: ['"...꿈인가."'],
    description: '지정된 말은 아웃되었을 때, 자신의 처음 위치에 다시 소환된다.',
    target: 'own',
  },
};
const janggiPieceText = {
  black: {
    jang: '楚',
    sa: '士',
    cha: '車',
    po: '包',
    ma: '馬',
    sang: '象',
    soldier: '卒',
  },
  white: {
    jang: '漢',
    sa: '士',
    cha: '車',
    po: '砲',
    ma: '馬',
    sang: '象',
    soldier: '兵',
  },
};
const chessPieceText = {
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
};

let currentNickname = '';
let pendingNickname = '';
let currentGold = 0;
let currentIsAdmin = false;
let currentRoomId = null;
let myRole = 'lobby';
let latestRoomState = null;
let activeView = 'lobby';
let previousViewBeforeShop = 'lobby';
let latestShopState = null;
let latestInventoryState = null;
let pendingSkinChoiceId = null;
let pendingInventorySkinChoiceId = null;
let boardRenderKey = '';
let selectedJanggiPiece = null;
let selectedChessPiece = null;
let alkkagiAim = null;
let alkkagiAnimation = null;
let pendingAlkkagiOption = null;
let pendingAlkkagiTargets = [];
const alkkagiTemporaryPieceEffects = new Map();
let lastAlkkagiFadeSeq = null;
let lastAlkkagiAnimatedSeq = null;
let lastCheckAlertId = null;
let checkAlertTimer = null;

if (shopOpenBtn) shopOpenBtn.hidden = true;
if (goldBadge) goldBadge.hidden = true;

function setupInventoryCustomizerPanel() {
  if (!shopAdminPanel || !inventoryGrid?.parentElement) return;

  shopAdminPanel.hidden = false;
  shopAdminPanel.classList.add('personal-skin-panel');
  inventoryGrid.parentElement.insertBefore(shopAdminPanel, inventoryGrid);

  const title = shopAdminPanel.querySelector('h3');
  if (title) title.textContent = '개인 스킨 제작';

  const description = shopAdminPanel.querySelector('p');
  if (description) {
    description.textContent = '첫번째 줄 :: 알까기 말 스킨 제작툴 // 두번째 줄 :: 알까기 말 이동 효과 제작툴';
  }

  if (skinPriceInput) {
    skinPriceInput.value = '0';
    skinPriceInput.hidden = true;
  }
  if (effectPriceInput) {
    effectPriceInput.value = '0';
    effectPriceInput.hidden = true;
  }

  const skinButton = skinCreateForm?.querySelector('button[type="submit"]');
  if (skinButton) skinButton.textContent = '말 스킨 만들기';

  const effectButton = effectCreateForm?.querySelector('button[type="submit"]');
  if (effectButton) effectButton.textContent = '효과 만들기';
}

setupInventoryCustomizerPanel();

function gameTypeToKorean(gameType) {
  if (gameType === 'omok') return '오목';
  if (gameType === 'janggi') return '장기';
  if (gameType === 'chess') return '체스';
  if (gameType === 'alkkagi') return '알까기';
  return '미선택';
}

function sideLabel(role, gameType = latestRoomState?.gameType) {
  if (gameType === 'alkkagi') {
    if (role === 'black') return '초나라';
    if (role === 'white') return '한나라';
  }

  if (gameType === 'chess') {
    if (role === 'black') return '흑';
    if (role === 'white') return '백';
  }

  if (gameType === 'janggi') {
    if (role === 'black') return '초나라';
    if (role === 'white') return '한나라';
  }

  if (role === 'black') return '흑돌';
  if (role === 'white') return '백돌';
  if (role === 'draw') return '무승부';
  if (role === 'spectator') return '관전자';
  return '로비';
}

function statusToKorean(status) {
  if (status === 'playing') return '진행중';
  if (status === 'finished') return '종료';
  return '대기중';
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
  if (startRow === null || col < 3 || col > 5) return [];

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

  const fromKeys = palaceLineKey(fromRow, fromCol);
  const toKeys = palaceLineKey(toRow, toCol);
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

function oppositeRole(role) {
  return role === 'black' ? 'white' : 'black';
}

function generalsFace(board, side) {
  const own = findGeneral(board, side);
  const enemy = findGeneral(board, oppositeRole(side));
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

function isGeneralInCheck(board, side) {
  const general = findGeneral(board, side);
  if (!general) return true;
  if (generalsFace(board, side)) return true;

  const enemy = oppositeRole(side);
  for (let row = 0; row < JANGGI_ROWS; row += 1) {
    for (let col = 0; col < JANGGI_COLS; col += 1) {
      const piece = board[row][col];
      if (piece?.side === enemy && isJanggiMoveShapeLegal(board, row, col, general.row, general.col, piece)) {
        return true;
      }
    }
  }

  return false;
}

function isLegalJanggiMove(board, fromRow, fromCol, toRow, toCol, side) {
  const piece = board[fromRow]?.[fromCol];
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

function getLegalJanggiMoves(board, row, col, side) {
  const moves = new Map();
  for (let targetRow = 0; targetRow < JANGGI_ROWS; targetRow += 1) {
    for (let targetCol = 0; targetCol < JANGGI_COLS; targetCol += 1) {
      if (!isLegalJanggiMove(board, row, col, targetRow, targetCol, side)) continue;
      moves.set(`${targetRow},${targetCol}`, board[targetRow][targetCol] ? 'capture' : 'move');
    }
  }

  return moves;
}

function isInsideChess(row, col) {
  return row >= 0 && row < CHESS_SIZE && col >= 0 && col < CHESS_SIZE;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function normalizeChessPromotion(promotion) {
  return chessPromotionTypes.has(promotion) ? promotion : 'queen';
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

function isChessKingInCheck(state, side, board = state.board) {
  const king = findChessKing(board, side);
  if (!king) return true;
  return isChessSquareAttacked(board, king.row, king.col, oppositeRole(side));
}

function isChessEnPassantTarget(state, piece, fromRow, fromCol, toRow, toCol) {
  const enPassant = state.chessEnPassant;
  return Boolean(piece.type === 'pawn'
    && enPassant
    && enPassant.capturableBy === piece.side
    && enPassant.row === toRow
    && enPassant.col === toCol
    && enPassant.capturedRow === fromRow
    && Math.abs(enPassant.capturedCol - fromCol) === 1);
}

function isChessMoveShapeLegal(state, board, fromRow, fromCol, toRow, toCol, piece) {
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
      return Boolean(target && target.side !== piece.side) || isChessEnPassantTarget(state, piece, fromRow, fromCol, toRow, toCol);
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
    if (isChessKingInCheck(state, piece.side, board)) return false;

    const rookCol = dc > 0 ? 7 : 0;
    const rook = board[fromRow][rookCol];
    if (!rook || rook.side !== piece.side || rook.type !== 'rook' || rook.hasMoved) return false;

    const step = Math.sign(dc);
    for (let col = fromCol + step; col !== rookCol; col += step) {
      if (board[fromRow][col]) return false;
    }

    const enemy = oppositeRole(piece.side);
    return !isChessSquareAttacked(board, fromRow, fromCol + step, enemy)
      && !isChessSquareAttacked(board, toRow, toCol, enemy);
  }

  return false;
}

function applyChessMoveOnBoard(state, board, fromRow, fromCol, toRow, toCol, promotion = 'queen') {
  const piece = board[fromRow][fromCol];
  const target = board[toRow][toCol];

  if (piece.type === 'pawn' && !target && isChessEnPassantTarget(state, piece, fromRow, fromCol, toRow, toCol)) {
    board[state.chessEnPassant.capturedRow][state.chessEnPassant.capturedCol] = null;
  }

  board[toRow][toCol] = { ...piece, hasMoved: true };
  board[fromRow][fromCol] = null;

  if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
    const rookFromCol = toCol > fromCol ? 7 : 0;
    const rookToCol = toCol > fromCol ? 5 : 3;
    const rook = board[fromRow][rookFromCol];
    board[fromRow][rookToCol] = { ...rook, hasMoved: true };
    board[fromRow][rookFromCol] = null;
  }

  if (piece.type === 'pawn' && (toRow === 0 || toRow === CHESS_SIZE - 1)) {
    board[toRow][toCol].type = normalizeChessPromotion(promotion);
  }
}

function isLegalChessMove(state, board, fromRow, fromCol, toRow, toCol, side, promotion = 'queen') {
  if (!isInsideChess(fromRow, fromCol) || !isInsideChess(toRow, toCol)) return false;

  const piece = board[fromRow][fromCol];
  if (!piece || piece.side !== side) return false;
  if (!isChessMoveShapeLegal(state, board, fromRow, fromCol, toRow, toCol, piece)) return false;

  const testBoard = cloneBoard(board);
  const testState = { ...state, board: testBoard };
  applyChessMoveOnBoard(testState, testBoard, fromRow, fromCol, toRow, toCol, promotion);
  return !isChessKingInCheck(testState, side, testBoard);
}

function getLegalChessMoves(state, row, col, side) {
  const moves = new Map();
  for (let targetRow = 0; targetRow < CHESS_SIZE; targetRow += 1) {
    for (let targetCol = 0; targetCol < CHESS_SIZE; targetCol += 1) {
      if (!isLegalChessMove(state, state.board, row, col, targetRow, targetCol, side)) continue;
      moves.set(`${targetRow},${targetCol}`, state.board[targetRow][targetCol] ? 'capture' : 'move');
    }
  }

  const enPassant = state.chessEnPassant;
  if (enPassant && moves.has(`${enPassant.row},${enPassant.col}`)) {
    moves.set(`${enPassant.row},${enPassant.col}`, 'capture');
  }

  return moves;
}

function fitTextElement(element) {
  if (!element || element.clientWidth <= 0) return;

  const computed = window.getComputedStyle(element);
  if (!element.dataset.baseFontSize) {
    element.dataset.baseFontSize = String(parseFloat(computed.fontSize) || 16);
  }

  const maxSize = Number(element.dataset.maxFontSize) || Number(element.dataset.baseFontSize) || 16;
  const minSize = Number(element.dataset.minFontSize) || 10;
  let size = maxSize;

  element.style.fontSize = `${size}px`;

  while (size > minSize && element.scrollWidth > element.clientWidth) {
    size -= 0.5;
    element.style.fontSize = `${size}px`;
  }
}

function fitAllText() {
  requestAnimationFrame(() => {
    document.querySelectorAll('#nicknameText, .fit-text, button:not(.alkkagi-choice-card)').forEach(fitTextElement);
    fitAlkkagiChoiceCards();
  });
}

function fitAlkkagiChoiceCards() {
  if (!alkkagiChoiceList) return;

  for (const content of alkkagiChoiceList.querySelectorAll('.alkkagi-choice-card-content')) {
    let size = Number(content.dataset.baseFontSize) || 15;
    const minSize = Number(content.dataset.minFontSize) || 11;
    content.style.fontSize = `${size}px`;

    while (size > minSize && content.scrollHeight > content.clientHeight) {
      size -= 0.5;
      content.style.fontSize = `${size}px`;
    }
  }
}

function hasAlkkagiChoicePhase(state) {
  return Boolean(state?.gameType === 'alkkagi' && state.status === 'playing' && state.alkkagiChoicePhase);
}

function hasPendingAlkkagiChoice(state) {
  return Boolean(
    hasAlkkagiChoicePhase(state)
    && (myRole === 'black' || myRole === 'white')
    && state.alkkagiChoicePhase.pending?.[myRole],
  );
}

function isAlkkagiOptionTargetEligible(piece, optionId) {
  const option = alkkagiOptionText[optionId];
  if (!piece || !option || piece.side !== myRole) return false;
  if (option.target === 'own') return true;
  if (option.target === 'ownNonJang') return piece.type !== 'jang';
  return false;
}

function alkkagiOptionTargetCount(optionId) {
  const option = alkkagiOptionText[optionId];
  if (!option || option.target === 'none') return 0;
  return Number.isInteger(option.targetCount) ? option.targetCount : 1;
}

function alkkagiTargetInstruction(optionId) {
  const option = alkkagiOptionText[optionId];
  const count = alkkagiOptionTargetCount(optionId);
  if (option?.target === 'ownNonJang') return '장군을 제외한 아군 말을 선택하세요.';
  if (count > 1) return `적용할 아군 말 ${count}개를 선택하세요.`;
  return '적용할 아군 말을 선택하세요.';
}

function chooseAlkkagiOption(optionId, targetPieceIds = []) {
  const ids = Array.isArray(targetPieceIds) ? targetPieceIds : (targetPieceIds ? [targetPieceIds] : []);
  const payload = { optionId };
  if (ids.length === 1) payload.targetPieceId = ids[0];
  if (ids.length > 1) payload.targetPieceIds = ids;
  socket.emit('chooseAlkkagiOption', payload);
  pendingAlkkagiOption = null;
  pendingAlkkagiTargets = [];
  cancelAlkkagiAim();
}

function cancelPendingAlkkagiOption() {
  if (!pendingAlkkagiOption) return false;
  pendingAlkkagiOption = null;
  pendingAlkkagiTargets = [];

  if (latestRoomState?.gameType === 'alkkagi') {
    renderAlkkagiBoard(latestRoomState);
    renderAlkkagiChoices(latestRoomState);
    if (hasPendingAlkkagiChoice(latestRoomState)) {
      gameMessageEl.textContent = '이번턴에 선공이 바뀝니다. 보상 선택지를 고르세요.';
    }
  }

  return true;
}

function renderAlkkagiChoices(state) {
  if (!alkkagiChoicePanel || !alkkagiChoiceList) return;

  const pending = hasPendingAlkkagiChoice(state);
  const phase = state?.alkkagiChoicePhase;
  const choices = phase?.choices?.[myRole] || [];
  if (!pending) {
    alkkagiChoicePanel.hidden = true;
    alkkagiChoiceList.innerHTML = '';
    pendingAlkkagiOption = null;
    pendingAlkkagiTargets = [];
    return;
  }

  if (pendingAlkkagiOption && !choices.includes(pendingAlkkagiOption)) {
    pendingAlkkagiOption = null;
    pendingAlkkagiTargets = [];
  }

  alkkagiChoicePanel.hidden = false;
  alkkagiChoiceHint.textContent = pendingAlkkagiOption
    ? `이번턴에 선공이 바뀝니다. ${alkkagiTargetInstruction(pendingAlkkagiOption)} 우클릭하면 취소됩니다.`
    : `이번턴에 선공이 바뀝니다. ${phase.round}턴 보상입니다. 선택지 하나를 고르세요.`;
  alkkagiChoiceList.innerHTML = '';

  for (const optionId of choices) {
    const option = alkkagiOptionText[optionId];
    if (!option) continue;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'alkkagi-choice-card';
    button.classList.toggle('selected', pendingAlkkagiOption === optionId);

    const content = document.createElement('div');
    content.className = 'alkkagi-choice-card-content';
    content.dataset.baseFontSize = '15';
    content.dataset.minFontSize = '11';

    const title = document.createElement('strong');
    title.className = 'alkkagi-choice-title';
    title.textContent = option.title;
    content.appendChild(title);

    for (const lineText of option.lines || []) {
      const line = document.createElement('span');
      line.className = 'alkkagi-choice-quote';
      line.textContent = lineText;
      content.appendChild(line);
    }

    const description = document.createElement('span');
    description.className = 'alkkagi-choice-description';
    description.textContent = option.description;
    content.appendChild(description);

    button.appendChild(content);
    button.addEventListener('click', () => {
      if (option.target === 'none') {
        chooseAlkkagiOption(optionId);
        return;
      }

      pendingAlkkagiOption = optionId;
      pendingAlkkagiTargets = [];
      cancelAlkkagiAim();
      renderAlkkagiBoard(state);
      renderAlkkagiChoices(state);
      gameMessageEl.textContent = alkkagiTargetInstruction(optionId);
    });

    alkkagiChoiceList.appendChild(button);
  }

  fitAlkkagiChoiceCards();
}

function showLobby() {
  activeView = 'lobby';
  currentRoomId = null;
  latestRoomState = null;
  myRole = 'lobby';
  selectedJanggiPiece = null;
  selectedChessPiece = null;
  pendingAlkkagiOption = null;
  pendingAlkkagiTargets = [];
  alkkagiTemporaryPieceEffects.clear();
  cancelAlkkagiAim();
  cancelAlkkagiAnimation();
  boardRenderKey = '';
  lobbyView.hidden = false;
  gameView.hidden = true;
  shopView.hidden = true;
  inventoryView.hidden = true;
  spectatorPanel.hidden = true;
  lobbyChat.hidden = false;
  roomChat.hidden = true;
  gameMessageEl.textContent = '게임방에 입장했습니다.';
  if (alkkagiChoicePanel) alkkagiChoicePanel.hidden = true;
  if (alkkagiChoiceList) alkkagiChoiceList.innerHTML = '';
}

function showGame() {
  activeView = 'game';
  lobbyView.hidden = true;
  gameView.hidden = false;
  shopView.hidden = true;
  inventoryView.hidden = true;
  spectatorPanel.hidden = false;
  lobbyChat.hidden = true;
  roomChat.hidden = false;
}

function showShop() {
  showInventory();
}

function showInventory() {
  previousViewBeforeShop = (activeView === 'shop' || activeView === 'inventory') ? previousViewBeforeShop : activeView;
  activeView = 'inventory';
  lobbyView.hidden = true;
  gameView.hidden = true;
  shopView.hidden = true;
  inventoryView.hidden = false;
  spectatorPanel.hidden = true;
  lobbyChat.hidden = true;
  roomChat.hidden = true;
  socket.emit('requestInventoryState');
  renderInventory();
}

function leaveStoreLikeView() {
  if (previousViewBeforeShop === 'game' && latestRoomState) {
    showGame();
    renderBoard(latestRoomState);
    updateStatus(latestRoomState);
    return;
  }

  showLobby();
}

function openNicknameModal(required = false) {
  nicknameModal.hidden = false;
  nicknameModal.dataset.required = required ? 'true' : 'false';
  cancelNicknameBtn.hidden = required;
  nicknameInput.value = currentNickname || pendingNickname || localStorage.getItem(NICKNAME_KEY) || '';
  setTimeout(() => nicknameInput.focus(), 0);
}

function closeNicknameModal() {
  nicknameModal.hidden = true;
  nicknameModal.dataset.required = 'false';
}

function saveNickname(name) {
  const cleanName = name.trim().slice(0, 16);
  if (!cleanName) {
    nicknameInput.focus();
    return;
  }

  pendingNickname = cleanName;
  socket.emit('setNickname', { name: cleanName });
}

function ensureBoard(state) {
  const gameType = state.gameType || 'none';
  const orientation = ((gameType === 'janggi' || gameType === 'alkkagi') && myRole === 'white')
    || (gameType === 'chess' && myRole === 'black')
    ? 'flipped'
    : 'normal';
  const nextKey = `${gameType}-${orientation}`;
  if (boardRenderKey === nextKey) return;

  boardRenderKey = nextKey;
  selectedJanggiPiece = null;
  selectedChessPiece = null;
  pendingAlkkagiOption = null;
  pendingAlkkagiTargets = [];
  alkkagiTemporaryPieceEffects.clear();
  cancelAlkkagiAim();
  cancelAlkkagiAnimation();
  lastAlkkagiFadeSeq = null;
  lastAlkkagiAnimatedSeq = null;

  if (gameType === 'janggi') {
    makeJanggiBoard(orientation);
  } else if (gameType === 'alkkagi') {
    makeAlkkagiBoard(orientation);
  } else if (gameType === 'chess') {
    makeChessBoard(orientation);
  } else if (gameType === 'omok') {
    makeOmokBoard();
  } else {
    makePlaceholderBoard();
  }
}

function makePlaceholderBoard() {
  boardEl.className = 'board board-placeholder';
  boardEl.innerHTML = '<div>게임을 선택하세요</div>';
  boardEl.setAttribute('aria-label', '게임 선택 전');
}

function makeOmokBoard() {
  boardEl.className = 'board omok-board';
  boardEl.innerHTML = '';
  boardEl.setAttribute('aria-label', '오목판');

  for (let row = 0; row < OMOK_SIZE; row += 1) {
    for (let col = 0; col < OMOK_SIZE; col += 1) {
      const cell = document.createElement('button');
      cell.className = 'cell omok-cell';
      cell.type = 'button';
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (starPoints.has(`${row},${col}`)) {
        cell.classList.add('star');
      }

      cell.addEventListener('click', () => {
        socket.emit('placeStone', { row, col });
      });

      boardEl.appendChild(cell);
    }
  }
}

function makeJanggiBoard(orientation) {
  boardEl.className = 'board janggi-board';
  boardEl.innerHTML = '';
  boardEl.setAttribute('aria-label', '장기판');

  const palaceLines = [
    [3, 0, 45],
    [5, 0, 135],
    [3, 7, 45],
    [5, 7, 135],
  ];

  for (const [col, row, angle] of palaceLines) {
    const line = document.createElement('div');
    line.className = 'palace-line';
    line.style.left = `calc(var(--board-padding) + var(--cell) * ${col + 0.5})`;
    line.style.top = `calc(var(--board-padding) + var(--cell) * ${row + 0.5})`;
    line.style.transform = `rotate(${angle}deg)`;
    boardEl.appendChild(line);
  }

  for (let displayRow = 0; displayRow < JANGGI_ROWS; displayRow += 1) {
    for (let displayCol = 0; displayCol < JANGGI_COLS; displayCol += 1) {
      const row = orientation === 'flipped' ? JANGGI_ROWS - 1 - displayRow : displayRow;
      const col = orientation === 'flipped' ? JANGGI_COLS - 1 - displayCol : displayCol;
      const cell = document.createElement('button');
      cell.className = 'cell janggi-cell';
      cell.type = 'button';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener('click', () => handleJanggiCellClick(row, col));
      boardEl.appendChild(cell);
    }
  }
}

function makeAlkkagiBoard(orientation) {
  boardEl.className = 'board janggi-board alkkagi-board';
  boardEl.innerHTML = '';
  boardEl.setAttribute('aria-label', '알까기판');
  boardEl.dataset.orientation = orientation;

  const palaceLines = [
    [3, 0, 45],
    [5, 0, 135],
    [3, 7, 45],
    [5, 7, 135],
  ];

  for (const [col, row, angle] of palaceLines) {
    const displayCol = orientation === 'flipped' ? JANGGI_COLS - 1 - col : col;
    const displayRow = orientation === 'flipped' ? JANGGI_ROWS - 1 - row : row;
    const line = document.createElement('div');
    line.className = 'palace-line';
    line.style.left = `calc(var(--board-padding) + var(--cell) * ${displayCol + 0.5})`;
    line.style.top = `calc(var(--board-padding) + var(--cell) * ${displayRow + 0.5})`;
    line.style.transform = `rotate(${angle}deg)`;
    boardEl.appendChild(line);
  }

  for (let displayRow = 0; displayRow < JANGGI_ROWS; displayRow += 1) {
    for (let displayCol = 0; displayCol < JANGGI_COLS; displayCol += 1) {
      const row = orientation === 'flipped' ? JANGGI_ROWS - 1 - displayRow : displayRow;
      const col = orientation === 'flipped' ? JANGGI_COLS - 1 - displayCol : displayCol;
      const cell = document.createElement('div');
      cell.className = 'cell alkkagi-cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      boardEl.appendChild(cell);
    }
  }
}

function makeChessBoard(orientation) {
  boardEl.className = 'board chess-board';
  boardEl.innerHTML = '';
  boardEl.setAttribute('aria-label', '체스판');

  for (let displayRow = 0; displayRow < CHESS_SIZE; displayRow += 1) {
    for (let displayCol = 0; displayCol < CHESS_SIZE; displayCol += 1) {
      const row = orientation === 'flipped' ? CHESS_SIZE - 1 - displayRow : displayRow;
      const col = orientation === 'flipped' ? CHESS_SIZE - 1 - displayCol : displayCol;
      const cell = document.createElement('button');
      cell.className = `cell chess-cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
      cell.type = 'button';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.dataset.displayRow = displayRow;
      cell.dataset.displayCol = displayCol;

      if (displayCol === 0) {
        const rank = document.createElement('span');
        rank.className = 'chess-coordinate rank';
        rank.textContent = String(CHESS_SIZE - row);
        cell.appendChild(rank);
      }

      if (displayRow === CHESS_SIZE - 1) {
        const file = document.createElement('span');
        file.className = 'chess-coordinate file';
        file.textContent = chessFiles[col];
        cell.appendChild(file);
      }

      cell.addEventListener('click', () => handleChessCellClick(row, col));
      boardEl.appendChild(cell);
    }
  }
}

function renderBoard(state) {
  ensureBoard(state);

  if (state.gameType === 'janggi') {
    renderJanggiBoard(state);
    return;
  }

  if (state.gameType === 'alkkagi') {
    renderAlkkagiBoard(state);
    return;
  }

  if (state.gameType === 'chess') {
    renderChessBoard(state);
    return;
  }

  if (state.gameType === 'omok') {
    renderOmokBoard(state);
  }
}

function renderOmokBoard(state) {
  const winningSet = new Set((state.winningStones || []).map(([r, c]) => `${r},${c}`));
  const lastMoveKey = state.lastMove ? `${state.lastMove.row},${state.lastMove.col}` : null;
  const shouldShowLastMove = state.lastMove && (myRole === 'spectator' || state.lastMove.color !== myRole);

  for (const cell of boardEl.querySelectorAll('.cell')) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const cellKey = `${row},${col}`;
    const value = state.board[row][col];
    cell.innerHTML = '';
    cell.classList.toggle('win', winningSet.has(cellKey));
    cell.classList.toggle('last', Boolean(shouldShowLastMove && lastMoveKey === cellKey));
    cell.classList.remove('selected');

    if (value) {
      const stone = document.createElement('div');
      stone.className = `stone ${value}`;
      cell.appendChild(stone);
    }
  }
}

function skinForJanggiPiece(state, piece) {
  return state?.janggiSkins?.[piece?.side]?.[piece?.type] || null;
}

function applyJanggiSkin(pieceEl, skin) {
  if (!skin?.imageUrl) return;
  pieceEl.classList.add('skinned');
  pieceEl.style.backgroundImage = `url("${skin.imageUrl}")`;
  pieceEl.title = skin.name || '';
}

function renderJanggiBoard(state) {
  const lastMoveKey = state.lastMove?.to ? `${state.lastMove.to.row},${state.lastMove.to.col}` : null;
  const shouldShowLastMove = Boolean(lastMoveKey);
  const selectedPiece = selectedJanggiPiece
    ? state.board[selectedJanggiPiece.row]?.[selectedJanggiPiece.col]
    : null;
  const canShowMoveHints = state.status === 'playing'
    && myRole === state.turn
    && selectedPiece?.side === myRole;
  const legalMoves = canShowMoveHints
    ? getLegalJanggiMoves(state.board, selectedJanggiPiece.row, selectedJanggiPiece.col, myRole)
    : new Map();
  const canArrangeSetup = state.status === 'waiting'
    && (myRole === 'black' || myRole === 'white')
    && !state.ready?.[myRole];
  const setupRow = myRole === 'black' ? 9 : 0;
  const setupCols = new Set([1, 2, 6, 7]);
  const selectedSetupPiece = canArrangeSetup && selectedPiece && isMySetupPiece(selectedPiece);
  const canShowSelection = canShowMoveHints || selectedSetupPiece;

  for (const cell of boardEl.querySelectorAll('.janggi-cell')) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const piece = state.board[row][col];
    const cellKey = `${row},${col}`;
    const hint = legalMoves.get(cellKey);
    const isSetupSlot = canArrangeSetup && row === setupRow && setupCols.has(col) && isMySetupPiece(piece);
    const isSelected = Boolean(canShowSelection && selectedJanggiPiece && selectedJanggiPiece.row === row && selectedJanggiPiece.col === col);
    cell.innerHTML = '';
    cell.classList.toggle('last', Boolean(shouldShowLastMove && lastMoveKey === cellKey));
    cell.classList.toggle('selected', isSelected);
    cell.classList.toggle('move-hint', hint === 'move');
    cell.classList.toggle('capture-hint', hint === 'capture');
    cell.classList.toggle('setup-enabled', isSetupSlot);
    cell.classList.toggle('setup-swap-target', Boolean(selectedSetupPiece && isSetupSlot && !isSelected));

    if (piece) {
      const pieceEl = document.createElement('div');
      pieceEl.className = `janggi-piece ${piece.side} ${piece.type}`;
      pieceEl.textContent = janggiPieceText[piece.side][piece.type];
      cell.appendChild(pieceEl);
    }
  }
}

function alkkagiDisplayPosition(piece) {
  const orientation = boardEl.dataset.orientation || 'normal';
  if (orientation === 'flipped') {
    return {
      x: JANGGI_COLS - piece.x,
      y: JANGGI_ROWS - piece.y,
    };
  }

  return {
    x: piece.x,
    y: piece.y,
  };
}

function setAlkkagiPiecePosition(element, piece) {
  const display = alkkagiDisplayPosition(piece);
  const diameter = piece.radius ? piece.radius * 2 : (alkkagiPieceDiameters[piece.type] || 0.64);
  element.style.left = `calc(var(--board-padding) + var(--cell) * ${display.x})`;
  element.style.top = `calc(var(--board-padding) + var(--cell) * ${display.y})`;
  element.style.width = `calc(var(--cell) * ${diameter})`;
  element.style.height = `calc(var(--cell) * ${diameter})`;
}

function alkkagiTrailSkinForSide(state, side) {
  return state?.alkkagiTrailSkins?.[side]
    || state?.lastMove?.trailSkins?.[side]
    || null;
}

function createAlkkagiTrailElement(state, previousPiece, piece) {
  const trailSkin = alkkagiTrailSkinForSide(state, piece.side);
  if (!trailSkin?.effect) return null;

  const previousDisplay = alkkagiDisplayPosition(previousPiece);
  const currentDisplay = alkkagiDisplayPosition(piece);
  const dx = currentDisplay.x - previousDisplay.x;
  const dy = currentDisplay.y - previousDisplay.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.015) return null;

  const effect = trailSkin.effect;
  const centerX = (previousDisplay.x + currentDisplay.x) / 2;
  const centerY = (previousDisplay.y + currentDisplay.y) / 2;
  const trail = document.createElement('div');
  trail.className = `alkkagi-trail effect-${effect.style || 'fire'}`;
  trail.title = trailSkin.name || '';
  applyTrailEffectVariables(trail, effect);
  trail.style.left = `calc(var(--board-padding) + var(--cell) * ${centerX})`;
  trail.style.top = `calc(var(--board-padding) + var(--cell) * ${centerY})`;
  trail.style.width = `calc(var(--cell) * ${Math.max(0.18, distance * (Number(effect.length) || 1.1))})`;
  trail.style.height = `calc(var(--cell) * ${Math.max(0.045, 0.12 * (Number(effect.size) || 1))})`;
  trail.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(dy, dx)}rad)`;
  setTimeout(() => trail.remove(), 360);
  return trail;
}

function renderAlkkagiTrails(state, previousFrame, frame) {
  if (!previousFrame || !frame) return;

  const previousPieces = new Map((previousFrame.pieces || []).map((piece) => [piece.id, piece]));
  for (const piece of frame.pieces || []) {
    const previousPiece = previousPieces.get(piece.id);
    if (!previousPiece) continue;

    const trail = createAlkkagiTrailElement(state, previousPiece, piece);
    if (trail) boardEl.appendChild(trail);
  }
}

function createAlkkagiPieceElement(piece, extraClass = '', state = latestRoomState) {
  const pieceEl = document.createElement('div');
  pieceEl.className = `alkkagi-piece janggi-piece ${piece.side} ${piece.type} ${extraClass}`.trim();
  pieceEl.dataset.pieceId = piece.id;
  pieceEl.textContent = janggiPieceText[piece.side][piece.type];
  applyJanggiSkin(pieceEl, skinForJanggiPiece(state, piece));
  setAlkkagiPiecePosition(pieceEl, piece);
  return pieceEl;
}

function removeAlkkagiLivePieces() {
  for (const pieceEl of boardEl.querySelectorAll('.alkkagi-piece:not(.fading), .alkkagi-aim')) {
    pieceEl.remove();
  }
}

function clearAlkkagiTrails() {
  for (const trail of boardEl.querySelectorAll('.alkkagi-trail')) {
    trail.remove();
  }
}

function showAlkkagiFades(state) {
  const lastMove = state.lastMove;
  const shotKey = `${state.id}-${lastMove?.shotSeq || 0}`;
  if (!lastMove?.removedPieces?.length || shotKey === lastAlkkagiFadeSeq) return;

  lastAlkkagiFadeSeq = shotKey;
  for (const piece of lastMove.removedPieces) {
    const ghost = createAlkkagiPieceElement(piece, 'fading', state);
    boardEl.appendChild(ghost);
    setTimeout(() => ghost.remove(), 900);
  }
}

function renderAlkkagiPieces(state, pieces, { interactive = true } = {}) {
  const lastShotId = state.lastMove?.pieceId;
  const shouldShowLastShot = lastShotId && (myRole === 'spectator' || state.lastMove.color !== myRole);
  const targetOption = hasPendingAlkkagiChoice(state) ? pendingAlkkagiOption : null;
  const now = Date.now();

  for (const piece of pieces || []) {
    if (!piece.alive) continue;

    const pieceEl = createAlkkagiPieceElement(piece, '', state);
    pieceEl.classList.toggle('last', Boolean(shouldShowLastShot && piece.id === lastShotId));
    pieceEl.classList.toggle('option-target', Boolean(targetOption && isAlkkagiOptionTargetEligible(piece, targetOption)));
    pieceEl.classList.toggle('option-picked', Boolean(targetOption && pendingAlkkagiTargets.includes(piece.id)));
    pieceEl.classList.toggle('option-disabled', Boolean(targetOption && !isAlkkagiOptionTargetEligible(piece, targetOption)));
    const temporaryEffect = alkkagiTemporaryPieceEffects.get(piece.id);
    if (temporaryEffect && temporaryEffect.until > now) {
      pieceEl.classList.add(temporaryEffect.className);
    } else if (temporaryEffect) {
      alkkagiTemporaryPieceEffects.delete(piece.id);
    }
    if (interactive) {
      pieceEl.addEventListener('pointerdown', handleAlkkagiPointerDown);
      pieceEl.addEventListener('contextmenu', (event) => event.preventDefault());
    }
    boardEl.appendChild(pieceEl);
  }
}

function renderAlkkagiStatic(state) {
  boardEl.classList.remove('alkkagi-animating');
  removeAlkkagiLivePieces();
  clearAlkkagiTrails();
  renderAlkkagiPieces(state, state.alkkagiPieces, { interactive: true });

  showAlkkagiFades(state);
  renderAlkkagiAim();
}

function showAlkkagiFrameFades(frame, seenRemoved) {
  for (const piece of frame.removedPieces || []) {
    if (seenRemoved.has(piece.id)) continue;
    seenRemoved.add(piece.id);
    const ghost = createAlkkagiPieceElement(piece, 'fading', latestRoomState);
    boardEl.appendChild(ghost);
    setTimeout(() => ghost.remove(), 900);
  }
}

function showAlkkagiFrameEffects(frame, seenEffects) {
  for (const effect of frame.effects || []) {
    if (seenEffects.has(effect.id)) continue;
    seenEffects.add(effect.id);
    if (effect.type === 'illusion' && effect.pieceId) {
      alkkagiTemporaryPieceEffects.set(effect.pieceId, {
        className: 'illusion-active',
        until: Date.now() + 1000,
      });
    }
    const display = alkkagiDisplayPosition(effect);
    const callout = document.createElement('div');
    callout.className = 'alkkagi-effect-callout';
    callout.textContent = effect.text || '';
    callout.style.left = `calc(var(--board-padding) + var(--cell) * ${display.x})`;
    callout.style.top = `calc(var(--board-padding) + var(--cell) * ${display.y})`;
    boardEl.appendChild(callout);
    setTimeout(() => callout.remove(), 1000);
  }
}

function renderAlkkagiFrame(state, frame, seenRemoved, seenEffects, previousFrame) {
  removeAlkkagiLivePieces();
  renderAlkkagiTrails(state, previousFrame, frame);
  renderAlkkagiPieces(state, frame.pieces, { interactive: false });
  showAlkkagiFrameFades(frame, seenRemoved);
  showAlkkagiFrameEffects(frame, seenEffects);
}

function cancelAlkkagiAnimation() {
  if (!alkkagiAnimation) return;
  cancelAnimationFrame(alkkagiAnimation.frameRequest);
  boardEl.classList.remove('alkkagi-animating');
  clearAlkkagiTrails();
  alkkagiAnimation = null;
}

function startAlkkagiAnimation(state) {
  const frames = state.lastMove?.animationFrames || [];
  if (!frames.length) {
    renderAlkkagiStatic(state);
    return;
  }

  cancelAlkkagiAim();
  cancelAlkkagiAnimation();
  clearAlkkagiTrails();
  const shotKey = `${state.id}-${state.lastMove.shotSeq}`;
  lastAlkkagiAnimatedSeq = shotKey;
  lastAlkkagiFadeSeq = shotKey;
  boardEl.classList.add('alkkagi-animating');

  const seenRemoved = new Set();
  const seenEffects = new Set();
  const frameMs = 16;
  let frameIndex = 0;
  let lastTrailFrameIndex = -1;
  let lastTime = 0;

  const tick = (time) => {
    if (!alkkagiAnimation) return;
    if (!lastTime) lastTime = time;

    while (frameIndex < frames.length - 1 && time - lastTime >= frameMs) {
      frameIndex += 1;
      lastTime += frameMs;
    }

    const shouldDrawTrails = frameIndex > 0 && frameIndex !== lastTrailFrameIndex;
    renderAlkkagiFrame(
      state,
      frames[frameIndex],
      seenRemoved,
      seenEffects,
      shouldDrawTrails ? frames[frameIndex - 1] : null,
    );
    if (shouldDrawTrails) lastTrailFrameIndex = frameIndex;

    if (frameIndex >= frames.length - 1) {
      alkkagiAnimation = null;
      boardEl.classList.remove('alkkagi-animating');
      renderAlkkagiStatic(latestRoomState?.id === state.id ? latestRoomState : state);
      return;
    }

    alkkagiAnimation.frameRequest = requestAnimationFrame(tick);
  };

  alkkagiAnimation = {
    frameRequest: requestAnimationFrame(tick),
  };
}

function renderAlkkagiBoard(state) {
  const shotSeq = state.lastMove?.shotSeq;
  const frames = state.lastMove?.animationFrames;
  const shotKey = shotSeq ? `${state.id}-${shotSeq}` : null;

  if (!shotKey) {
    lastAlkkagiAnimatedSeq = null;
    lastAlkkagiFadeSeq = null;
  }

  if (shotKey && frames?.length && shotKey !== lastAlkkagiAnimatedSeq) {
    startAlkkagiAnimation(state);
    return;
  }

  if (!alkkagiAnimation) {
    renderAlkkagiStatic(state);
  }
}

function getAlkkagiAimLimit() {
  const cell = boardEl.querySelector('.alkkagi-cell')?.getBoundingClientRect().width || 54;
  return Math.max(80, Math.min(ALKKAGI_MAX_AIM_PX, cell * 2.8));
}

function updateAlkkagiAimFromPointer(event) {
  if (!alkkagiAim) return;

  const rawDx = alkkagiAim.centerX - event.clientX;
  const rawDy = alkkagiAim.centerY - event.clientY;
  const distance = Math.hypot(rawDx, rawDy);
  const clampedDistance = Math.min(distance, alkkagiAim.maxDistance);
  const directionX = distance > 0 ? rawDx / distance : 1;
  const directionY = distance > 0 ? rawDy / distance : 0;

  alkkagiAim.displayDx = directionX;
  alkkagiAim.displayDy = directionY;
  alkkagiAim.length = clampedDistance;
  alkkagiAim.power = clampedDistance / alkkagiAim.maxDistance;
  alkkagiAim.angle = Math.atan2(directionY, directionX);
}

function normalAlkkagiDirection() {
  const orientation = boardEl.dataset.orientation || 'normal';
  if (orientation === 'flipped') {
    return {
      x: -alkkagiAim.displayDx,
      y: -alkkagiAim.displayDy,
    };
  }

  return {
    x: alkkagiAim.displayDx,
    y: alkkagiAim.displayDy,
  };
}

function renderAlkkagiAim() {
  boardEl.querySelector('.alkkagi-aim')?.remove();
  if (!alkkagiAim || latestRoomState?.gameType !== 'alkkagi') return;

  const piece = (latestRoomState.alkkagiPieces || []).find((item) => item.id === alkkagiAim.pieceId && item.alive);
  if (!piece) return;

  const display = alkkagiDisplayPosition(piece);
  const aimEl = document.createElement('div');
  aimEl.className = 'alkkagi-aim';
  aimEl.style.left = `calc(var(--board-padding) + var(--cell) * ${display.x})`;
  aimEl.style.top = `calc(var(--board-padding) + var(--cell) * ${display.y})`;
  aimEl.style.width = `${Math.max(18, alkkagiAim.length * 2)}px`;
  aimEl.style.transform = `translate(-50%, -50%) rotate(${alkkagiAim.angle}rad)`;
  boardEl.appendChild(aimEl);
}

function removeAlkkagiAimListeners() {
  window.removeEventListener('pointermove', handleAlkkagiPointerMove);
  window.removeEventListener('pointerup', handleAlkkagiPointerUp);
  window.removeEventListener('pointercancel', cancelAlkkagiAim);
  window.removeEventListener('pointerdown', handleAlkkagiWindowPointerDown);
  window.removeEventListener('contextmenu', handleAlkkagiContextMenu);
}

function cancelAlkkagiAim() {
  if (!alkkagiAim) return;
  alkkagiAim = null;
  removeAlkkagiAimListeners();
  boardEl.querySelector('.alkkagi-aim')?.remove();
}

function finishAlkkagiAim() {
  if (!alkkagiAim) return;

  if (alkkagiAim.power >= 0.04) {
    socket.emit('shootAlkkagi', {
      pieceId: alkkagiAim.pieceId,
      direction: normalAlkkagiDirection(),
      power: alkkagiAim.power,
    });
  }

  cancelAlkkagiAim();
}

function handleAlkkagiPointerMove(event) {
  if (!alkkagiAim) return;
  event.preventDefault();
  updateAlkkagiAimFromPointer(event);
  renderAlkkagiAim();
}

function handleAlkkagiPointerUp(event) {
  if (!alkkagiAim || event.button !== 0) return;
  event.preventDefault();
  finishAlkkagiAim();
}

function handleAlkkagiWindowPointerDown(event) {
  if (alkkagiAim && event.button === 2) {
    event.preventDefault();
    cancelAlkkagiAim();
  }
}

function handleAlkkagiContextMenu(event) {
  if (!alkkagiAim) return;
  event.preventDefault();
  cancelAlkkagiAim();
}

function handleAlkkagiPointerDown(event) {
  const state = latestRoomState;

  if (event.button === 2) {
    event.preventDefault();
    cancelAlkkagiAim();
    cancelPendingAlkkagiOption();
    return;
  }

  if (event.button !== 0) return;

  if (!state || state.gameType !== 'alkkagi') return;

  const pieceId = event.currentTarget.dataset.pieceId;
  const piece = (state.alkkagiPieces || []).find((item) => item.id === pieceId && item.alive);
  if (pendingAlkkagiOption) {
    event.preventDefault();
    if (isAlkkagiOptionTargetEligible(piece, pendingAlkkagiOption)) {
      const targetCount = alkkagiOptionTargetCount(pendingAlkkagiOption);
      if (targetCount <= 1) {
        chooseAlkkagiOption(pendingAlkkagiOption, [pieceId]);
        return;
      }

      if (pendingAlkkagiTargets.includes(pieceId)) {
        pendingAlkkagiTargets = pendingAlkkagiTargets.filter((id) => id !== pieceId);
      } else {
        pendingAlkkagiTargets = [...pendingAlkkagiTargets, pieceId].slice(0, targetCount);
      }

      if (pendingAlkkagiTargets.length >= targetCount) {
        chooseAlkkagiOption(pendingAlkkagiOption, pendingAlkkagiTargets);
        return;
      }

      renderAlkkagiBoard(state);
      renderAlkkagiChoices(state);
      gameMessageEl.textContent = `이번턴에 선공이 바뀝니다. ${alkkagiTargetInstruction(pendingAlkkagiOption)} (${pendingAlkkagiTargets.length}/${targetCount})`;
    } else {
      gameMessageEl.textContent = `이번턴에 선공이 바뀝니다. ${alkkagiTargetInstruction(pendingAlkkagiOption)}`;
    }
    return;
  }

  const canShoot = state.status === 'playing'
    && !alkkagiAnimation
    && !hasAlkkagiChoicePhase(state)
    && myRole === state.turn
    && (myRole === 'black' || myRole === 'white')
    && piece?.side === myRole;
  if (!canShoot) return;

  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  alkkagiAim = {
    pieceId,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    displayDx: 1,
    displayDy: 0,
    length: 0,
    power: 0,
    angle: 0,
    maxDistance: getAlkkagiAimLimit(),
  };
  updateAlkkagiAimFromPointer(event);
  renderAlkkagiAim();

  window.addEventListener('pointermove', handleAlkkagiPointerMove);
  window.addEventListener('pointerup', handleAlkkagiPointerUp);
  window.addEventListener('pointercancel', cancelAlkkagiAim);
  window.addEventListener('pointerdown', handleAlkkagiWindowPointerDown);
  window.addEventListener('contextmenu', handleAlkkagiContextMenu);
}

function appendChessCoordinates(cell, row, col) {
  const displayRow = Number(cell.dataset.displayRow);
  const displayCol = Number(cell.dataset.displayCol);

  if (displayCol === 0) {
    const rank = document.createElement('span');
    rank.className = 'chess-coordinate rank';
    rank.textContent = String(CHESS_SIZE - row);
    cell.appendChild(rank);
  }

  if (displayRow === CHESS_SIZE - 1) {
    const file = document.createElement('span');
    file.className = 'chess-coordinate file';
    file.textContent = chessFiles[col];
    cell.appendChild(file);
  }
}

function renderChessBoard(state) {
  const lastMoveKey = state.lastMove?.to ? `${state.lastMove.to.row},${state.lastMove.to.col}` : null;
  const selectedPiece = selectedChessPiece
    ? state.board[selectedChessPiece.row]?.[selectedChessPiece.col]
    : null;
  const canShowMoveHints = state.status === 'playing'
    && myRole === state.turn
    && selectedPiece?.side === myRole;
  const legalMoves = canShowMoveHints
    ? getLegalChessMoves(state, selectedChessPiece.row, selectedChessPiece.col, myRole)
    : new Map();
  const checkedSide = state.checkAlert?.side;

  for (const cell of boardEl.querySelectorAll('.chess-cell')) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const piece = state.board[row][col];
    const cellKey = `${row},${col}`;
    const hint = legalMoves.get(cellKey);
    const isSelected = Boolean(canShowMoveHints && selectedChessPiece && selectedChessPiece.row === row && selectedChessPiece.col === col);
    const isCheckedKing = Boolean(piece?.type === 'king' && piece.side === checkedSide);

    cell.innerHTML = '';
    appendChessCoordinates(cell, row, col);
    cell.classList.toggle('last', Boolean(lastMoveKey && lastMoveKey === cellKey));
    cell.classList.toggle('selected', isSelected);
    cell.classList.toggle('move-hint', hint === 'move');
    cell.classList.toggle('capture-hint', hint === 'capture');
    cell.classList.toggle('in-check', isCheckedKing);

    if (piece) {
      const pieceEl = document.createElement('div');
      pieceEl.className = `chess-piece ${piece.side} ${piece.type}`;
      pieceEl.textContent = chessPieceText[piece.side][piece.type];
      cell.appendChild(pieceEl);
    }
  }
}

function isMySetupPiece(piece) {
  return piece?.side === myRole && (piece.type === 'ma' || piece.type === 'sang');
}

function handleJanggiCellClick(row, col) {
  const state = latestRoomState;
  if (!state || state.gameType !== 'janggi') return;

  const piece = state.board[row][col];
  const isMyPiece = piece?.side === myRole;
  const canMove = state.status === 'playing' && myRole === state.turn && (myRole === 'black' || myRole === 'white');

  if (state.status === 'waiting' && (myRole === 'black' || myRole === 'white')) {
    if (state.ready?.[myRole]) {
      selectedJanggiPiece = null;
      renderJanggiBoard(state);
      return;
    }

    if (!isMySetupPiece(piece)) {
      selectedJanggiPiece = null;
      renderJanggiBoard(state);
      return;
    }

    if (selectedJanggiPiece) {
      const selectedPiece = state.board[selectedJanggiPiece.row][selectedJanggiPiece.col];
      if (isMySetupPiece(selectedPiece) && (selectedJanggiPiece.row !== row || selectedJanggiPiece.col !== col)) {
        socket.emit('swapSetupPieces', {
          first: selectedJanggiPiece,
          second: { row, col },
        });
        selectedJanggiPiece = null;
        return;
      }
    }

    selectedJanggiPiece = { row, col };
    renderJanggiBoard(state);
    return;
  }

  if (!canMove) return;

  if (isMyPiece) {
    selectedJanggiPiece = { row, col };
    renderJanggiBoard(state);
    return;
  }

  if (!selectedJanggiPiece) return;

  socket.emit('moveJanggi', {
    from: selectedJanggiPiece,
    to: { row, col },
  });
  selectedJanggiPiece = null;
}

function chessPromotionChoice() {
  const answer = window.prompt('승진할 말을 선택하세요: 퀸, 룩, 비숍, 나이트', '퀸');
  if (answer === null) return null;

  const value = answer.trim().toLowerCase();
  if (value === 'rook' || value === 'r' || value === '룩') return 'rook';
  if (value === 'bishop' || value === 'b' || value === '비숍') return 'bishop';
  if (value === 'knight' || value === 'n' || value === '나이트') return 'knight';
  return 'queen';
}

function handleChessCellClick(row, col) {
  const state = latestRoomState;
  if (!state || state.gameType !== 'chess') return;

  const piece = state.board[row][col];
  const isMyPiece = piece?.side === myRole;
  const canMove = state.status === 'playing' && myRole === state.turn && (myRole === 'black' || myRole === 'white');

  if (!canMove) return;

  if (isMyPiece) {
    selectedChessPiece = { row, col };
    renderChessBoard(state);
    return;
  }

  if (!selectedChessPiece) return;

  const selectedPiece = state.board[selectedChessPiece.row]?.[selectedChessPiece.col];
  if (!selectedPiece || selectedPiece.side !== myRole) {
    selectedChessPiece = null;
    renderChessBoard(state);
    return;
  }

  const legalMoves = getLegalChessMoves(state, selectedChessPiece.row, selectedChessPiece.col, myRole);
  if (!legalMoves.has(`${row},${col}`)) {
    selectedChessPiece = null;
    renderChessBoard(state);
    return;
  }

  let promotion = 'queen';
  if (selectedPiece.type === 'pawn' && (row === 0 || row === CHESS_SIZE - 1)) {
    promotion = chessPromotionChoice();
    if (!promotion) return;
  }

  socket.emit('moveChess', {
    from: selectedChessPiece,
    to: { row, col },
    promotion,
  });
  selectedChessPiece = null;
}

function renderLobby(state) {
  lobbyInfo.textContent = `접속 ${state.userCount}명 · 방 ${state.rooms.length}개`;
  roomList.innerHTML = '';

  if (!state.rooms.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-text';
    empty.textContent = '아직 만들어진 방이 없습니다.';
    roomList.appendChild(empty);
    return;
  }

  for (const room of state.rooms) {
    const card = document.createElement('article');
    card.className = 'room-card';

    const title = document.createElement('h3');
    title.className = 'fit-text';
    title.textContent = room.name;

    const meta = document.createElement('p');
    meta.textContent = `${gameTypeToKorean(room.gameType)} · ${statusToKorean(room.status)} · 플레이어 ${room.playerCount}/2 · 관전자 ${room.spectatorCount}`;

    const players = document.createElement('p');
    players.className = 'room-players fit-text';
    players.textContent = `${sideLabel('black', room.gameType)} ${room.blackName || '비어 있음'} / ${sideLabel('white', room.gameType)} ${room.whiteName || '비어 있음'}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fit-text';
    button.textContent = '입장';
    button.addEventListener('click', () => {
      socket.emit('enterRoom', { roomId: room.id });
    });

    card.append(title, meta, players, button);
    roomList.appendChild(card);
  }

  fitAllText();
}

function isAlkkagiTrailSkin(skin) {
  return skin?.target === 'alkkagi-trail';
}

function skinKindLabel(skin) {
  return isAlkkagiTrailSkin(skin) ? '알까기 이동 효과' : '알까기 말 스킨';
}

function skinEquipSlotLabel(slot) {
  if (slot === ALKKAGI_TRAIL_SLOT) return '이동 효과';
  return janggiSkinPieceTypes.find(([pieceType]) => pieceType === slot)?.[1] || slot;
}

function equippedLabelsForSkin(skin) {
  return (skin.equippedTypes || []).map(skinEquipSlotLabel).join(', ');
}

function applyTrailEffectVariables(element, effect = {}) {
  element.style.setProperty('--effect-a', effect.colorA || '#ff4a1c');
  element.style.setProperty('--effect-b', effect.colorB || '#ffd15a');
  element.style.setProperty('--trail-length', `${Number(effect.length) || 1.1}`);
  element.style.setProperty('--trail-size', `${Number(effect.size) || 1}`);
  element.style.setProperty('--trail-opacity', `${Number(effect.opacity) || 0.78}`);
}

function createSkinPreview(skin) {
  if (!isAlkkagiTrailSkin(skin)) {
    const image = document.createElement('img');
    image.src = skin.imageUrl;
    image.alt = `${skin.name} 스킨`;
    return image;
  }

  const effect = skin.effect || {};
  const preview = document.createElement('div');
  preview.className = `skin-effect-preview effect-${effect.style || 'fire'}`;
  preview.setAttribute('role', 'img');
  preview.setAttribute('aria-label', `${skin.name} 효과 미리보기`);
  applyTrailEffectVariables(preview, effect);

  const line = document.createElement('span');
  line.className = 'skin-effect-preview-line';
  preview.appendChild(line);

  const label = document.createElement('strong');
  label.textContent = alkkagiTrailStyleLabels[effect.style] || '효과';
  preview.appendChild(label);
  return preview;
}

function renderShop(state = latestShopState) {
  return;

  if (!skinShopGrid || !shopAdminPanel) return;

  const shopState = state || { skins: [], isAdmin: currentIsAdmin, gold: currentGold };
  shopAdminPanel.hidden = !shopState.isAdmin;
  const visibleCount = shopState.skins?.length || 0;
  const ownedCount = (shopState.skins || []).filter((skin) => skin.owned).length;
  shopInfo.textContent = `보유 골드 ${shopState.gold || 0}G · 판매 목록 ${visibleCount}개 · 보유 ${ownedCount}개`;
  skinShopGrid.innerHTML = '';

  if (!shopState.skins?.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-text';
    empty.textContent = '아직 등록된 스킨이 없습니다.';
    skinShopGrid.appendChild(empty);
    return;
  }

  for (const skin of shopState.skins) {
    const card = document.createElement('article');
    card.className = 'skin-card';

    const preview = createSkinPreview(skin);
    const isTrail = isAlkkagiTrailSkin(skin);
    const isTrailEquipped = (skin.equippedTypes || []).includes(ALKKAGI_TRAIL_SLOT);

    const title = document.createElement('h3');
    title.className = 'fit-text';
    title.textContent = skin.name;

    const meta = document.createElement('p');
    const equippedLabels = equippedLabelsForSkin(skin);
    meta.textContent = [
      `${skinKindLabel(skin)} · ${skin.price}G`,
      skin.active ? '판매중' : '판매 중지됨',
      skin.owned ? '보관함' : '',
      equippedLabels ? `장착: ${equippedLabels}` : '',
    ].filter(Boolean).join(' · ');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fit-text';
    button.textContent = skin.owned
      ? (isTrail ? (isTrailEquipped ? '효과 해제' : '효과 장착') : '장착 변경')
      : (!skin.active ? '판매 중지' : (currentGold < skin.price ? '골드 부족' : '구매'));
    button.disabled = (!skin.owned && (!skin.active || currentGold < skin.price));
    button.addEventListener('click', () => {
      if (isTrail) {
        socket.emit('buySkin', { skinId: skin.id, pieceType: ALKKAGI_TRAIL_SLOT });
        return;
      }
      pendingSkinChoiceId = pendingSkinChoiceId === skin.id ? null : skin.id;
      renderShop();
    });

    card.append(preview, title, meta, button);

    if (pendingSkinChoiceId === skin.id && !isTrail) {
      const picker = document.createElement('div');
      picker.className = 'skin-piece-picker';
      for (const [pieceType, label] of janggiSkinPieceTypes) {
        const isEquipped = (skin.equippedTypes || []).includes(pieceType);
        const pieceButton = document.createElement('button');
        pieceButton.type = 'button';
        pieceButton.classList.toggle('equipped', isEquipped);
        pieceButton.textContent = isEquipped ? `${label} 해제` : `${label} 장착`;
        pieceButton.title = isEquipped ? '한 번 더 누르면 이 말에서 장착 해제됩니다.' : '이 말에 스킨을 장착합니다.';
        pieceButton.addEventListener('click', () => {
          pendingSkinChoiceId = null;
          socket.emit('buySkin', { skinId: skin.id, pieceType });
        });
        picker.appendChild(pieceButton);
      }
      card.appendChild(picker);
    }

    if (shopState.isAdmin) {
      const adminButton = document.createElement('button');
      adminButton.type = 'button';
      adminButton.className = 'ghost fit-text';
      adminButton.textContent = skin.active ? '판매 중지하기' : '판매 시작';
      adminButton.addEventListener('click', () => {
        socket.emit('toggleSkinSale', { skinId: skin.id, active: !skin.active });
      });
      card.appendChild(adminButton);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost danger fit-text';
      deleteButton.textContent = '완전 삭제';
      deleteButton.addEventListener('click', () => {
        const confirmed = window.confirm(`${skin.name} 스킨을 상점, 모든 보관함, 모든 장착 상태에서 완전히 삭제할까요?`);
        if (!confirmed) return;
        socket.emit('removeSkin', { skinId: skin.id });
      });
      card.appendChild(deleteButton);
    }

    skinShopGrid.appendChild(card);
  }

  fitAllText();
}

function renderInventory(state = latestInventoryState) {
  if (!inventoryGrid || !inventoryInfo) return;

  const inventoryState = state || { skins: [] };
  const canCustomize = Boolean(currentNickname && currentNickname !== '손님');
  if (shopAdminPanel) shopAdminPanel.hidden = !canCustomize;
  inventoryInfo.textContent = canCustomize
    ? `보유 스킨 ${inventoryState.skins?.length || 0}개 · 직접 만들고 장착하세요.`
    : '닉네임을 설정하면 개인 스킨을 만들고 장착할 수 있습니다.';
  inventoryGrid.innerHTML = '';

  if (!inventoryState.skins?.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-text';
    empty.textContent = '아직 보유한 스킨이 없습니다.';
    inventoryGrid.appendChild(empty);
    return;
  }

  for (const skin of inventoryState.skins) {
    const card = document.createElement('article');
    card.className = 'skin-card';

    const preview = createSkinPreview(skin);
    const isTrail = isAlkkagiTrailSkin(skin);
    const isTrailEquipped = (skin.equippedTypes || []).includes(ALKKAGI_TRAIL_SLOT);

    const title = document.createElement('h3');
    title.className = 'fit-text';
    title.textContent = skin.name;

    const equippedLabels = equippedLabelsForSkin(skin);
    const meta = document.createElement('p');
    meta.textContent = [
      skinKindLabel(skin),
      equippedLabels ? `장착: ${equippedLabels}` : '미장착',
    ].join(' · ');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fit-text';
    button.textContent = isTrail ? (isTrailEquipped ? '효과 해제' : '효과 장착') : '장착 변경';
    button.addEventListener('click', () => {
      if (isTrail) {
        socket.emit('equipSkin', { skinId: skin.id, pieceType: ALKKAGI_TRAIL_SLOT });
        return;
      }
      pendingInventorySkinChoiceId = pendingInventorySkinChoiceId === skin.id ? null : skin.id;
      renderInventory();
    });

    card.append(preview, title, meta, button);

    if (pendingInventorySkinChoiceId === skin.id && !isTrail) {
      const picker = document.createElement('div');
      picker.className = 'skin-piece-picker';
      for (const [pieceType, label] of janggiSkinPieceTypes) {
        const isEquipped = (skin.equippedTypes || []).includes(pieceType);
        const pieceButton = document.createElement('button');
        pieceButton.type = 'button';
        pieceButton.classList.toggle('equipped', isEquipped);
        pieceButton.textContent = isEquipped ? `${label} 해제` : `${label} 장착`;
        pieceButton.title = isEquipped ? '한 번 더 누르면 이 말에서 장착 해제됩니다.' : '이 말에 스킨을 장착합니다.';
        pieceButton.addEventListener('click', () => {
          socket.emit('equipSkin', { skinId: skin.id, pieceType });
        });
        picker.appendChild(pieceButton);
      }
      card.appendChild(picker);
    }

    const unequipButton = document.createElement('button');
    unequipButton.type = 'button';
    unequipButton.className = 'ghost fit-text';
    unequipButton.textContent = isTrail ? '효과 장착 해제' : '이 스킨 전체 장착 해제';
    unequipButton.disabled = !(skin.equippedTypes || []).length;
    unequipButton.addEventListener('click', () => {
      socket.emit('unequipSkin', { skinId: skin.id });
    });
    card.appendChild(unequipButton);

    inventoryGrid.appendChild(card);
  }

  fitAllText();
}

function updateRoleCard() {
  myRoleCard.classList.remove('role-black', 'role-white', 'role-spectator');
  if (myRole === 'black') myRoleCard.classList.add('role-black');
  if (myRole === 'white') myRoleCard.classList.add('role-white');
  if (myRole === 'spectator') myRoleCard.classList.add('role-spectator');
  myRoleEl.textContent = sideLabel(myRole);
}

function playerNameForRole(state, role) {
  return state.players?.[role]?.name || sideLabel(role, state.gameType);
}

function winnerMessageForState(state) {
  if (state.winner === 'draw') return '게임이 무승부로 끝났습니다.';
  return `${playerNameForRole(state, state.winner)}의 승리!`;
}

function updateStatus(state) {
  const blackName = state.players.black?.name || '비어 있음';
  const whiteName = state.players.white?.name || '비어 있음';

  gameView.classList.toggle('game-omok', state.gameType === 'omok');
  gameView.classList.toggle('game-janggi', state.gameType === 'janggi');
  gameView.classList.toggle('game-chess', state.gameType === 'chess');
  gameView.classList.toggle('game-alkkagi', state.gameType === 'alkkagi');
  roomTitle.textContent = `${state.name} · ${gameTypeToKorean(state.gameType)}`;
  const blackReady = Boolean(state.ready?.black);
  const whiteReady = Boolean(state.ready?.white);
  blackSeatLabel.textContent = `${sideLabel('black', state.gameType)}${blackReady ? ' · 준비' : ''}`;
  whiteSeatLabel.textContent = `${sideLabel('white', state.gameType)}${whiteReady ? ' · 준비' : ''}`;
  blackPlayerEl.textContent = blackName;
  whitePlayerEl.textContent = whiteName;
  updateRoleCard();
  updateGameTypePanel(state);
  const ownAlkkagiChoicePending = hasPendingAlkkagiChoice(state);
  const alkkagiChoicePhaseActive = hasAlkkagiChoicePhase(state);

  if (state.winner === 'draw') {
    turnTextEl.textContent = '무승부';
  } else if (state.winner) {
    turnTextEl.textContent = `${playerNameForRole(state, state.winner)} 승리`;
  } else if (alkkagiChoicePhaseActive) {
    turnTextEl.textContent = `${state.alkkagiChoicePhase.round}턴 보상 선택`;
  } else if (state.status === 'playing') {
    turnTextEl.textContent = `${sideLabel(state.turn, state.gameType)} 차례`;
  } else if (state.gameType === 'janggi' && state.players.black && state.players.white) {
    turnTextEl.textContent = `초 ${blackReady ? '준비' : '대기'} / 한 ${whiteReady ? '준비' : '대기'}`;
  } else {
    turnTextEl.textContent = statusToKorean(state.status);
  }

  const isPlayer = myRole === 'black' || myRole === 'white';
  const hasTwoPlayers = Boolean(state.players.black && state.players.white);
  startGameBtn.hidden = state.status !== 'waiting';
  startGameBtn.textContent = state.gameType === 'janggi' && state.ready?.[myRole] ? '준비 취소' : (state.gameType === 'janggi' ? '준비' : '게임시작');
  startGameBtn.disabled = !isPlayer || !hasTwoPlayers || !state.gameType;
  newGameBtn.hidden = state.status !== 'finished';
  newGameBtn.disabled = !isPlayer;
  passTurnBtn.hidden = !(state.gameType === 'janggi' && state.status === 'playing');
  passTurnBtn.disabled = !isPlayer || myRole !== state.turn;
  resignBtn.hidden = state.status !== 'playing';
  resignBtn.disabled = !isPlayer;

  updateSeatButtons(state);
  updateSwapPanel(state, isPlayer);
  renderSpectators(state);
  maybeShowCheckAlert(state);
  renderAlkkagiChoices(state);

  if (!state.gameType) {
    gameMessageEl.textContent = '오목, 장기, 체스 또는 알까기를 선택하세요.';
  } else if (state.status === 'finished' && state.winner === 'draw') {
    gameMessageEl.textContent = '게임이 무승부로 끝났습니다.';
  } else if (state.status === 'finished' && state.winner) {
    gameMessageEl.textContent = winnerMessageForState(state);
  } else if (state.status === 'waiting' && !hasTwoPlayers) {
    gameMessageEl.textContent = '플레이어 두 명이 모이면 게임을 시작할 수 있습니다.';
  } else if (state.status === 'waiting' && state.gameType === 'janggi') {
    gameMessageEl.textContent = '마/상 차림을 정한 뒤 두 플레이어가 준비하면 시작합니다.';
  } else if (state.status === 'waiting' && state.gameType === 'alkkagi') {
    gameMessageEl.textContent = '게임시작 버튼을 누르면 장기 차림 그대로 알까기를 시작합니다.';
  } else if (state.status === 'waiting') {
    gameMessageEl.textContent = '게임시작 버튼을 눌러 시작하세요.';
  } else if (state.gameType === 'alkkagi' && ownAlkkagiChoicePending && pendingAlkkagiOption) {
    gameMessageEl.textContent = `이번턴에 선공이 바뀝니다. ${alkkagiTargetInstruction(pendingAlkkagiOption)}`;
  } else if (state.gameType === 'alkkagi' && ownAlkkagiChoicePending) {
    gameMessageEl.textContent = '이번턴에 선공이 바뀝니다. 보상 선택지를 고르세요.';
  } else if (state.gameType === 'alkkagi' && alkkagiChoicePhaseActive) {
    gameMessageEl.textContent = '이번턴에 선공이 바뀝니다. 상대의 보상 선택을 기다리는 중입니다.';
  } else if (state.gameType === 'alkkagi' && myRole === state.turn) {
    gameMessageEl.textContent = '당신의 차례입니다. 말을 누른 채 뒤로 당겨 힘을 정하세요.';
  } else if (myRole === state.turn) {
    gameMessageEl.textContent = '당신의 차례입니다.';
  } else if (myRole === 'spectator') {
    gameMessageEl.textContent = '관전 중입니다.';
  } else {
    gameMessageEl.textContent = '상대 차례입니다.';
  }

  fitAllText();
}

function updateGameTypePanel(state) {
  const canChange = state.status !== 'playing'
    && state.moveCount === 0
    && !state.ready?.black
    && !state.ready?.white
    && (myRole === 'black' || myRole === 'white');
  for (const button of [omokTypeBtn, janggiTypeBtn, chessTypeBtn, alkkagiTypeBtn]) {
    const selected = button.dataset.gameType === state.gameType;
    button.classList.toggle('selected', selected);
    button.disabled = !canChange || selected;
  }
}

function maybeShowCheckAlert(state) {
  if ((state.gameType !== 'janggi' && state.gameType !== 'chess') || !state.checkAlert) return;

  const alertKey = `${state.gameType}-${state.checkAlert.id}`;
  if (alertKey === lastCheckAlertId) return;

  lastCheckAlertId = alertKey;
  checkAlertEl.textContent = state.gameType === 'chess' ? '체크!' : '장군이요!';
  checkAlertEl.hidden = false;
  clearTimeout(checkAlertTimer);
  checkAlertTimer = setTimeout(() => {
    checkAlertEl.hidden = true;
  }, 1000);
}

function updateSeatButtons(state) {
  updateSeatButton(blackSeatBtn, 'black', state.players.black);
  updateSeatButton(whiteSeatBtn, 'white', state.players.white);
}

function updateSeatButton(button, seat, player) {
  const isOwnSeat = myRole === seat;
  const occupiedByOther = Boolean(player) && !isOwnSeat;
  const canChoose = stateCanMoveSeat(latestRoomState) && !occupiedByOther;
  const isReady = Boolean(latestRoomState?.ready?.[seat]);

  button.disabled = !canChoose;
  button.classList.toggle('selected', isOwnSeat);
  button.classList.toggle('empty', !player);
  button.classList.toggle('occupied', occupiedByOther);
  button.classList.toggle('ready', isReady);
  button.title = stateCanMoveSeat(latestRoomState)
    ? `${sideLabel(seat)} 자리로 이동`
    : '게임 진행 중에는 자리를 옮길 수 없습니다.';
}

function stateCanMoveSeat(state) {
  return Boolean(state && state.status !== 'playing');
}

function updateSwapPanel(state, isPlayer) {
  const canSwap = isPlayer
    && state.gameType
    && state.players.black
    && state.players.white
    && state.status === 'waiting'
    && state.moveCount === 0
    && !state.ready?.black
    && !state.ready?.white;
  const noun = (state.gameType === 'janggi' || state.gameType === 'alkkagi')
    ? '진영'
    : (state.gameType === 'chess' ? '말 색' : '돌 색');
  swapPanel.hidden = !canSwap;
  swapRequestBtn.classList.remove('accept');

  if (!canSwap) {
    swapHint.textContent = '';
    return;
  }

  const request = state.swapRequest;
  if (!request) {
    swapRequestBtn.textContent = `${noun} 바꾸기 요청`;
    swapHint.textContent = `상대가 수락하면 서로 ${noun}이 바뀝니다.`;
    return;
  }

  if (request.requesterRole === myRole) {
    swapRequestBtn.textContent = '요청 취소';
    swapHint.textContent = '상대의 수락을 기다리는 중입니다.';
    return;
  }

  swapRequestBtn.textContent = `${noun} 바꾸기 수락`;
  swapRequestBtn.classList.add('accept');
  swapHint.textContent = `${request.requesterName}님의 요청입니다.`;
}

function renderSpectators(state) {
  spectatorList.innerHTML = '';
  joinSpectatorBtn.disabled = myRole === 'spectator' || state.status === 'playing';

  if (!state.spectators.length) {
    const item = document.createElement('li');
    item.textContent = '관전자 없음';
    spectatorList.appendChild(item);
    return;
  }

  for (const spectator of state.spectators) {
    const item = document.createElement('li');
    item.textContent = spectator.name;
    spectatorList.appendChild(item);
  }
}

function renderChatMessage(container, message) {
  const item = document.createElement('div');
  item.className = `chat-message ${message.role || 'lobby'}`;

  const meta = document.createElement('div');
  meta.className = 'chat-meta';
  meta.textContent = `${message.author || '손님'} · ${sideLabel(message.role)}`;

  const text = document.createElement('div');
  text.className = 'chat-text';
  text.textContent = message.text || '';

  item.append(meta, text);
  container.appendChild(item);
  container.scrollTop = container.scrollHeight;
}

function renderChatHistory(container, messages) {
  container.innerHTML = '';
  for (const message of messages || []) {
    renderChatMessage(container, message);
  }
}

createRoomBtn.addEventListener('click', () => {
  socket.emit('createRoom');
});

shopOpenBtn.addEventListener('click', () => {
  showShop();
});

inventoryOpenBtn.addEventListener('click', () => {
  showInventory();
});

shopBackBtn.addEventListener('click', () => {
  leaveStoreLikeView();
});

inventoryBackBtn.addEventListener('click', () => {
  leaveStoreLikeView();
});

skinCreateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!currentNickname) {
    inventoryInfo.textContent = '닉네임을 먼저 설정해야 스킨을 만들 수 있습니다.';
    return;
  }

  const file = skinImageInput.files?.[0];
  if (!file) {
    inventoryInfo.textContent = '등록할 이미지를 선택하세요.';
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    socket.emit('createJanggiSkin', {
      name: skinNameInput.value,
      price: 0,
      imageData: reader.result,
    });
  });
  reader.addEventListener('error', () => {
    inventoryInfo.textContent = '이미지를 읽지 못했습니다.';
  });
  reader.readAsDataURL(file);
});

effectCreateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!currentNickname) {
    inventoryInfo.textContent = '닉네임을 먼저 설정해야 효과 스킨을 만들 수 있습니다.';
    return;
  }

  socket.emit('createAlkkagiTrailSkin', {
    name: effectNameInput.value,
    price: 0,
    effect: {
      style: effectStyleInput.value,
      colorA: effectColorAInput.value,
      colorB: effectColorBInput.value,
      length: effectLengthInput.value,
      size: effectSizeInput.value,
    },
  });
});

leaveRoomBtn.addEventListener('click', () => {
  socket.emit('leaveRoom');
});

for (const button of [omokTypeBtn, janggiTypeBtn, chessTypeBtn, alkkagiTypeBtn]) {
  button.addEventListener('click', () => {
    socket.emit('setGameType', { gameType: button.dataset.gameType });
  });
}

startGameBtn.addEventListener('click', () => {
  if (latestRoomState?.gameType === 'janggi') {
    socket.emit('toggleReady');
    return;
  }

  socket.emit('startGame');
});

newGameBtn.addEventListener('click', () => {
  socket.emit('newGame');
});

passTurnBtn.addEventListener('click', () => {
  socket.emit('passJanggiTurn');
});

resignBtn.addEventListener('click', () => {
  socket.emit('resignGame');
});

joinSpectatorBtn.addEventListener('click', () => {
  socket.emit('joinAsSpectator');
});

blackSeatBtn.addEventListener('click', () => {
  socket.emit('chooseSeat', { seat: 'black' });
});

whiteSeatBtn.addEventListener('click', () => {
  socket.emit('chooseSeat', { seat: 'white' });
});

swapRequestBtn.addEventListener('click', () => {
  const request = latestRoomState?.swapRequest;
  if (request && request.requesterRole !== myRole) {
    socket.emit('acceptSwapColors');
    return;
  }

  socket.emit('requestSwapColors');
});

editNicknameBtn.addEventListener('click', () => {
  openNicknameModal(false);
});

cancelNicknameBtn.addEventListener('click', () => {
  if (nicknameModal.dataset.required === 'true') return;
  closeNicknameModal();
});

nicknameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveNickname(nicknameInput.value);
});

nicknameInput.addEventListener('input', () => {
  nicknameInput.setCustomValidity('');
});

lobbyChatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = lobbyChatInput.value.trim();
  if (!text) return;

  socket.emit('sendLobbyChat', { text });
  lobbyChatInput.value = '';
});

roomChatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = roomChatInput.value.trim();
  if (!text) return;

  socket.emit('sendRoomChat', { text });
  roomChatInput.value = '';
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.defaultPrevented || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (!nicknameModal.hidden) return;

  const activeElement = document.activeElement;
  const isTextInput = activeElement?.tagName === 'INPUT'
    || activeElement?.tagName === 'TEXTAREA'
    || activeElement?.isContentEditable;

  if (isTextInput) return;

  event.preventDefault();
  if (activeView === 'game') {
    roomChatInput.focus();
  } else {
    lobbyChatInput.focus();
  }
});

socket.on('connect', () => {
  const savedNickname = localStorage.getItem(NICKNAME_KEY) || '';
  if (savedNickname) {
    pendingNickname = savedNickname;
    socket.emit('setNickname', { name: savedNickname });
    nicknameText.textContent = savedNickname;
  } else {
    openNicknameModal(true);
  }
});

socket.on('profile', ({ name, accepted, isAdmin } = {}) => {
  currentGold = 0;
  currentIsAdmin = Boolean(isAdmin);
  if (latestShopState) {
    latestShopState.gold = currentGold;
    latestShopState.isAdmin = currentIsAdmin;
    renderShop();
  }
  if (latestInventoryState) {
    latestInventoryState.gold = currentGold;
    renderInventory();
  }

  if (accepted && name) {
    currentNickname = name;
    pendingNickname = '';
    localStorage.setItem(NICKNAME_KEY, name);
    nicknameText.textContent = name;
    closeNicknameModal();
    if (latestInventoryState) renderInventory();
    fitAllText();
    return;
  }

  if (!currentNickname && !pendingNickname && name) {
    nicknameText.textContent = name;
    fitAllText();
  }
});

socket.on('nicknameError', ({ name, message } = {}) => {
  const attemptedName = name || pendingNickname || '';
  pendingNickname = '';

  if (!currentNickname) {
    localStorage.removeItem(NICKNAME_KEY);
  }

  nicknameText.textContent = currentNickname || '손님';
  openNicknameModal(!currentNickname);
  nicknameInput.value = attemptedName;
  nicknameInput.setCustomValidity(message || '이미 사용 중인 닉네임입니다.');
  nicknameInput.reportValidity();
  fitAllText();
});

socket.on('shopState', (state) => {
  latestShopState = state;
  currentGold = 0;
  currentIsAdmin = Boolean(state.isAdmin);
  renderShop(state);
});

socket.on('inventoryState', (state) => {
  latestInventoryState = state;
  currentGold = 0;
  renderInventory(state);
});

socket.on('shopMessage', (message) => {
  shopInfo.textContent = message;
  if (skinCreateForm && message.includes('등록했습니다')) {
    skinCreateForm.reset();
    effectCreateForm.reset();
  }
});

socket.on('inventoryMessage', (message) => {
  inventoryInfo.textContent = message;
  if (message.includes('만들었습니다')) {
    skinCreateForm.reset();
    effectCreateForm.reset();
    if (skinPriceInput) skinPriceInput.value = '0';
    if (effectPriceInput) effectPriceInput.value = '0';
  }
});

socket.on('lobbyState', (state) => {
  renderLobby(state);
});

socket.on('lobbyMessage', (message) => {
  lobbyInfo.textContent = message;
});

socket.on('roomJoined', (state) => {
  currentRoomId = state.id;
  latestRoomState = state;
  if (activeView !== 'shop' && activeView !== 'inventory') showGame();
  renderBoard(state);
  updateStatus(state);
});

socket.on('leftRoom', () => {
  showLobby();
});

socket.on('role', ({ role, roomId }) => {
  myRole = role;
  currentRoomId = roomId;
  if (latestRoomState) {
    renderBoard(latestRoomState);
    updateStatus(latestRoomState);
  }
});

socket.on('roomState', (state) => {
  latestRoomState = state;
  currentRoomId = state.id;
  if (activeView !== 'shop' && activeView !== 'inventory') showGame();
  renderBoard(state);
  updateStatus(state);
});

socket.on('roomMessage', (message) => {
  gameMessageEl.textContent = message;
});

socket.on('lobbyChatHistory', (messages) => {
  renderChatHistory(lobbyChatMessages, messages);
});

socket.on('lobbyChatMessage', (message) => {
  renderChatMessage(lobbyChatMessages, message);
});

socket.on('roomChatHistory', (messages) => {
  renderChatHistory(roomChatMessages, messages);
});

socket.on('roomChatMessage', (message) => {
  renderChatMessage(roomChatMessages, message);
});

window.addEventListener('resize', fitAllText);
boardEl.addEventListener('contextmenu', (event) => {
  if (!pendingAlkkagiOption || latestRoomState?.gameType !== 'alkkagi') return;
  event.preventDefault();
  cancelPendingAlkkagiOption();
});

makePlaceholderBoard();
showLobby();
fitAllText();

window.getOmokState = () => ({
  room: latestRoomState,
  role: myRole,
});
