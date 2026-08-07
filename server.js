const express = require('express');
const path = require('path');
const { initDB } = require('./src/db');

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializa banco de dados JSON e usuário admin padrão
initDB();

// Middlewares para JSON e formulários
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos da pasta public (SPA Vanilla HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// Fallback de SPA para a página inicial
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de tratamento global de erros
app.use((err, req, res, next) => {
  console.error('[ERRO GLOBAL]', err.stack || err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Servidor de Gerenciamento de Tickets Ativo!`);
  console.log(` Acesse em: http://localhost:${PORT}`);
  console.log(` Admin padrão: admin@ticket.com / admin123`);
  console.log(`==================================================`);
});
