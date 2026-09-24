/**
 * BINGO DEL PROFE - EDICIÓN EXPRESIONES LATINAS
 * Lógica del juego, detección de líneas, audio sintetizado, modo multijugador y chat en tiempo real.
 */

// Lista por defecto de palabras y expresiones coloquiales
const DEFAULT_WORDS = [
  "Ahorita",
  "Chévere",
  "Vaina",
  "Parce / Parcero",
  "Pana",
  "No manches",
  "Órale",
  "Chido",
  "Plática / Platicar",
  "Chamba / Chambear",
  "Al tiro",
  "Bancar / Banco",
  "Che / Pibe",
  "Chamo",
  "Bacano",
  "Cuático",
  "Wey / Güey",
  "Pinche",
  "Ponerse pilas",
  "Padrísimo",
  "Berraco",
  "¿Mande?",
  "Fresa",
  "Ni modo",
  "Cachai",
  "De una",
  "Dar papaya",
  "Pelao / Chamaco",
  "Qué onda",
  "Híjole",
  "No friegues",
  "¿A poco?",
  "Chale",
  "Asere",
  "Mano (hermano)",
  "Buena onda",
  "Guácala",
  "Tranqui",
  "Al tiro pues",
  "Con calma",
  "Estar salado",
  "Hacer una gauchada",
  "Choro / Chamuyo",
  "Qué boleta"
];

// Estado global de la aplicación
const AppState = {
  gridSize: 4,
  board: [],
  wordPool: [],
  markedCount: 0,
  soundEnabled: true,
  audioCtx: null,
  stealthMode: false,
  wonLines: [],
  // Multijugador y Chat
  socket: null,
  isConnected: false,
  currentRoom: "",
  nickname: "",
  unreadChatCount: 0,
  chatOpen: false,
  onlineUsers: [],
  tunnelState: { active: false, starting: false, url: null, error: null }
};

// Claves de LocalStorage
const STORAGE_KEYS = {
  WORDS: "bingo_profe_words_v1",
  BOARD: "bingo_profe_board_v1",
  GRID_SIZE: "bingo_profe_grid_size_v1",
  SOUND: "bingo_profe_sound_v1",
  NICKNAME: "bingo_profe_nickname_v1",
  ROOM: "bingo_profe_room_v1"
};

/* ==========================================
   SISTEMA DE AUDIO CON WEB AUDIO API
========================================== */
function getAudioContext() {
  if (!AppState.audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      AppState.audioCtx = new AudioContextClass();
    }
  }
  if (AppState.audioCtx && AppState.audioCtx.state === 'suspended') {
    AppState.audioCtx.resume();
  }
  return AppState.audioCtx;
}

function playStampSound() {
  if (!AppState.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch (e) {
    console.error("Error al reproducir audio:", e);
  }
}

function playBingoFanfare() {
  if (!AppState.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4 -> G5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.08;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.46);
    });
  } catch (e) {
    console.error("Error al reproducir fanfarria:", e);
  }
}

function playMessageBeep() {
  if (!AppState.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.11);
  } catch (e) {
    // Silencio en caso de bloqueo de audio
  }
}

/* ==========================================
   INICIALIZACIÓN Y PERSISTENCIA
========================================== */
function initApp() {
  loadStoredPreferences();
  setupEventListeners();
  setupSocket();
  fetchTunnelStatus();
  renderWordPoolModal();
  
  if (AppState.board && AppState.board.length === AppState.gridSize * AppState.gridSize) {
    renderGrid();
    checkWinningConditions(false);
  } else {
    generateNewCard();
  }

  // Si había una sala previa guardada, autoconectar
  if (AppState.currentRoom && AppState.nickname && AppState.socket) {
    joinRoom(AppState.currentRoom, AppState.nickname);
  }
}

