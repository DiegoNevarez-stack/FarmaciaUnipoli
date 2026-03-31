const axios = require('axios');
const { db } = require('../config/firebase');

const API_URL = process.env.MEDICINAS_API_URL || 'http://localhost:8000';

async function getMedicinas() {
  const response = await axios.get(`${API_URL}/medicinas`);
  return response.data.medicinas || response.data || [];
}

async function getPacientes() {
  const snap = await db.collection('users').where('role', '==', 'patient').get();
  return snap.docs.map(d => ({ id: d.id, email: d.data().email, name: d.data().name || '' }));
}

// ── FORMULARIO NUEVA RECETA ──────────────────────────────────────────────────
exports.nuevaForm = async (req, res) => {
  try {
    const [medicinas, pacientes] = await Promise.all([getMedicinas(), getPacientes()]);
    res.render('recetas/nueva', { title: 'Emitir Receta', medicinas, pacientes, doctor: req.user });
  } catch (err) {
    console.error('Error cargando formulario:', err.message);
    res.render('error', {
      message: err.code === 'ECONNREFUSED'
        ? 'La API de medicinas no está disponible. Inicia FastAPI: uvicorn main:app --reload --port 8000'
        : 'Error al cargar el formulario de receta',
    });
  }
};

// ── CREAR RECETA (una sola receta con varios medicamentos) ───────────────────
exports.crear = async (req, res) => {
  try {
    const { paciente_email } = req.body;

    // Normalizar arrays
    const ids       = [].concat(req.body['medicina_id[]']   || req.body.medicina_id   || []);
    const dosis_arr = [].concat(req.body['dosis[]']         || req.body.dosis         || []);
    const indic_arr = [].concat(req.body['indicaciones[]']  || req.body.indicaciones  || []);

    const idsValidos = ids.filter(i => i && i.trim() !== '');

    if (!paciente_email || idsValidos.length === 0) {
      const [medicinas, pacientes] = await Promise.all([getMedicinas(), getPacientes()]);
      return res.render('recetas/nueva', {
        title: 'Emitir Receta', medicinas, pacientes, doctor: req.user,
        error: 'El correo del paciente y al menos un medicamento son obligatorios.',
        datos: req.body,
      });
    }

    // Resolver nombres de medicamentos desde la API
    const medicamentos = [];
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i] || ids[i].trim() === '') continue;
      try {
        const resp = await axios.get(`${API_URL}/medicinas/${ids[i]}`);
        medicamentos.push({
          nombre:       resp.data.nombre,
          dosis:        (dosis_arr[i] || '').trim(),
          indicaciones: (indic_arr[i] || '').trim(),
        });
      } catch (e) {
        console.error(`Medicina ${ids[i]} no encontrada:`, e.message);
      }
    }

    if (medicamentos.length === 0) {
      const [medicinas, pacientes] = await Promise.all([getMedicinas(), getPacientes()]);
      return res.render('recetas/nueva', {
        title: 'Emitir Receta', medicinas, pacientes, doctor: req.user,
        error: 'No se encontraron los medicamentos seleccionados en la API.',
        datos: req.body,
      });
    }

    const folio        = `RX-${Date.now()}`;
    const fechaEmision = new Date().toISOString().split('T')[0];
    const doctorNombre = req.user.name || req.user.email;
    const doctorEmail  = req.user.email;

    // ── UN SOLO POST a la API con todos los medicamentos ──
    await axios.post(`${API_URL}/recetas`, {
      folio,
      paciente_email,
      doctor_email:  doctorEmail,
      doctor_nombre: doctorNombre,
      medicamentos,           // array completo
      fecha_emision: fechaEmision,
    });

    const receta = {
      folio,
      fecha:    new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
      doctor:   { nombre: doctorNombre, email: doctorEmail },
      paciente: { email: paciente_email },
      medicamentos,
    };

    res.render('recetas/ver', { title: `Receta ${folio}`, receta, imprimir: true });

  } catch (err) {
    console.error('Error creando receta:', err.message);
    res.render('error', { message: 'Error al generar la receta' });
  }
};

// ── MIS RECETAS (paciente) ───────────────────────────────────────────────────
exports.misRecetas = async (req, res) => {
  try {
    const email = req.user.email;
    const response = await axios.get(`${API_URL}/recetas`, { params: { paciente_email: email } });
    const recetas = response.data || [];
    res.render('recetas/mis-recetas', { title: 'Mis Recetas', recetas, user: req.user });
  } catch (err) {
    console.error('Error cargando mis recetas:', err.message);
    res.render('error', { message: 'Error al cargar tus recetas. Verifica que la API esté activa.' });
  }
};
