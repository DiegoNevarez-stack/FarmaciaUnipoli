const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/auth');

router.post('/',                 requireAuth, ctrl.create);
router.get('/my',                requireAuth, ctrl.myAppointments);
router.delete('/:appointmentId', requireAuth, ctrl.cancel);
router.post('/review',           requireAuth, ctrl.submitReview);

module.exports = router;
