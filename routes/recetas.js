const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/recetasController');
const { requireAuth, requireDoctor } = require('../middleware/auth');

// Solo doctores pueden emitir recetas
router.get('/nueva',       requireAuth, requireDoctor, ctrl.nuevaForm);
router.post('/',           requireAuth, requireDoctor, ctrl.crear);

// Pacientes ven sus propias recetas
router.get('/mis-recetas', requireAuth, ctrl.misRecetas);

module.exports = router;
