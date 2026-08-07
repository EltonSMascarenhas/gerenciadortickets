const { readDB } = require('../db');

function getDashboardReports(req, res) {
  try {
    const db = readDB();
    const tickets = db.tickets;

    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'aberto').length;
    const inProgressTickets = tickets.filter(t => t.status === 'em_andamento').length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolvido').length;
    const closedTickets = tickets.filter(t => t.status === 'fechado').length;

    // Métricas por Categoria
    const categories = {};
    tickets.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + 1;
    });

    // Métricas por Prioridade
    const priorities = { baixa: 0, media: 0, alta: 0, critica: 0 };
    tickets.forEach(t => {
      if (priorities[t.priority] !== undefined) {
        priorities[t.priority]++;
      }
    });

    // Tempo médio de atendimento (criação -> closedAt em horas)
    const closedList = tickets.filter(t => t.closedAt);
    let totalResolutionHours = 0;
    closedList.forEach(t => {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.closedAt).getTime();
      const diffHours = (end - start) / (1000 * 60 * 60);
      totalResolutionHours += diffHours > 0 ? diffHours : 0;
    });
    const avgResolutionTimeHours = closedList.length > 0
      ? (totalResolutionHours / closedList.length).toFixed(1)
      : 0;

    // Desempenho por Atendente
    const techs = db.users.filter(u => u.role === 'tecnico' || u.role === 'admin');
    const techPerformance = techs.map(tech => {
      const assigned = tickets.filter(t => t.assignedTechId === tech.id);
      const techClosed = assigned.filter(t => t.closedAt);

      let techHours = 0;
      techClosed.forEach(t => {
        const diffHours = (new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        techHours += diffHours > 0 ? diffHours : 0;
      });

      const avgTime = techClosed.length > 0 ? (techHours / techClosed.length).toFixed(1) : 0;

      const ratedTickets = assigned.filter(t => t.rating != null);
      const totalRating = ratedTickets.reduce((sum, t) => sum + Number(t.rating), 0);
      const avgRating = ratedTickets.length > 0 ? (totalRating / ratedTickets.length).toFixed(1) : '-';

      return {
        techId: tech.id,
        techName: tech.name,
        email: tech.email,
        assignedCount: assigned.length,
        resolvedCount: techClosed.length,
        avgResolutionTimeHours: avgTime,
        avgRating
      };
    });

    return res.json({
      summary: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        avgResolutionTimeHours
      },
      categories,
      priorities,
      techPerformance
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao gerar relatórios.' });
  }
}

module.exports = {
  getDashboardReports
};
