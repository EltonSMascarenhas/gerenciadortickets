const crypto = require('crypto');
const { readDB, writeDB, hashPassword } = require('../db');
const { verifyPassword, generateToken } = require('../auth');

function register(req, res) {
  try {
    const { name, email, password, role = 'cliente' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    // Apenas admin pode registrar outro admin
    if (role === 'admin' && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Apenas administradores podem cadastrar usuários admin.' });
    }

    const validRoles = ['cliente', 'tecnico', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'cliente';

    const db = readDB();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role: userRole,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);

    const token = generateToken(newUser);
    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
}

function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const db = readDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Login realizado com sucesso.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno no login.' });
  }
}

function me(req, res) {
  try {
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
}

module.exports = {
  register,
  login,
  me
};
