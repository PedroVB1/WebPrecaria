const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { spawn, exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.json());
// Servir archivos estáticos del juego y noticias
app.use(express.static(path.join(__dirname)));

// ==========================================
// GESTOR DE TÚNEL CLOUDFLARE (DINÁMICO)
// ==========================================
let tunnelState = {
  active: false,
  starting: false,
  url: null,
  error: null
};
let tunnelProcess = null;

function broadcastTunnelStatus() {
  io.emit('tunnel_status', tunnelState);
}

function startCloudflareTunnel() {
  return new Promise((resolve, reject) => {
    if (tunnelState.active && tunnelState.url) {
      return resolve(tunnelState.url);
    }
    if (tunnelState.starting) {
      return resolve(null);
    }

    tunnelState.starting = true;
    tunnelState.error = null;
    broadcastTunnelStatus();

    console.log("🚀 Iniciando túnel seguro de Cloudflare...");

    try {
      // Spawn cloudflared tunnel
      tunnelProcess = spawn('npx', ['--yes', 'cloudflared', 'tunnel', '--url', `http://localhost:${PORT}`], {
        shell: true
      });

      let resolved = false;
      const timeoutTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          tunnelState.starting = false;
          tunnelState.error = "Tiempo de espera agotado al conectar con Cloudflare.";
          broadcastTunnelStatus();
          reject(new Error(tunnelState.error));
        }
      }, 35000);

      const processOutput = (data) => {
        const text = data.toString();
        // Buscar URL de trycloudflare.com
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeoutTimer);
          tunnelState.active = true;
          tunnelState.starting = false;
          tunnelState.url = match[0];
          console.log(`✅ Túnel activo: ${tunnelState.url}`);
          broadcastTunnelStatus();
          resolve(tunnelState.url);
        }
      };

      tunnelProcess.stdout.on('data', processOutput);
      tunnelProcess.stderr.on('data', processOutput);

      tunnelProcess.on('error', (err) => {
        console.error("Error al iniciar proceso cloudflared:", err);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutTimer);
          tunnelState.active = false;
          tunnelState.starting = false;
          tunnelState.url = null;
          tunnelState.error = err.message;
          broadcastTunnelStatus();
          reject(err);
        }
      });

      tunnelProcess.on('close', (code) => {
        console.log(`Túnel de Cloudflare cerrado (código: ${code})`);
        tunnelState.active = false;
        tunnelState.starting = false;
        tunnelState.url = null;
        tunnelProcess = null;
        broadcastTunnelStatus();
      });

    } catch (e) {
      tunnelState.starting = false;
      tunnelState.error = e.message;
      broadcastTunnelStatus();
      reject(e);
    }
  });
}