function loadStoredPreferences() {
  const savedGridSize = localStorage.getItem(STORAGE_KEYS.GRID_SIZE);
  if (savedGridSize) {
    AppState.gridSize = parseInt(savedGridSize, 10);
    const select = document.getElementById("gridSizeSelect");
    if (select) select.value = savedGridSize;
  }

  const savedWords = localStorage.getItem(STORAGE_KEYS.WORDS);
  if (savedWords) {
    try {
      AppState.wordPool = JSON.parse(savedWords);
    } catch {
      AppState.wordPool = [...DEFAULT_WORDS];
    }
  } else {
    AppState.wordPool = [...DEFAULT_WORDS];
  }

  const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND);
  if (savedSound !== null) {
    AppState.soundEnabled = savedSound === "true";
    updateSoundButtonUI();
  }

  AppState.nickname = localStorage.getItem(STORAGE_KEYS.NICKNAME) || "";
  AppState.currentRoom = localStorage.getItem(STORAGE_KEYS.ROOM) || "";

  const savedBoard = localStorage.getItem(STORAGE_KEYS.BOARD);
  if (savedBoard) {
    try {
      const parsed = JSON.parse(savedBoard);
      if (parsed.length === AppState.gridSize * AppState.gridSize) {
        AppState.board = parsed;
      }
    } catch {
      AppState.board = [];
    }
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(AppState.wordPool));
  localStorage.setItem(STORAGE_KEYS.BOARD, JSON.stringify(AppState.board));
  localStorage.setItem(STORAGE_KEYS.GRID_SIZE, AppState.gridSize.toString());
  localStorage.setItem(STORAGE_KEYS.SOUND, AppState.soundEnabled.toString());
  if (AppState.nickname) localStorage.setItem(STORAGE_KEYS.NICKNAME, AppState.nickname);
  if (AppState.currentRoom) localStorage.setItem(STORAGE_KEYS.ROOM, AppState.currentRoom);
  updateDashboardStats();
}

/* ==========================================
   CONEXIÓN SOCKET.IO (MULTIJUGADOR Y CHAT)
========================================== */
function setupSocket() {
  if (typeof io === 'undefined') {
    console.log("Socket.io no disponible (ejecutando en modo local estático)");
    return;
  }

  try {
    AppState.socket = io();

    AppState.socket.on('connect', () => {
      AppState.isConnected = true;
      if (AppState.currentRoom && AppState.nickname) {
        joinRoom(AppState.currentRoom, AppState.nickname);
      }
    });

    AppState.socket.on('disconnect', () => {
      AppState.isConnected = false;
      updateMultiplayerUI();
    });

    AppState.socket.on('joined_successfully', (data) => {
      AppState.currentRoom = data.room;
      AppState.nickname = data.nickname;
      saveState();
      updateMultiplayerUI();
      
      // Limpiar y renderizar historial previo del chat
      const chatContainer = document.getElementById("chatMessages");
      if (chatContainer && data.history) {
        chatContainer.innerHTML = "";
        data.history.forEach(msg => appendChatMessage(msg));
      }
      showToast(`🟢 Conectado a la sala: ${data.room}`);
    });

    AppState.socket.on('room_users', (users) => {
      AppState.onlineUsers = users;
      updateOnlineUsersUI();
    });

    AppState.socket.on('chat_message', (msg) => {
      appendChatMessage(msg);
      
      // Si el chat está cerrado y no es mensaje propio, sumar notificación
      if (!AppState.chatOpen && !AppState.stealthMode) {
        if (msg.type !== 'system' && msg.sender !== AppState.nickname) {
          AppState.unreadChatCount++;
          updateChatBadge();
          playMessageBeep();
        }
      }
    });

    // Estado del túnel seguro (Cloudflare)
    AppState.socket.on('tunnel_status', (status) => {
      renderTunnelUI(status);
    });
  } catch (err) {
    console.warn("No se pudo iniciar el socket:", err);
  }
}

/* ==========================================
   CONTROL DINÁMICO DEL ENLACE DE AMIGOS
========================================== */
function fetchTunnelStatus() {
  fetch('/api/tunnel')
    .then(res => res.json())
    .then(data => renderTunnelUI(data))
    .catch(() => {});
}

