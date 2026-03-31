const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/doctorController');
const { requireAuth, requireDoctor } = require('../middleware/auth');

// ── Públicas ──────────────────────────────────────────
router.get('/search',    ctrl.search);
router.get('/:id/slots', ctrl.getAvailableSlots);
router.get('/:id',       ctrl.profile);

// ── Panel médico (privado) ────────────────────────────
router.get('/panel/dashboard',
  requireAuth, requireDoctor, ctrl.dashboard);

router.get('/panel/appointments',
  requireAuth, requireDoctor, ctrl.appointments);

router.patch('/panel/appointments/:appointmentId',
  requireAuth, requireDoctor, ctrl.updateAppointment);

router.get('/panel/edit-profile',
  requireAuth, requireDoctor, ctrl.editProfile);

router.post('/panel/edit-profile',
  requireAuth, requireDoctor, ctrl.updateProfile);

module.exports = router;
