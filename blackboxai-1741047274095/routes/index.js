const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Dashboard routes
router.get('/', (req, res) => res.redirect('/dashboard'));
router.get('/dashboard', dashboardController.getDashboard);
router.get('/dashboard/stats', dashboardController.getStats);
router.get('/dashboard/geographic', dashboardController.getGeographicDistribution);
router.get('/dashboard/vendors', dashboardController.getVendorPerformance);
router.get('/dashboard/activity', dashboardController.getRecentActivity);

module.exports = router;