function renderTunnelUI(data) {
  if (!data) return;
  AppState.tunnelState = data;

  const badge = document.getElementById("tunnelBadge");
  const detail = document.getElementById("tunnelDetail");
  const toggleBtn = document.getElementById("toggleTunnelBtn");
  const linkRow = document.getElementById("tunnelLinkRow");
  const input = document.getElementById("tunnelUrlInput");
  const openLink = document.getElementById("openTunnelLink");

  if (!badge || !toggleBtn) return;

  if (data.starting) {
    badge.className = "tunnel-badge starting";
    badge.textContent = "⏳ Conectando con Cloudflare...";
    detail.textContent = "Generando tu enlace seguro para amigos (suele tardar 5-10s)...";
    toggleBtn.className = "btn btn-tunnel-loading";
    toggleBtn.textContent = "⏳ Conectando...";
    toggleBtn.disabled = true;
    if (linkRow) linkRow.classList.add("hidden");
  } else if (data.active && data.url) {
    badge.className = "tunnel-badge active";
    badge.textContent = "🌐 Enlace Público Activo";
    detail.textContent = "Tus amigos pueden entrar con este enlace seguro (tu IP está 100% oculta)";
    toggleBtn.className = "btn btn-tunnel-stop";
    toggleBtn.textContent = "🛑 Cerrar Enlace Público (Volver a Solo Local)";
    toggleBtn.disabled = false;
    
    if (linkRow) {
      linkRow.classList.remove("hidden");
      if (input) input.value = data.url;
      if (openLink) openLink.href = data.url;
    }
  } else {
    badge.className = "tunnel-badge local";
    badge.textContent = "🔒 Modo Solo Local (Privado)";
    detail.textContent = "Solo tú puedes jugar en este equipo (localhost:3000)";
    toggleBtn.className = "btn btn-tunnel-start";
    toggleBtn.textContent = "🚀 Abrir Enlace para Amigos";
    toggleBtn.disabled = false;
    if (linkRow) linkRow.classList.add("hidden");
  }
}

async function toggleTunnel() {
  const toggleBtn = document.getElementById("toggleTunnelBtn");
  if (AppState.tunnelState && AppState.tunnelState.active) {
    showToast("🛑 Cerrando enlace público...");
    if (toggleBtn) {
      toggleBtn.disabled = true;
      toggleBtn.textContent = "Cerrando...";
    }
    try {
      const res = await fetch('/api/tunnel/stop', { method: 'POST' });
      const data = await res.json();
      renderTunnelUI(data);
      showToast("🔒 Enlace cerrado. Ahora el juego es solo local.");
    } catch (err) {
      showToast("⚠️ Error al cerrar enlace");
    } finally {
      if (toggleBtn) toggleBtn.disabled = false;
    }
  } else {
    showToast("🚀 Conectando túnel seguro de Cloudflare...");
    renderTunnelUI({ starting: true });
    try {
      const res = await fetch('/api/tunnel/start', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.url) {
        renderTunnelUI(data);
        showToast("✅ ¡Enlace público listo! Cópialo para tus amigos.");
      } else {
        renderTunnelUI({ active: false, starting: false });
        showToast("⚠️ No se pudo generar el enlace: " + (data.error || "Reintenta"));
      }
    } catch (err) {
      renderTunnelUI({ active: false, starting: false });
      showToast("⚠️ Error al conectar túnel");
    }
  }
}

function joinRoom(room, nickname) {
  if (!AppState.socket) {
    showToast("⚠️ Servidor multijugador no conectado");
    return;
  }
  AppState.socket.emit('join_room', { room, nickname });
}

function updateMultiplayerUI() {
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const roomUsersBadge = document.getElementById("roomUsersBadge");
  const chatRoomName = document.getElementById("chatRoomName");

  if (AppState.currentRoom) {
    if (statusDot) {
      statusDot.className = "status-dot online";
    }
    if (statusText) {
      statusText.innerHTML = `Sala: <strong>${AppState.currentRoom}</strong> (${AppState.nickname})`;
    }
    if (roomUsersBadge) {
      roomUsersBadge.classList.remove("hidden");
    }
    if (chatRoomName) {
      chatRoomName.textContent = AppState.currentRoom;
    }
  } else {
    if (statusDot) {
      statusDot.className = "status-dot offline";
    }
    if (statusText) {
      statusText.textContent = "Modo Solitario";
    }
    if (roomUsersBadge) {
      roomUsersBadge.classList.add("hidden");
    }
  }
}

function updateOnlineUsersUI() {
  const countEl = document.getElementById("onlineCount");
  const listEl = document.getElementById("chatOnlineList");
  
  if (countEl) countEl.textContent = AppState.onlineUsers.length;
  if (listEl) {
    if (AppState.onlineUsers.length === 0) {
      listEl.textContent = "Nadie más en la sala";
    } else {
      listEl.textContent = AppState.onlineUsers.join(", ");
    }
  }
}

