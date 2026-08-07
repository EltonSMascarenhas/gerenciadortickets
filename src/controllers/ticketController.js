const crypto = require('crypto');
const { readDB, writeDB, sendEmailMock } = require('../db');

function createNotification(db, userId, title, message, ticketId) {
  const notif = {
    id: crypto.randomUUID(),
    userId,
    title,
    message,
    ticketId,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(notif);
}

function logHistory(db, ticketId, userId, userName, action, details = '') {
  db.history.push({
    id: crypto.randomUUID(),
    ticketId,
    userId,
    userName,
    action,
    details,
    timestamp: new Date().toISOString()
  });
}

function listTickets(req, res) {
  try {
    const db = readDB();
    let tickets = [...db.tickets];

    // Regra de Acesso: cliente só vê os seus próprios tickets
    if (req.user.role === 'cliente') {
      tickets = tickets.filter(t => t.clientId === req.user.id);
    }

    // Filtros por query params
    const { status, category, priority, assignedTechId, clientId, search } = req.query;

    if (status) tickets = tickets.filter(t => t.status === status);
    if (category) tickets = tickets.filter(t => t.category === category);
    if (priority) tickets = tickets.filter(t => t.priority === priority);
    if (assignedTechId) tickets = tickets.filter(t => t.assignedTechId === assignedTechId);
    if (clientId) tickets = tickets.filter(t => t.clientId === clientId);
    
    if (search) {
      const q = search.toLowerCase();
      tickets = tickets.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        String(t.number).includes(q) ||
        (t.clientName && t.clientName.toLowerCase().includes(q))
      );
    }

    // Ordenação decrescente por data
    tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ tickets });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar tickets.' });
  }
}

function createTicket(req, res) {
  try {
    const { title, description, category, priority = 'media', attachments = [] } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Título, descrição e categoria são obrigatórios.' });
    }

    const validPriorities = ['baixa', 'media', 'alta', 'critica'];
    const p = validPriorities.includes(priority) ? priority : 'media';

    const db = readDB();

    // Calcular próximo número de ticket
    const lastNumber = db.tickets.reduce((max, t) => (t.number > max ? t.number : max), 1000);
    const ticketNumber = lastNumber + 1;

    const newTicket = {
      id: crypto.randomUUID(),
      number: ticketNumber,
      title,
      description,
      category,
      priority: p,
      status: 'aberto',
      clientId: req.user.id,
      clientName: req.user.name,
      assignedTechId: null,
      assignedTechName: null,
      solution: null,
      closedAt: null,
      rating: null,
      ratingComment: null,
      attachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.tickets.push(newTicket);
    logHistory(db, newTicket.id, req.user.id, req.user.name, 'Criação', `Ticket criado com prioridade ${p}`);

    // Notificar técnicos e admins
    const staff = db.users.filter(u => u.role === 'tecnico' || u.role === 'admin');
    staff.forEach(u => {
      createNotification(db, u.id, 'Novo Ticket Criado', `Ticket #${ticketNumber}: "${title}" criado por ${req.user.name}`, newTicket.id);
    });

    sendEmailMock(req.user.email, `Ticket #${ticketNumber} criado`, `Olá ${req.user.name}, seu ticket foi registrado com sucesso.`);

    writeDB(db);

    return res.status(201).json({ message: 'Ticket criado com sucesso.', ticket: newTicket });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar ticket.' });
  }
}

