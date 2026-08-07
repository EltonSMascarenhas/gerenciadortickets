const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.get('/', requireAuth, requireRole(['admin', 'tecnico']), userController.listUsers);
router.post('/', requireAuth, requireRole(['admin']), userController.createUser);
router.put('/:id/role', requireAuth, requireRole(['admin']), userController.updateRole);

module.exports = router;
