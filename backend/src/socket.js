const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
  });

  // authenticate socket via JWT in handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, society, role } = socket.user;
    socket.join(`user:${id}`);
    socket.join(`society:${society}`);
    if (role === 'guard') socket.join(`guards:${society}`);
    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
}

module.exports = { initSocket, getIO };
