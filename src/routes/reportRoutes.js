const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.get('/dashboard', requireAuth, requireRole(['tecnico', 'admin']), reportController.getDashboardReports);

module.exports = router;
