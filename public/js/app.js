// ESTADO GLOBAL DA APLICAÇÃO
let currentUser = null;
let authToken = localStorage.getItem('helpdesk_token') || null;
let currentDetailTicketId = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
  setupFormListeners();
  if (authToken) {
    fetchProfile();
  } else {
    showAuthScreen();
  }
});

// CLIENTE HTTP COM AUTENTICAÇÃO JWT
async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 && authToken) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        logout();
      }
      throw new Error(data.error || 'Erro na requisição.');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

// AUTENTICAÇÃO E PERFIL
async function fetchProfile() {
  try {
    const data = await apiFetch('/api/auth/me');
    currentUser = data.user;
    updateUserUI();
    showAppScreen();
    loadTickets();
    loadNotifications();
  } catch (e) {
    logout();
  }
}

function updateUserUI() {
  document.getElementById('user-display-name').textContent = currentUser.name;
  document.getElementById('user-display-role').textContent = currentUser.role;

  // Controle de visibilidade de abas por perfil
  const navReports = document.getElementById('nav-reports');
  const navUsers = document.getElementById('nav-users');

  if (currentUser.role === 'tecnico' || currentUser.role === 'admin') {
    navReports.classList.remove('hidden');
  } else {
    navReports.classList.add('hidden');
  }

  if (currentUser.role === 'admin') {
    navUsers.classList.remove('hidden');
  } else {
    navUsers.classList.add('hidden');
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('helpdesk_token');
  showAuthScreen();
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

function showAppScreen() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  switchView('tickets');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const loginBtn = document.getElementById('tab-login-btn');
  const regBtn = document.getElementById('tab-register-btn');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    loginBtn.classList.remove('active');
    regBtn.classList.add('active');
  }
}

