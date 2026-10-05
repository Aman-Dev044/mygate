const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
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
