const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const initialData = {
  users: [],
  tickets: [],
  comments: [],
  history: [],
  notifications: []
};

function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let db = { ...initialData };
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(content);
      if (!db.users) db.users = [];
      if (!db.tickets) db.tickets = [];
      if (!db.comments) db.comments = [];
      if (!db.history) db.history = [];
      if (!db.notifications) db.notifications = [];
    } catch (e) {
      console.error('Erro ao ler DB JSON. Reiniciando arquivo.', e);
    }
  }

  // Seed admin se não existir nenhum admin
  const hasAdmin = db.users.some(u => u.role === 'admin');
  if (!hasAdmin) {
    const adminUser = {
      id: crypto.randomUUID(),
      name: 'Administrador',
      email: 'admin@ticket.com',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    db.users.push(adminUser);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    console.log('Seed: Usuário Admin padrão criado (admin@ticket.com / admin123)');
  }
}

function readDB() {
  initDB();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return { ...initialData };
  }
}

function writeDB(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helpers de mock de e-mail
function sendEmailMock(to, subject, body) {
  console.log(`[EMAIL MOCK] Para: ${to} | Assunto: ${subject} | Corpo: ${body}`);
}

module.exports = {
  initDB,
  readDB,
  writeDB,
  hashPassword,
  sendEmailMock
};
