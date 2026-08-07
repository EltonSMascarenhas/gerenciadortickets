# Sistema de Gerenciamento de Tickets (Helpdesk)

Sistema completo e funcional de Helpdesk desenvolvido com **Node.js, Express, Persistência JSON e Frontend SPA em HTML/CSS/JS puros**.

---

## 🚀 Como Instalar e Rodar

1. **Instalar Dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o Servidor**:
   ```bash
   npm start
   ```
   *(ou `npm run dev`)*

3. **Acessar no Navegador**:
   Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Credenciais Padrão do Administrador

Ao iniciar o sistema pela primeira vez, o seed automático cria o usuário admin:
- **E-mail:** `admin@ticket.com`
- **Senha:** `admin123`
- **Perfil:** `admin`

---

## 🛠️ Endpoints da API

### Autenticação (`/api/auth`)
- `POST /api/auth/register` — Cadastro de usuário (`cliente` ou `tecnico`).
- `POST /api/auth/login` — Autenticação via JWT.
- `GET /api/auth/me` — Obter dados do usuário logado.

### Usuários (`/api/users`) — *Admin / Técnico*
- `GET /api/users` — Listar usuários.
- `POST /api/users` — Criar novo usuário (Admin).
- `PUT /api/users/:id/role` — Alterar função de usuário (Admin).

### Tickets (`/api/tickets`)
- `GET /api/tickets` — Listar tickets (filtros por busca, status, categoria, prioridade).
- `POST /api/tickets` — Abrir novo ticket.
- `GET /api/tickets/:id` — Detalhes do ticket com comentários e histórico.
- `PUT /api/tickets/:id` — Editar informações do ticket.
- `PATCH /api/tickets/:id/status` — Atualizar status (`aberto`, `em_andamento`, `resolvido`, `fechado`).
- `PATCH /api/tickets/:id/assign` — Atribuir técnico responsável.
- `POST /api/tickets/:id/close` — Encerrar ticket registrando solução.
- `POST /api/tickets/:id/reopen` — Reabrir ticket.
- `POST /api/tickets/:id/rate` — Registrar avaliação (1-5 estrelas + comentário).
- `POST /api/tickets/:id/comments` — Adicionar comentário ao chamado.

### Notificações (`/api/notifications`)
- `GET /api/notifications` — Listar notificações in-app do usuário.
- `PATCH /api/notifications/:id/read` — Marcar notificação como lida.
- `PATCH /api/notifications/read-all` — Marcar todas como lidas.

### Relatórios (`/api/reports`) — *Admin / Técnico*
- `GET /api/reports/dashboard` — Métricas de atendimento, categorias, tempo médio e desempenho por atendente.
