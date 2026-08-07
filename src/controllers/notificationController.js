const { readDB, writeDB } = require('../db');

function getNotifications(req, res) {
  try {
    const db = readDB();
    const userNotifs = db.notifications
      .filter(n => n.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const unreadCount = userNotifs.filter(n => !n.read).length;

    return res.json({ notifications: userNotifs, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao obter notificações.' });
  }
}

function markRead(req, res) {
  try {
    const { id } = req.params;
    const db = readDB();
    const notif = db.notifications.find(n => n.id === id && n.userId === req.user.id);
    if (!notif) return res.status(404).json({ error: 'Notificação não encontrada.' });

    notif.read = true;
    writeDB(db);
    return res.json({ message: 'Notificação marcada como lida.', notification: notif });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao marcar notificação como lida.' });
  }
}

function markAllRead(req, res) {
  try {
    const db = readDB();
    db.notifications.forEach(n => {
      if (n.userId === req.user.id) {
        n.read = true;
      }
    });
    writeDB(db);
    return res.json({ message: 'Todas as notificações foram marcadas como lidas.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao marcar notificações como lidas.' });
  }
}

module.exports = {
  getNotifications,
  markRead,
  markAllRead
};
