const crypto = require('crypto');
const { readDB, writeDB, hashPassword } = require('../db');

function listUsers(req, res) {
  try {
    const db = readDB();
    const users = db.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
}

function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Nome, email, senha e função são obrigatórios.' });
    }

    const validRoles = ['cliente', 'tecnico', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Função inválida. Use cliente, tecnico ou admin.' });
    }

    const db = readDB();
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'E-mail já está cadastrado.' });
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);

    return res.status(201).json({
      message: 'Usuário criado com sucesso.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}

function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['cliente', 'tecnico', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Função inválida.' });
    }

    const db = readDB();
    const user = db.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    user.role = role;
    writeDB(db);

    return res.json({ message: 'Função do usuário atualizada com sucesso.', user: { id: user.id, role: user.role } });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar função.' });
  }
}

module.exports = {
  listUsers,
  createUser,
  updateRole
};
