const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/doctors',        ctrl.doctorsPage);
router.get('/doctors/:id',    ctrl.getDoctor);
router.post('/doctors',       ctrl.createDoctor);
router.put('/doctors/:id',    ctrl.updateDoctor);
router.delete('/doctors/:id', ctrl.deleteDoctor);

module.exports = router;