function appendChatMessage(msg) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  const msgEl = document.createElement("div");
  msgEl.className = `chat-msg ${msg.type}`;

  if (msg.type === 'user') {
    const isMine = msg.sender === AppState.nickname;
    msgEl.classList.add(isMine ? 'mine' : 'theirs');
    
    msgEl.innerHTML = `
      ${!isMine ? `<div class="chat-sender">${escapeHtml(msg.sender)} <span class="chat-time">${msg.time}</span></div>` : ''}
      <div class="chat-text">${escapeHtml(msg.text)}</div>
      ${isMine ? `<div style="text-align:right; font-size:0.65rem; opacity:0.7;">${msg.time}</div>` : ''}
    `;
  } else {
    msgEl.innerHTML = `<span>${msg.text}</span>`;
  }

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage(text) {
  if (!text || !text.trim()) return;
  if (!AppState.currentRoom) {
    showToast("⚠️ Primero únete a una sala para chatear");
    document.getElementById("roomModal")?.classList.remove("hidden");
    return;
  }
  if (AppState.socket) {
    AppState.socket.emit('send_message', { text: text.trim() });
  }
}

function updateChatBadge() {
  const badge = document.getElementById("chatUnreadBadge");
  if (!badge) return;

  if (AppState.unreadChatCount > 0) {
    badge.textContent = AppState.unreadChatCount > 9 ? "9+" : AppState.unreadChatCount;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

/* ==========================================
   GENERADOR DE CARTÓN
========================================== */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateNewCard() {
  const totalCells = AppState.gridSize * AppState.gridSize;
  const is5x5 = AppState.gridSize === 5;
  const neededWords = is5x5 ? totalCells - 1 : totalCells;

  let pool = [...AppState.wordPool];
  while (pool.length < neededWords) {
    pool = pool.concat(DEFAULT_WORDS);
  }

  const shuffledWords = shuffle(pool).slice(0, neededWords);
  const newBoard = [];
  let wordIndex = 0;

  for (let i = 0; i < totalCells; i++) {
    if (is5x5 && i === 12) {
      newBoard.push({
        id: i,
        text: "¡PROFE COMIENZA A HABLAR!",
        isFree: true,
        isMarked: true
      });
    } else {
      newBoard.push({
        id: i,
        text: shuffledWords[wordIndex++],
        isFree: false,
        isMarked: false
      });
    }
  }

  AppState.board = newBoard;
  AppState.wonLines = [];
  saveState();
  renderGrid();
  showToast("🎲 ¡Nuevo cartón barajado!");
}

function resetBoardMarks() {
  AppState.board.forEach(cell => {
    if (!cell.isFree) {
      cell.isMarked = false;
    }
  });
  AppState.wonLines = [];
  saveState();
  renderGrid();
  showToast("🧹 Marcas limpiadas");
}

/* ==========================================
   RENDERIZADO DE LA CUADRÍCULA
========================================== */
function renderGrid() {
  const gridContainer = document.getElementById("bingoGrid");
  if (!gridContainer) return;

  gridContainer.className = `bingo-grid grid-${AppState.gridSize}`;
  gridContainer.innerHTML = "";

  AppState.board.forEach((cell, index) => {
    const cellEl = document.createElement("button");
    cellEl.className = "bingo-cell";
    cellEl.dataset.index = index;
    cellEl.setAttribute("aria-label", cell.text);

    if (cell.isFree) cellEl.classList.add("cell-free");
    if (cell.isMarked) cellEl.classList.add("is-marked");

    let contentHtml = `<span class="bingo-cell-text">${cell.text}</span>`;
    if (cell.isFree) contentHtml = `<span class="free-icon">🌟</span>` + contentHtml;

    if (cell.isMarked) {
      const stampText = cell.isFree ? "GRATIS" : "CAZADA";
      contentHtml += `
        <div class="stamp-mark">
          <div class="stamp-inner">${stampText}</div>
        </div>
      `;
    }

    cellEl.innerHTML = contentHtml;
    cellEl.addEventListener("click", () => handleCellClick(index));
    gridContainer.appendChild(cellEl);
  });

  updateDashboardStats();
}

function handleCellClick(index) {
  const cell = AppState.board[index];
  if (!cell) return;

  if (cell.isFree) {
    showToast("⭐ Esta es tu casilla gratis");
    return;
  }

  cell.isMarked = !cell.isMarked;

  if (cell.isMarked) {
    playStampSound();
    
    // Si estamos en multijugador, avisar a los amigos
    if (AppState.socket && AppState.currentRoom) {
      const markedCount = AppState.board.filter(c => c.isMarked && !c.isFree).length;
      AppState.socket.emit('cell_marked', {
        word: cell.text,
        count: markedCount,
        total: AppState.board.length
      });
    }
  }

  saveState();
  renderGrid();
  checkWinningConditions(true);
}

/* ==========================================
   DETECCIÓN DE LÍNEAS Y BINGO
========================================== */
function checkWinningConditions(triggerCelebration = true) {
  const size = AppState.gridSize;
  const board = AppState.board;
  const winningPatterns = [];

  // Filas
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) row.push(r * size + c);
    winningPatterns.push({ id: `row-${r}`, name: `Fila ${r + 1}`, cells: row });
  }

  // Columnas
  for (let c = 0; c < size; c++) {
    const col = [];
    for (let r = 0; r < size; r++) col.push(r * size + c);
    winningPatterns.push({ id: `col-${c}`, name: `Columna ${c + 1}`, cells: col });
  }

  // Diagonal 1
  const diag1 = [];
  for (let i = 0; i < size; i++) diag1.push(i * size + i);
  winningPatterns.push({ id: "diag-1", name: "Diagonal Principal ↘", cells: diag1 });

  // Diagonal 2
  const diag2 = [];
  for (let i = 0; i < size; i++) diag2.push(i * size + (size - 1 - i));
  winningPatterns.push({ id: "diag-2", name: "Diagonal Inversa ↗", cells: diag2 });

  const completedPatterns = [];
  const winningCellIndices = new Set();

  winningPatterns.forEach(pattern => {
    const isComplete = pattern.cells.every(idx => board[idx] && board[idx].isMarked);
    if (isComplete) {
      completedPatterns.push(pattern);
      pattern.cells.forEach(idx => winningCellIndices.add(idx));
    }
  });

  // Resaltado visual
  const cellElements = document.querySelectorAll(".bingo-cell");
  cellElements.forEach((el, idx) => {
    if (winningCellIndices.has(idx)) {
      el.classList.add("is-winning-line");
    } else {
      el.classList.remove("is-winning-line");
    }
  });

  const completedCountEl = document.getElementById("completedLines");
  if (completedCountEl) completedCountEl.textContent = completedPatterns.length;

  const newlyWon = completedPatterns.filter(p => !AppState.wonLines.includes(p.id));

  if (newlyWon.length > 0 && triggerCelebration) {
    newlyWon.forEach(p => AppState.wonLines.push(p.id));
    celebrateWin(newlyWon[0].name);

    // Notificar en la sala
    if (AppState.socket && AppState.currentRoom) {
      AppState.socket.emit('player_bingo', { reason: newlyWon[0].name });
    }
  }

  const allMarked = board.every(c => c.isMarked);
  if (allMarked && !AppState.wonLines.includes("full-board") && triggerCelebration) {
    AppState.wonLines.push("full-board");
    celebrateWin("¡¡CARTÓN LLENO / BLACKOUT!!");
    
    if (AppState.socket && AppState.currentRoom) {
      AppState.socket.emit('player_bingo', { reason: "CARTÓN LLENO" });
    }
  }
}