// FORMULÁRIOS DE AUTH
function setupFormListeners() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('helpdesk_token', authToken);
      showToast('Login realizado com sucesso!', 'success');
      updateUserUI();
      showAppScreen();
      loadTickets();
      loadNotifications();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('helpdesk_token', authToken);
      showToast('Conta criada com sucesso!', 'success');
      updateUserUI();
      showAppScreen();
      loadTickets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Novo Ticket Form
  document.getElementById('new-ticket-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('ticket-title').value;
    const category = document.getElementById('ticket-category').value;
    const priority = document.getElementById('ticket-priority').value;
    const description = document.getElementById('ticket-desc').value;
    const fileInput = document.getElementById('ticket-file');

    let attachments = [];
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const base64 = await readFileAsBase64(file);
      attachments.push({ name: file.name, data: base64 });
    }

    try {
      await apiFetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({ title, category, priority, description, attachments })
      });
      showToast('Ticket aberto com sucesso!', 'success');
      closeModal('modal-new-ticket');
      document.getElementById('new-ticket-form').reset();
      loadTickets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Adicionar comentário
  document.getElementById('add-comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.getElementById('comment-text').value;
    if (!currentDetailTicketId) return;

    try {
      await apiFetch(`/api/tickets/${currentDetailTicketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      document.getElementById('comment-text').value = '';
      openTicketDetail(currentDetailTicketId);
      showToast('Comentário enviado.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Cadastrar usuário pelo Admin
  document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const role = document.getElementById('new-user-role').value;

    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });
      showToast('Usuário cadastrado!', 'success');
      document.getElementById('create-user-form').reset();
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// NAVEGAÇÃO DE VIEWS
function switchView(viewName) {
  document.querySelectorAll('.main-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  document.getElementById(`view-${viewName}`).classList.remove('hidden');
  const navBtn = document.getElementById(`nav-${viewName}`);
  if (navBtn) navBtn.classList.add('active');

  if (viewName === 'tickets') loadTickets();
  if (viewName === 'reports') loadReports();
  if (viewName === 'users') loadUsers();
}

// CARREGAR TICKETS & MÉTRICAS
async function loadTickets() {
  const search = document.getElementById('filter-search').value;
  const status = document.getElementById('filter-status').value;
  const category = document.getElementById('filter-category').value;
  const priority = document.getElementById('filter-priority').value;

  const query = new URLSearchParams({ search, status, category, priority }).toString();

  try {
    const data = await apiFetch(`/api/tickets?${query}`);
    renderTicketsTable(data.tickets);
    updateMetrics(data.tickets);
  } catch (err) {
    showToast('Erro ao carregar tickets.', 'error');
  }
}

function updateMetrics(tickets) {
  document.getElementById('metric-total').textContent = tickets.length;
  document.getElementById('metric-open').textContent = tickets.filter(t => t.status === 'aberto').length;
  document.getElementById('metric-progress').textContent = tickets.filter(t => t.status === 'em_andamento').length;
  document.getElementById('metric-resolved').textContent = tickets.filter(t => t.status === 'resolvido' || t.status === 'fechado').length;
}

function renderTicketsTable(tickets) {
  const tbody = document.getElementById('tickets-tbody');
  if (tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center italic-text">Nenhum ticket encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = tickets.map(t => `
    <tr>
      <td><span class="ticket-tag">#${t.number}</span></td>
      <td><b>${escapeHtml(t.title)}</b></td>
      <td>${escapeHtml(t.clientName || 'Cliente')}</td>
      <td>${escapeHtml(t.category)}</td>
      <td><span class="badge badge-priority-${t.priority}">${t.priority}</span></td>
      <td><span class="badge badge-status-${t.status}">${formatStatus(t.status)}</span></td>
      <td>${escapeHtml(t.assignedTechName || 'Pendente')}</td>
      <td><small>${new Date(t.createdAt).toLocaleDateString('pt-BR')} ${new Date(t.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</small></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openTicketDetail('${t.id}')">Ver Detalhes</button>
      </td>
    </tr>
  `).join('');
}

// MODAL DE DETALHES DO TICKET
async function openTicketDetail(ticketId) {
  currentDetailTicketId = ticketId;
  try {
    const data = await apiFetch(`/api/tickets/${ticketId}`);
    const t = data.ticket;

    document.getElementById('detail-ticket-number').textContent = `#${t.number}`;
    document.getElementById('detail-ticket-title').textContent = t.title;
    document.getElementById('detail-ticket-status').innerHTML = `<span class="badge badge-status-${t.status}">${formatStatus(t.status)}</span>`;
    document.getElementById('detail-ticket-priority').innerHTML = `<span class="badge badge-priority-${t.priority}">${t.priority}</span>`;
    document.getElementById('detail-ticket-category').textContent = t.category;
    document.getElementById('detail-ticket-client').textContent = t.clientName;
    document.getElementById('detail-ticket-tech').textContent = t.assignedTechName || 'Pendente';
    document.getElementById('detail-ticket-date').textContent = new Date(t.createdAt).toLocaleString('pt-BR');
    document.getElementById('detail-ticket-desc').textContent = t.description;

    // Anexo
    const attBox = document.getElementById('detail-ticket-attachment');
    if (t.attachments && t.attachments.length > 0) {
      attBox.classList.remove('hidden');
      const file = t.attachments[0];
      attBox.innerHTML = `📎 <b>Anexo:</b> <a href="${file.data}" download="${file.name}" target="_blank">${file.name}</a>`;
    } else {
      attBox.classList.add('hidden');
    }

    // Solução
    const solBox = document.getElementById('solution-box');
    if (t.solution) {
      solBox.classList.remove('hidden');
      document.getElementById('detail-solution-text').textContent = t.solution;
    } else {
      solBox.classList.add('hidden');
    }

    // Avaliação
    const ratBox = document.getElementById('rating-box');
    if (t.rating) {
      ratBox.classList.remove('hidden');
      document.getElementById('detail-rating-stars').textContent = '⭐'.repeat(t.rating) + ` (${t.rating}/5)`;
      document.getElementById('detail-rating-comment').textContent = t.ratingComment ? `"${t.ratingComment}"` : '';
    } else {
      ratBox.classList.add('hidden');
    }

    // Configurar Painel de Ações conforme Perfil
    setupActionPanel(t);

    // Renderizar Comentários & Histórico
    renderComments(data.comments);
    renderHistory(data.history);

    openModal('modal-ticket-detail');
  } catch (err) {
    showToast('Erro ao carregar detalhes do ticket.', 'error');
  }
}

async function setupActionPanel(ticket) {
  const isStaff = currentUser.role === 'tecnico' || currentUser.role === 'admin';
  const isClient = currentUser.role === 'cliente';

  const actionAssign = document.getElementById('action-assign');
  const actionStatus = document.getElementById('action-status');
  const actionClose = document.getElementById('action-close');
  const actionReopen = document.getElementById('action-reopen');
  const actionRate = document.getElementById('action-rate');

  // Reset visibilidade
  actionAssign.classList.add('hidden');
  actionStatus.classList.add('hidden');
  actionClose.classList.add('hidden');
  actionReopen.classList.add('hidden');
  actionRate.classList.add('hidden');

  if (isStaff) {
    actionAssign.classList.remove('hidden');
    actionStatus.classList.remove('hidden');

    // Carregar lista de técnicos para o select de atribuição
    try {
      const usersData = await apiFetch('/api/users');
      const techs = usersData.users.filter(u => u.role === 'tecnico' || u.role === 'admin');
      const select = document.getElementById('assign-tech-select');
      select.innerHTML = techs.map(tech => `
        <option value="${tech.id}" ${ticket.assignedTechId === tech.id ? 'selected' : ''}>${tech.name} (${tech.role})</option>
      `).join('');
    } catch(e) {}

    document.getElementById('status-select').value = ticket.status;

    if (ticket.status !== 'fechado') {
      actionClose.classList.remove('hidden');
    }
  }

  // Reabertura de chamado (Cliente/Tech/Admin quando resolvido/fechado)
  if (ticket.status === 'resolvido' || ticket.status === 'fechado') {
    actionReopen.classList.remove('hidden');
  }

  // Avaliação (Cliente quando fechado/resolvido e ainda sem avaliação)
  if (isClient && (ticket.status === 'fechado' || ticket.status === 'resolvido') && !ticket.rating) {
    actionRate.classList.remove('hidden');
  }
}

// SUBMIT DE AÇÕES NO DETAIL TICKET
async function submitAssignTech() {
  const techId = document.getElementById('assign-tech-select').value;
  try {
    await apiFetch(`/api/tickets/${currentDetailTicketId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ techId })
    });
    showToast('Técnico atribuído com sucesso!', 'success');
    openTicketDetail(currentDetailTicketId);
    loadTickets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitStatusChange() {
  const status = document.getElementById('status-select').value;
  try {
    await apiFetch(`/api/tickets/${currentDetailTicketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showToast('Status atualizado!', 'success');
    openTicketDetail(currentDetailTicketId);
    loadTickets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitCloseTicket() {
  const solution = document.getElementById('close-solution-text').value;
  if (!solution) return showToast('Preencha a descrição da solução.', 'error');
  try {
    await apiFetch(`/api/tickets/${currentDetailTicketId}/close`, {
      method: 'POST',
      body: JSON.stringify({ solution })
    });
    showToast('Ticket encerrado!', 'success');
    document.getElementById('close-solution-text').value = '';
    openTicketDetail(currentDetailTicketId);
    loadTickets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitReopenTicket() {
  try {
    await apiFetch(`/api/tickets/${currentDetailTicketId}/reopen`, { method: 'POST' });
    showToast('Ticket reaberto com sucesso!', 'success');
    openTicketDetail(currentDetailTicketId);
    loadTickets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitRateTicket() {
  const rating = document.getElementById('rate-select').value;
  const ratingComment = document.getElementById('rate-comment').value;
  try {
    await apiFetch(`/api/tickets/${currentDetailTicketId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, ratingComment })
    });
    showToast('Obrigado pela sua avaliação!', 'success');
    openTicketDetail(currentDetailTicketId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderComments(comments) {
  const list = document.getElementById('comments-list');
  if (comments.length === 0) {
    list.innerHTML = `<p class="empty-state">Sem comentários até o momento.</p>`;
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-bubble">
      <div>
        <span class="comment-author">${escapeHtml(c.authorName)} (${c.authorRole})</span>
        <span class="comment-date">${new Date(c.createdAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      <div class="comment-text">${escapeHtml(c.text)}</div>
    </div>
  `).join('');
}

function renderHistory(history) {
  const list = document.getElementById('history-list');
  if (history.length === 0) {
    list.innerHTML = `<p class="empty-state">Sem registros de histórico.</p>`;
    return;
  }
  list.innerHTML = history.map(h => `
    <div class="history-item">
      <div><span class="h-action">${escapeHtml(h.action)}</span> por <b>${escapeHtml(h.userName)}</b></div>
      <div class="h-meta">${escapeHtml(h.details || '')} - <small>${new Date(h.timestamp).toLocaleString('pt-BR')}</small></div>
    </div>
  `).join('');
}

function switchDetailTab(tab) {
  document.getElementById('detail-tab-comments').classList.toggle('hidden', tab !== 'comments');
  document.getElementById('detail-tab-history').classList.toggle('hidden', tab !== 'history');
  document.getElementById('tab-comments-btn').classList.toggle('active', tab === 'comments');
  document.getElementById('tab-history-btn').classList.toggle('active', tab === 'history');
}

// CARREGAR RELATÓRIOS (TECNICO / ADMIN)
async function loadReports() {
  try {
    const data = await apiFetch('/api/reports/dashboard');
    document.getElementById('report-avg-time').textContent = `${data.summary.avgResolutionTimeHours}h`;

    // Gráfico de Categorias
    const catContainer = document.getElementById('chart-categories');
    const totalCat = Object.values(data.categories).reduce((a, b) => a + b, 0) || 1;
    catContainer.innerHTML = Object.entries(data.categories).map(([cat, count]) => {
      const pct = Math.round((count / totalCat) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label"><span>${cat}</span> <b>${count} (${pct}%)</b></div>
          <div class="bar-track"><div class="bar-fill" style="width: ${pct}%;"></div></div>
        </div>
      `;
    }).join('') || '<p class="empty-state">Sem dados.</p>';

    // Gráfico de Prioridades
    const prioContainer = document.getElementById('chart-priorities');
    const totalPrio = Object.values(data.priorities).reduce((a, b) => a + b, 0) || 1;
    prioContainer.innerHTML = Object.entries(data.priorities).map(([prio, count]) => {
      const pct = Math.round((count / totalPrio) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label"><span>${prio.toUpperCase()}</span> <b>${count} (${pct}%)</b></div>
          <div class="bar-track"><div class="bar-fill" style="width: ${pct}%;"></div></div>
        </div>
      `;
    }).join('') || '<p class="empty-state">Sem dados.</p>';

    // Tabela de Atendentes
    const techTbody = document.getElementById('tech-perf-tbody');
    techTbody.innerHTML = data.techPerformance.map(t => `
      <tr>
        <td><b>${escapeHtml(t.techName)}</b></td>
        <td>${escapeHtml(t.email)}</td>
        <td>${t.assignedCount}</td>
        <td>${t.resolvedCount}</td>
        <td>${t.avgResolutionTimeHours}h</td>
        <td><b>⭐ ${t.avgRating}</b></td>
      </tr>
    `).join('') || `<tr><td colspan="6" class="text-center italic-text">Nenhum atendente.</td></tr>`;
  } catch (err) {
    showToast('Erro ao carregar relatórios.', 'error');
  }
}

// CARREGAR USUÁRIOS (ADMIN)
async function loadUsers() {
  try {
    const data = await apiFetch('/api/users');
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td><b>${escapeHtml(u.name)}</b></td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge badge-priority-media">${u.role}</span></td>
        <td>
          <select onchange="updateUserRole('${u.id}', this.value)" ${u.id === currentUser.id ? 'disabled' : ''}>
            <option value="cliente" ${u.role === 'cliente' ? 'selected' : ''}>Cliente</option>
            <option value="tecnico" ${u.role === 'tecnico' ? 'selected' : ''}>Técnico</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Erro ao carregar usuários.', 'error');
  }
}

async function updateUserRole(userId, newRole) {
  try {
    await apiFetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    showToast('Função do usuário atualizada!', 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// NOTIFICAÇÕES IN-APP
async function loadNotifications() {
  try {
    const data = await apiFetch('/api/notifications');
    const badge = document.getElementById('notif-badge');
    if (data.unreadCount > 0) {
      badge.textContent = data.unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    const list = document.getElementById('notif-list');
    if (data.notifications.length === 0) {
      list.innerHTML = `<p class="empty-state">Nenhuma notificação nova.</p>`;
      return;
    }

    list.innerHTML = data.notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}', '${n.ticketId}')">
        <div class="n-title">${escapeHtml(n.title)}</div>
        <div class="n-msg">${escapeHtml(n.message)}</div>
        <div class="n-date">${new Date(n.createdAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</div>
      </div>
    `).join('');
  } catch (e) {}
}

async function handleNotifClick(notifId, ticketId) {
  try {
    await apiFetch(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
    loadNotifications();
    if (ticketId) openTicketDetail(ticketId);
  } catch (e) {}
}

async function markAllNotifsRead() {
  try {
    await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
    loadNotifications();
    showToast('Todas notificações lidas.', 'success');
  } catch (e) {}
}

function toggleNotifDropdown() {
  document.getElementById('notif-dropdown').classList.toggle('hidden');
}

// AUXILIARES
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function openNewTicketModal() { openModal('modal-new-ticket'); }

function formatStatus(status) {
  const map = { aberto: 'Aberto', em_andamento: 'Em Andamento', resolvido: 'Resolvido', fechado: 'Fechado' };
  return map[status] || status;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
