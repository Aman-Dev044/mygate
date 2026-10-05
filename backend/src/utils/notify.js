const Notification = require('../models/Notification');
const { getIO } = require('../socket');

/**
 * Create a persistent notification for a user and push it in real time over socket.io.
 * @param {ObjectId|string} userId
 * @param {{title:string, message:string, type?:string, data?:object}} payload
 */
async function notifyUser(userId, payload) {
  const notif = await Notification.create({ user: userId, ...payload });
  try {
    getIO().to(`user:${userId}`).emit('notification', notif);
  } catch (_) {
    // socket not initialised (e.g. in seed script) - ignore
  }
  return notif;
}

/** Notify every resident of a flat. */
async function notifyFlat(User, societyId, flatNo, payload) {
  const residents = await User.find({ society: societyId, flatNo, role: 'resident' }).select('_id');
  return Promise.all(residents.map((r) => notifyUser(r._id, payload)));
}

module.exports = { notifyUser, notifyFlat };