function celebrateWin(reason) {
  playBingoFanfare();
  launchConfetti();
  
  const modal = document.getElementById("winModal");
  const winDesc = document.getElementById("winDescription");
  const winDetails = document.getElementById("winDetails");

  if (winDesc) winDesc.textContent = `¡Has completado: ${reason}!`;
  
  const markedWords = AppState.board.filter(c => c.isMarked && !c.isFree).map(c => `• ${c.text}`);
  if (winDetails) {
    winDetails.innerHTML = `<strong>Expresiones cazadas:</strong><br>${markedWords.slice(0, 8).join("<br>")}${markedWords.length > 8 ? "<br><em>...y más!</em>" : ""}`;
  }

  if (modal) modal.classList.remove("hidden");
}

/* ==========================================
   DASHBOARD STATS
========================================== */
function updateDashboardStats() {
  const marked = AppState.board.filter(c => c.isMarked && !c.isFree).length;
  const total = AppState.board.length;
  
  const markedEl = document.getElementById("markedCount");
  const totalEl = document.getElementById("totalCells");
  const wordCountHeaderEl = document.getElementById("totalWordPoolCount");

  if (markedEl) markedEl.textContent = marked;
  if (totalEl) totalEl.textContent = total;
  if (wordCountHeaderEl) wordCountHeaderEl.textContent = AppState.wordPool.length;
}