function stopCloudflareTunnel() {
  return new Promise((resolve) => {
    if (!tunnelProcess) {
      tunnelState.active = false;
      tunnelState.starting = false;
      tunnelState.url = null;
      broadcastTunnelStatus();
      return resolve(true);
    }

    console.log("🛑 Deteniendo túnel de Cloudflare...");
    const pid = tunnelProcess.pid;
    tunnelProcess = null;

    // En Windows se usa taskkill para matar el árbol completo (cmd, npx, cloudflared)
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${pid} /f /t`, (err) => {
        tunnelState.active = false;
        tunnelState.starting = false;
        tunnelState.url = null;
        broadcastTunnelStatus();
        resolve(true);
      });
    } else {
      try {
        process.kill(-pid);
      } catch (e) {
        // ignorar
      }
      tunnelState.active = false;
      tunnelState.starting = false;
      tunnelState.url = null;
      broadcastTunnelStatus();
      resolve(true);
    }
  });
}

// Rutas de API para controlar el túnel
app.get('/api/tunnel', (req, res) => {
  res.json(tunnelState);
});

app.post('/api/tunnel/start', async (req, res) => {
  try {
    const url = await startCloudflareTunnel();
    res.json({ success: true, url, ...tunnelState });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, ...tunnelState });
  }
});

app.post('/api/tunnel/stop', async (req, res) => {
  try {
    await stopCloudflareTunnel();
    res.json({ success: true, ...tunnelState });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, ...tunnelState });
  }
});

// Sincronización con GitHub (git pull)
app.post('/api/git/pull', (req, res) => {
  exec('git pull', (error, stdout, stderr) => {
    if (error) {
      const errStr = (error.message || '') + ' ' + (stderr || '');
      let userMsg = 'Error al ejecutar git pull.';
      if (errStr.includes('not a git repository')) {
        userMsg = 'Este proyecto aún no está inicializado con Git. Ejecuta "git init" y conéctalo a tu repositorio de GitHub.';
      } else if (errStr.includes('There is no tracking information') || errStr.includes('No remote')) {
        userMsg = 'Aún no hay un repositorio remoto configurado. Añade tu remote con: git remote add origin <url>.';
      } else {
        userMsg = stderr || error.message;
      }
      return res.json({ success: false, message: userMsg });
    }
    const cleanOutput = stdout.trim() || 'Repositorio al día.';
    res.json({ success: true, message: cleanOutput });
  });
});

// Limpieza al cerrar el servidor
process.on('SIGINT', async () => {
  await stopCloudflareTunnel();
  process.exit();
});
process.on('SIGTERM', async () => {
  await stopCloudflareTunnel();
  process.exit();
});

// ==========================================
// SALAS Y MENSAJES MULTIJUGADOR
// ==========================================
const rooms = {};

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentNickname = null;

  // Enviar estado actual del túnel al conectarse
  socket.emit('tunnel_status', tunnelState);

  // Unirse a una sala
  socket.on('join_room', ({ room, nickname }) => {
    const cleanRoom = (room || 'CLASE').trim().toUpperCase();
    const cleanNick = (nickname || 'Anónimo').trim().slice(0, 20);

    if (currentRoom && rooms[currentRoom]) {
      socket.leave(currentRoom);
      delete rooms[currentRoom].users[socket.id];
      io.to(currentRoom).emit('room_users', Object.values(rooms[currentRoom].users));
    }

    currentRoom = cleanRoom;
    currentNickname = cleanNick;
    socket.join(currentRoom);

    if (!rooms[currentRoom]) {
      rooms[currentRoom] = {
        users: {},
        history: []
      };
    }

    rooms[currentRoom].users[socket.id] = currentNickname;

    socket.emit('joined_successfully', {
      room: currentRoom,
      nickname: currentNickname,
      history: rooms[currentRoom].history.slice(-30)
    });

    const activeUsers = Object.values(rooms[currentRoom].users);
    io.to(currentRoom).emit('room_users', activeUsers);

    const joinMsg = {
      type: 'system',
      text: `👋 ${currentNickname} se ha unido a la sala`,
      time: getCurrentTime()
    };
    addMessageToHistory(currentRoom, joinMsg);
    io.to(currentRoom).emit('chat_message', joinMsg);
  });

  // Mensaje de chat
  socket.on('send_message', ({ text }) => {
    if (!currentRoom || !text) return;
    const cleanText = text.trim().slice(0, 300);
    if (!cleanText) return;

    const chatMsg = {
      type: 'user',
      sender: currentNickname || 'Amigo',
      text: cleanText,
      time: getCurrentTime()
    };

    addMessageToHistory(currentRoom, chatMsg);
    io.to(currentRoom).emit('chat_message', chatMsg);
  });

  // Palabra marcada
  socket.on('cell_marked', ({ word, count, total }) => {
    if (!currentRoom) return;

    const eventMsg = {
      type: 'game_event',
      text: `⚡ ${currentNickname} cazó "${word}" (${count}/${total})`,
      time: getCurrentTime()
    };

    addMessageToHistory(currentRoom, eventMsg);
    io.to(currentRoom).emit('chat_message', eventMsg);
  });

  // Notificación de BINGO
  socket.on('player_bingo', ({ reason }) => {
    if (!currentRoom) return;

    const bingoMsg = {
      type: 'bingo_alert',
      text: `🚨 ¡¡${currentNickname.toUpperCase()} HA CANTADO BINGO!! (${reason}) 🏆🎉`,
      time: getCurrentTime()
    };

    addMessageToHistory(currentRoom, bingoMsg);
    io.to(currentRoom).emit('chat_message', bingoMsg);
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      delete rooms[currentRoom].users[socket.id];
      const activeUsers = Object.values(rooms[currentRoom].users);
      io.to(currentRoom).emit('room_users', activeUsers);

      const leaveMsg = {
        type: 'system',
        text: `🚪 ${currentNickname || 'Un jugador'} ha salido`,
        time: getCurrentTime()
      };
      addMessageToHistory(currentRoom, leaveMsg);
      io.to(currentRoom).emit('chat_message', leaveMsg);

      if (activeUsers.length === 0) {
        delete rooms[currentRoom];
      }
    }
  });
});

function addMessageToHistory(room, msg) {
  if (rooms[room]) {
    rooms[room].history.push(msg);
    if (rooms[room].history.length > 60) {
      rooms[room].history.shift();
    }
  }
}

function getCurrentTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🎮 SERVIDOR BINGO DEL PROFE INICIADO CON ÉXITO!`);
  console.log(`👉 Acceso local: http://localhost:${PORT}`);
  console.log(`🛡️ Control de enlace público para amigos integrado`);
  console.log(`==================================================\n`);
});
