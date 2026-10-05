const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

const rawOrigins = process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/societies', require('./routes/societyRoutes'));
app.use('/api/visitors', require('./routes/visitorRoutes'));
app.use('/api/daily-help', require('./routes/dailyHelpRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/amenities', require('./routes/amenityRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/children', require('./routes/childRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