/* ==========================================
   GESTOR DE PALABRAS (MODAL)
========================================== */
function renderWordPoolModal() {
  const wordsListEl = document.getElementById("wordsList");
  const countEl = document.getElementById("modalWordsCount");
  if (!wordsListEl) return;

  wordsListEl.innerHTML = "";
  if (countEl) countEl.textContent = AppState.wordPool.length;

  AppState.wordPool.forEach((word, index) => {
    const pill = document.createElement("div");
    pill.className = "word-tag";
    pill.innerHTML = `
      <span>${escapeHtml(word)}</span>
      <button class="tag-delete-btn" title="Eliminar">&times;</button>
    `;

    pill.querySelector(".tag-delete-btn").addEventListener("click", () => {
      removeWordFromPool(index);
    });

    wordsListEl.appendChild(pill);
  });
}

function addWordToPool(newWord) {
  const cleanWord = newWord.trim();
  if (!cleanWord) return;

  if (AppState.wordPool.some(w => w.toLowerCase() === cleanWord.toLowerCase())) {
    showToast("⚠️ Esa expresión ya está en la lista");
    return;
  }

  AppState.wordPool.unshift(cleanWord);
  saveState();
  renderWordPoolModal();
  updateDashboardStats();
  showToast(`✅ "${cleanWord}" añadida a la lista`);
}

function removeWordFromPool(index) {
  if (AppState.wordPool.length <= 16) {
    showToast("⚠️ Necesitas al menos 16 palabras para jugar");
    return;
  }
  const removed = AppState.wordPool.splice(index, 1);
  saveState();
  renderWordPoolModal();
  updateDashboardStats();
  showToast(`🗑️ "${removed}" eliminada`);
}

function resetWordPoolToDefault() {
  AppState.wordPool = [...DEFAULT_WORDS];
  saveState();
  renderWordPoolModal();
  updateDashboardStats();
  showToast("🔄 Lista restaurada por defecto");
}

/* ==========================================
   MODO CAMUFLAJE / DISIMULO ("VIENE EL PROFE")
========================================== */
function toggleStealthMode(forceState) {
  const stealthEl = document.getElementById("stealthScreen");
  const chatDrawer = document.getElementById("chatDrawer");
  if (!stealthEl) return;

  AppState.stealthMode = forceState !== undefined ? forceState : !AppState.stealthMode;

  if (AppState.stealthMode) {
    stealthEl.classList.remove("hidden");
    document.title = "Apuntes_Clase_Tema_4_Metodologia.docx";
    // Esconder el chat inmediatamente
    if (chatDrawer) chatDrawer.classList.add("hidden");
  } else {
    stealthEl.classList.add("hidden");
    document.title = "Bingo del Profe - Edición Expresiones Latinas";
    if (AppState.chatOpen && chatDrawer) {
      chatDrawer.classList.remove("hidden");
    }
  }
}

/* ==========================================
   COMPARTIR RESULTADOS (WHATSAPP / PORTAPAPELES)
========================================= */
function generateShareText() {
  const markedCells = AppState.board.filter(c => c.isMarked && !c.isFree);
  const completedLinesCount = document.getElementById("completedLines")?.textContent || "0";
  
  let text = `🎯 *¡BINGO DEL PROFE!* 👨‍🏫\n`;
  if (AppState.currentRoom) {
    text += `Sala: ${AppState.currentRoom}\n`;
  }
  text += `Líneas conseguidas: ${completedLinesCount} 🏆\n`;
  text += `Palabras cazadas hoy en clase:\n`;
  
  markedCells.forEach(c => {
    text += `• ${c.text}\n`;
  });
  
  text += `\nTotal cazadas: ${markedCells.length}/${AppState.board.length}\n`;
  text += `¡A ver quién completa el cartón primero! 😂`;
  return text;
}

function copyShareResults() {
  const text = generateShareText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("📋 ¡Copiado al portapapeles! Pégalo en WhatsApp");
    }).catch(() => {
      prompt("Copia tu resultado para WhatsApp:", text);
    });
  } else {
    prompt("Copia tu resultado para WhatsApp:", text);
  }
}

