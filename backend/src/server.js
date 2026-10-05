require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const app = require('./app');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    initSocket(server);
    server.listen(PORT, () => console.log(`API + Socket.io running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
})();
