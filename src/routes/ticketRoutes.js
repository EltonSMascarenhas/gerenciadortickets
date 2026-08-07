const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.get('/', requireAuth, ticketController.listTickets);
router.post('/', requireAuth, ticketController.createTicket);
router.get('/:id', requireAuth, ticketController.getTicketById);
router.put('/:id', requireAuth, ticketController.updateTicket);
router.patch('/:id/status', requireAuth, requireRole(['tecnico', 'admin']), ticketController.updateStatus);
router.patch('/:id/assign', requireAuth, requireRole(['tecnico', 'admin']), ticketController.assignTicket);
router.post('/:id/close', requireAuth, requireRole(['tecnico', 'admin']), ticketController.closeTicket);
router.post('/:id/reopen', requireAuth, ticketController.reopenTicket);
router.post('/:id/rate', requireAuth, ticketController.rateTicket);
router.post('/:id/comments', requireAuth, ticketController.addComment);

module.exports = router;