/* ==========================================
   ANIMACIÓN DE CONFETI
========================================== */
function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#f59e0b", "#ec4899", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#fbbf24"];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 1) * 14 - 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  let animationFrame;
  function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4;
      p.rotation += p.vRot;
      p.opacity -= 0.01;

      if (p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (alive) {
      animationFrame = requestAnimationFrame(updateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  updateConfetti();
}

/* ==========================================
   TOAST NOTIFICACIONES
========================================== */
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.remove("hidden");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2400);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ==========================================
   CONFIGURACIÓN DE EVENT LISTENERS
========================================== */
function setupEventListeners() {
  const gridSizeSelect = document.getElementById("gridSizeSelect");
  if (gridSizeSelect) {
    gridSizeSelect.addEventListener("change", (e) => {
      AppState.gridSize = parseInt(e.target.value, 10);
      generateNewCard();
    });
  }

  const newCardBtn = document.getElementById("newCardBtn");
  if (newCardBtn) {
    newCardBtn.addEventListener("click", () => {
      if (confirm("¿Seguro que quieres barajar un nuevo cartón?")) {
        generateNewCard();
      }
    });
  }

  const resetBoardBtn = document.getElementById("resetBoardBtn");
  if (resetBoardBtn) {
    resetBoardBtn.addEventListener("click", () => {
      if (confirm("¿Quieres desmarcar todas las casillas del cartón actual?")) {
        resetBoardMarks();
      }
    });
  }

  const soundToggleBtn = document.getElementById("soundToggleBtn");
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener("click", () => {
      AppState.soundEnabled = !AppState.soundEnabled;
      updateSoundButtonUI();
      saveState();
      showToast(AppState.soundEnabled ? "🔊 Sonido activado" : "🔇 Sonido silenciado");
    });
  }

  // Modo Camuflaje
  const stealthBtn = document.getElementById("stealthBtn");
  if (stealthBtn) {
    stealthBtn.addEventListener("click", () => toggleStealthMode(true));
  }

  const exitStealthBtn = document.getElementById("exitStealthBtn");
  if (exitStealthBtn) {
    exitStealthBtn.addEventListener("click", () => toggleStealthMode(false));
  }

  const stealthScreen = document.getElementById("stealthScreen");
  if (stealthScreen) {
    stealthScreen.addEventListener("dblclick", () => toggleStealthMode(false));
  }

  // Teclado
  window.addEventListener("keydown", (e) => {
    if (e.key === "F2") {
      e.preventDefault();
      toggleStealthMode();
    } else if (e.key === "Escape") {
      if (AppState.stealthMode) {
        toggleStealthMode(false);
      } else {
        closeModals();
      }
    }
  });

  // Modal Multijugador
  const openRoomModalBtn = document.getElementById("openRoomModalBtn");
  const roomModal = document.getElementById("roomModal");
  const closeRoomModalBtn = document.getElementById("closeRoomModalBtn");
  const joinRoomForm = document.getElementById("joinRoomForm");
  const nicknameInput = document.getElementById("nicknameInput");
  const roomCodeInput = document.getElementById("roomCodeInput");

  if (openRoomModalBtn && roomModal) {
    openRoomModalBtn.addEventListener("click", () => {
      if (nicknameInput && AppState.nickname) nicknameInput.value = AppState.nickname;
      if (roomCodeInput && AppState.currentRoom) roomCodeInput.value = AppState.currentRoom;
      roomModal.classList.remove("hidden");
    });
  }

  if (closeRoomModalBtn && roomModal) {
    closeRoomModalBtn.addEventListener("click", () => roomModal.classList.add("hidden"));
  }

  if (joinRoomForm) {
    joinRoomForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nick = nicknameInput.value.trim();
      const code = roomCodeInput.value.trim().toUpperCase();

      if (nick && code) {
        joinRoom(code, nick);
        roomModal.classList.add("hidden");
      }
    });
  }

  // Toggle Drawer del Chat
  const chatToggleBtn = document.getElementById("chatToggleBtn");
  const chatDrawer = document.getElementById("chatDrawer");
  const closeChatBtn = document.getElementById("closeChatBtn");

  if (chatToggleBtn && chatDrawer) {
    chatToggleBtn.addEventListener("click", () => {
      AppState.chatOpen = !AppState.chatOpen;
      if (AppState.chatOpen) {
        chatDrawer.classList.remove("hidden");
        AppState.unreadChatCount = 0;
        updateChatBadge();
        document.getElementById("chatInput")?.focus();
      } else {
        chatDrawer.classList.add("hidden");
      }
    });
  }

  if (closeChatBtn && chatDrawer) {
    closeChatBtn.addEventListener("click", () => {
      AppState.chatOpen = false;
      chatDrawer.classList.add("hidden");
    });
  }

  // Formulario del Chat
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const txt = chatInput.value;
      if (txt) {
        sendChatMessage(txt);
        chatInput.value = "";
        chatInput.focus();
      }
    });
  }

  // Botones de emojis en el chat
  const emojiButtons = document.querySelectorAll(".emoji-btn");
  emojiButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (chatInput) {
        chatInput.value += btn.textContent;
        chatInput.focus();
      }
    });
  });

  // Modal Diccionario Palabras
  const wordsModal = document.getElementById("wordsModal");
  const manageWordsBtn = document.getElementById("manageWordsBtn");
  const closeWordsModalBtn = document.getElementById("closeWordsModalBtn");
  const applyWordsBtn = document.getElementById("applyWordsBtn");
  const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");
  const addWordForm = document.getElementById("addWordForm");
  const newWordInput = document.getElementById("newWordInput");

  if (manageWordsBtn) {
    manageWordsBtn.addEventListener("click", () => {
      renderWordPoolModal();
      wordsModal.classList.remove("hidden");
    });
  }

  if (closeWordsModalBtn) {
    closeWordsModalBtn.addEventListener("click", () => wordsModal.classList.add("hidden"));
  }

  if (applyWordsBtn) {
    applyWordsBtn.addEventListener("click", () => {
      wordsModal.classList.add("hidden");
      generateNewCard();
    });
  }

  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener("click", () => {
      if (confirm("¿Restaurar las expresiones por defecto?")) {
        resetWordPoolToDefault();
      }
    });
  }

  if (addWordForm) {
    addWordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = newWordInput.value;
      if (val) {
        addWordToPool(val);
        newWordInput.value = "";
        newWordInput.focus();
      }
    });
  }

  // Modal Victoria
  const winModal = document.getElementById("winModal");
  const continuePlayingBtn = document.getElementById("continuePlayingBtn");
  const winShareBtn = document.getElementById("winShareBtn");

  if (continuePlayingBtn) {
    continuePlayingBtn.addEventListener("click", () => winModal.classList.add("hidden"));
  }

  if (winShareBtn) {
    winShareBtn.addEventListener("click", () => {
      winModal.classList.add("hidden");
      copyShareResults();
    });
  }

  const shareResultBtn = document.getElementById("shareResultBtn");
  if (shareResultBtn) {
    shareResultBtn.addEventListener("click", copyShareResults);
  }

  // Controles de Apertura / Cierre de Enlace Público (Cloudflare)
  const toggleTunnelBtn = document.getElementById("toggleTunnelBtn");
  if (toggleTunnelBtn) {
    toggleTunnelBtn.addEventListener("click", toggleTunnel);
  }

  const copyTunnelBtn = document.getElementById("copyTunnelBtn");
  if (copyTunnelBtn) {
    copyTunnelBtn.addEventListener("click", () => {
      const input = document.getElementById("tunnelUrlInput");
      if (input && input.value) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(input.value).then(() => {
            showToast("📋 ¡Enlace copiado! Pásaselo a tus amigos por WhatsApp");
          }).catch(() => {
            prompt("Copia el enlace para tus amigos:", input.value);
          });
        } else {
          prompt("Copia el enlace para tus amigos:", input.value);
        }
      }
    });
  }

  // Botón Git Pull (Sincronizar cambios de GitHub en la web)
  const gitPullBtn = document.getElementById("gitPullBtn");
  if (gitPullBtn) {
    gitPullBtn.addEventListener("click", async () => {
      showToast("🔄 Ejecutando git pull...");
      gitPullBtn.disabled = true;
      try {
        const res = await fetch('/api/git/pull', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`✅ Git Pull: ${data.message}`);
        } else {
          showToast(`⚠️ ${data.message}`);
        }
      } catch (err) {
        showToast("⚠️ Error al conectar con el servidor para git pull");
      } finally {
        gitPullBtn.disabled = false;
      }
    });
  }

  window.addEventListener("resize", () => {
    const canvas = document.getElementById("confettiCanvas");
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });
}

function closeModals() {
  document.getElementById("wordsModal")?.classList.add("hidden");
  document.getElementById("winModal")?.classList.add("hidden");
  document.getElementById("roomModal")?.classList.add("hidden");
  document.getElementById("chatDrawer")?.classList.add("hidden");
  AppState.chatOpen = false;
}

function updateSoundButtonUI() {
  const btn = document.getElementById("soundToggleBtn");
  if (btn) {
    btn.textContent = AppState.soundEnabled ? "🔊" : "🔇";
    btn.title = AppState.soundEnabled ? "Sonido activado" : "Silenciado";
  }
}

document.addEventListener("DOMContentLoaded", initApp);
