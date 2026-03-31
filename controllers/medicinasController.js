const axios = require('axios');

// URL base de la API de FastAPI (corre en puerto 8000 por defecto)
const API_URL = process.env.MEDICINAS_API_URL || 'http://localhost:8000';

const PRESENTACIONES = ['tabletas', 'cápsulas', 'jarabe', 'inyectable', 'crema', 'gotas', 'parches', 'polvo', 'supositorio', 'otro'];

// ── LISTAR (con filtros) ────────────────────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const { buscar, presentacion, receta } = req.query;

    const params = {};
    if (presentacion) params.presentacion = presentacion;
    if (receta !== undefined && receta !== '') params.receta = receta === 'true';

    const response = await axios.get(`${API_URL}/medicinas`, { params });
    let medicinas = response.data.medicinas || response.data;

    if (buscar) {
      const q = buscar.toLowerCase();
      medicinas = medicinas.filter(m =>
        m.nombre?.toLowerCase().includes(q) ||
        m.laboratorio?.toLowerCase().includes(q) ||
        m.descripcion?.toLowerCase().includes(q)
      );
    }

    medicinas.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    res.render('medicinas/index', {
      title: 'Catálogo de Medicinas',
      medicinas,
      presentaciones: PRESENTACIONES,
      filtros: { buscar: buscar || '', presentacion: presentacion || '', receta: receta || '' },
      total: medicinas.length,
    });
  } catch (err) {
    console.error('Error consultando API de medicinas:', err.message);
    const esConexion = err.code === 'ECONNREFUSED';
    res.render('error', {
      message: esConexion
        ? 'La API de medicinas no está disponible. Asegúrate de que FastAPI esté corriendo: uvicorn main:app --reload --port 8000'
        : 'Error al cargar las medicinas',
    });
  }
};

// ── VER DETALLE ─────────────────────────────────────────────────────────────
exports.show = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/medicinas/${req.params.id}`);
    const medicina = response.data;
    res.render('medicinas/show', {
      title: medicina.nombre,
      medicina: { id: req.params.id, ...medicina },
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).render('error', { message: 'Medicina no encontrada' });
    }
    res.render('error', { message: 'Error al cargar la medicina' });
  }
};

// ── FORMULARIO CREAR ────────────────────────────────────────────────────────
exports.createForm = (req, res) => {
  res.render('medicinas/form', {
    title: 'Agregar Medicina',
    presentaciones: PRESENTACIONES,
    medicina: {},
    accion: '/medicinas',
    metodo: 'POST',
  });
};

// ── CREAR ───────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { nombre, descripcion, presentacion, precio, receta, stock, laboratorio, dosis } = req.body;

    if (!nombre || !presentacion) {
      return res.render('medicinas/form', {
        title: 'Agregar Medicina',
        presentaciones: PRESENTACIONES,
        medicina: req.body,
        accion: '/medicinas',
        metodo: 'POST',
        error: 'Nombre y presentación son obligatorios.',
      });
    }

    await axios.post(`${API_URL}/medicinas`, {
      nombre:      nombre.trim(),
      descripcion: descripcion?.trim() || '',
      presentacion,
      precio:      parseFloat(precio) || 0,
      receta:      receta === 'on' || receta === 'true',
      stock:       parseInt(stock) || 0,
      laboratorio: laboratorio?.trim() || '',
      dosis:       dosis?.trim() || '',
    });

    res.redirect('/medicinas?ok=creada');
  } catch (err) {
    console.error('Error creando medicina:', err.message);
    res.render('error', { message: 'Error al guardar la medicina' });
  }
};

// ── FORMULARIO EDITAR ───────────────────────────────────────────────────────
exports.editForm = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/medicinas/${req.params.id}`);
    const medicina = response.data;
    res.render('medicinas/form', {
      title: 'Editar Medicina',
      presentaciones: PRESENTACIONES,
      medicina: { id: req.params.id, ...medicina },
      accion: `/medicinas/${req.params.id}?_method=PUT`,
      metodo: 'POST',
    });
  } catch (err) {
    res.render('error', { message: 'Error al cargar la medicina' });
  }
};

// ── ACTUALIZAR ──────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { nombre, descripcion, presentacion, precio, receta, stock, laboratorio, dosis } = req.body;

    await axios.put(`${API_URL}/medicinas/${req.params.id}`, {
      nombre:      nombre.trim(),
      descripcion: descripcion?.trim() || '',
      presentacion,
      precio:      parseFloat(precio) || 0,
      receta:      receta === 'on' || receta === 'true',
      stock:       parseInt(stock) || 0,
      laboratorio: laboratorio?.trim() || '',
      dosis:       dosis?.trim() || '',
    });

    res.redirect(`/medicinas/${req.params.id}?ok=actualizada`);
  } catch (err) {
    res.render('error', { message: 'Error al actualizar la medicina' });
  }
};

// ── ELIMINAR ────────────────────────────────────────────────────────────────
exports.destroy = async (req, res) => {
  try {
    await axios.delete(`${API_URL}/medicinas/${req.params.id}`);
    res.redirect('/medicinas?ok=eliminada');
  } catch (err) {
    res.render('error', { message: 'Error al eliminar la medicina' });
  }
};