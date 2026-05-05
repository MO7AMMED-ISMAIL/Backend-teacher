// src/routes/adminDashboardRoutes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/adminDashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);
router.get('/', authMiddleware.isAdmin, controller.getAdminDashboard);

module.exports = router;
