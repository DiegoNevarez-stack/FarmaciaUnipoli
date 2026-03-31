const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/medicinasController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Cualquier usuario autenticado puede ver el catálogo
router.get('/',          requireAuth, ctrl.index);
router.get('/nueva',     requireAuth, requireAdmin, ctrl.createForm);
router.post('/',         requireAuth, requireAdmin, ctrl.create);
router.get('/:id',       requireAuth, ctrl.show);
router.get('/:id/editar',requireAuth, requireAdmin, ctrl.editForm);
router.put('/:id',       requireAuth, requireAdmin, ctrl.update);
router.delete('/:id',    requireAuth, requireAdmin, ctrl.destroy);

module.exports = router;