function getTicketById(req, res) {
  try {
    const { id } = req.params;
    const db = readDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }

    // Regra de Acesso: cliente só acessa próprio ticket
    if (req.user.role === 'cliente' && ticket.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado a este ticket.' });
    }

    const comments = db.comments.filter(c => c.ticketId === id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const history = db.history.filter(h => h.ticketId === id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.json({ ticket, comments, history });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar detalhes do ticket.' });
  }
}

function updateTicket(req, res) {
  try {
    const { id } = req.params;
    const { title, description, category, priority } = req.body;

    const db = readDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    // Cliente só edita seus tickets enquanto estiver aberto
    if (req.user.role === 'cliente') {
      if (ticket.clientId !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });
      if (ticket.status !== 'aberto') return res.status(400).json({ error: 'Tickets só podem ser editados enquanto estiverem Abertos.' });
    }

    if (title) ticket.title = title;
    if (description) ticket.description = description;
    if (category) ticket.category = category;
    if (priority && ['baixa', 'media', 'alta', 'critica'].includes(priority)) ticket.priority = priority;

    ticket.updatedAt = new Date().toISOString();
    logHistory(db, ticket.id, req.user.id, req.user.name, 'Edição', 'Informações do ticket atualizadas');

    writeDB(db);
    return res.json({ message: 'Ticket atualizado.', ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar ticket.' });
  }
}

function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['aberto', 'em_andamento', 'resolvido', 'fechado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const db = readDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    if (req.user.role === 'cliente') {
      return res.status(403).json({ error: 'Clientes devem usar rota de reabertura ou fechamento/avaliação.' });
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    if (status === 'fechado' && !ticket.closedAt) {
      ticket.closedAt = new Date().toISOString();
    }

    logHistory(db, ticket.id, req.user.id, req.user.name, 'Mudança de Status', `Status alterado de ${oldStatus} para ${status}`);

    // Notificar cliente
    createNotification(db, ticket.clientId, 'Status Alterado', `Seu ticket #${ticket.number} teve o status alterado para "${status}"`, ticket.id);

    writeDB(db);
    return res.json({ message: 'Status atualizado com sucesso.', ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao alterar status.' });
  }
}

function assignTicket(req, res) {
  try {
    const { id } = req.params;
    const { techId } = req.body;

    const db = readDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    const tech = db.users.find(u => u.id === techId && (u.role === 'tecnico' || u.role === 'admin'));
    if (!tech) return res.status(400).json({ error: 'Técnico informado é inválido.' });

    ticket.assignedTechId = tech.id;
    ticket.assignedTechName = tech.name;
    if (ticket.status === 'aberto') ticket.status = 'em_andamento';
    ticket.updatedAt = new Date().toISOString();

    logHistory(db, ticket.id, req.user.id, req.user.name, 'Atribuição', `Atribuído ao técnico ${tech.name}`);

    createNotification(db, tech.id, 'Novo Ticket Atribuído', `Você foi atribuído ao ticket #${ticket.number}`, ticket.id);
    createNotification(db, ticket.clientId, 'Técnico Atribuído', `O técnico ${tech.name} assumiu seu ticket #${ticket.number}`, ticket.id);

    writeDB(db);
    return res.json({ message: 'Técnico atribuído com sucesso.', ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atribuir técnico.' });
  }
}

function closeTicket(req, res) {
  try {
    const { id } = req.params;
    const { solution } = req.body;

    if (!solution) return res.status(400).json({ error: 'Descrição da solução aplicada é obrigatória.' });

    const db = readDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    ticket.solution = solution;
    ticket.status = 'fechado';
    ticket.closedAt = new Date().toISOString();
    ticket.updatedAt = new Date().toISOString();

    logHistory(db, ticket.id, req.user.id, req.user.name, 'Encerramento', `Solução: ${solution}`);

    createNotification(db, ticket.clientId, 'Ticket Encerrado', `Seu ticket #${ticket.number} foi encerrado com solução registrada.`, ticket.id);

    sendEmailMock(req.user.email, `Ticket #${ticket.number} Encerrado`, `Solução aplicada: ${solution}`);

    writeDB(db);
    return res.json({ message: 'Ticket encerrado com sucesso.', ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao encerrar ticket.' });
  }
}

function reopenTicket(req, res) {
  try {
    const { id } = req.params;
    const db = readDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    if (req.user.role === 'cliente' && ticket.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    if (ticket.status !== 'resolvido' && ticket.status !== 'fechado') {
      return res.status(400).json({ error: 'Apenas tickets resolvidos ou fechados podem ser reabertos.' });
    }

    ticket.status = 'aberto';
    ticket.updatedAt = new Date().toISOString();
    logHistory(db, ticket.id, req.user.id, req.user.name, 'Reabertura', 'Ticket reaberto pelo usuário');

    if (ticket.assignedTechId) {
      createNotification(db, ticket.assignedTechId, 'Ticket Reaberto', `O ticket #${ticket.number} foi reaberto.`, ticket.id);
    }

    writeDB(db);
    return res.json({ message: 'Ticket reaberto com sucesso.', ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao reabrir ticket.' });
  }
}

function rateTicket(req, res) {
  try {
    const { id } = req.params;
    const { rating, ratingComment } = req.body;

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Nota deve ser um número de 1 a 5.' });
    }

    const db = readDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    if (req.user.role === 'cliente' && ticket.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode avaliar seus próprios tickets.' });
    }

    if (ticket.status !== 'fechado' && ticket.status !== 'resolvido') {
      return res.status(400).json({ error: 'Avaliação permitida apenas após o encerramento do ticket.' });
    }

    ticket.rating = numRating;
    ticket.ratingComment = ratingComment || null;

    logHistory(db, ticket.id, req.user.id, req.user.name, 'Avaliação', `Nota ${numRating}/5: ${ratingComment || 'Sem comentário'}`);

    if (ticket.assignedTechId) {
      createNotification(db, ticket.assignedTechId, 'Ticket Avaliado', `Ticket #${ticket.number} recebeu nota ${numRating}/5.`, ticket.id);
    }

    writeDB(db);
    return res.json({ message: 'Avaliação registrada com sucesso.', ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao registrar avaliação.' });
  }
}

function addComment(req, res) {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Texto do comentário é obrigatório.' });
    }

    const db = readDB();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    if (req.user.role === 'cliente' && ticket.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const comment = {
      id: crypto.randomUUID(),
      ticketId: id,
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    db.comments.push(comment);
    ticket.updatedAt = new Date().toISOString();

    logHistory(db, ticket.id, req.user.id, req.user.name, 'Novo Comentário', text.trim().substring(0, 50));

    // Notificação cruzada
    if (req.user.id === ticket.clientId && ticket.assignedTechId) {
      createNotification(db, ticket.assignedTechId, 'Novo Comentário', `${req.user.name} comentou no ticket #${ticket.number}`, ticket.id);
    } else if (req.user.id !== ticket.clientId) {
      createNotification(db, ticket.clientId, 'Novo Comentário no Ticket', `${req.user.name} respondeu ao seu ticket #${ticket.number}`, ticket.id);
    }

    writeDB(db);
    return res.status(201).json({ message: 'Comentário adicionado.', comment });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao adicionar comentário.' });
  }
}

module.exports = {
  listTickets,
  createTicket,
  getTicketById,
  updateTicket,
  updateStatus,
  assignTicket,
  closeTicket,
  reopenTicket,
  rateTicket,
  addComment
};
