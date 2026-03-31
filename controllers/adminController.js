const { db, auth, admin } = require('../config/firebase');

// ── PÁGINA ADMIN MÉDICOS ──────────────────────────────
exports.doctorsPage = async (req, res) => {
  try {
    const [doctorsSnap, specSnap] = await Promise.all([
      db.collection('doctors').limit(100).get(),
      db.collection('specialties').get(),
    ]);
    const doctors = doctorsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => a.name > b.name ? 1 : -1);
    const specialties = specSnap.docs.map(d => d.data().name).sort();
    const activeCount = doctors.filter(d => d.isActive).length;
    const specialtyCount = new Set(doctors.map(d => d.specialty)).size;
    res.render('admin/doctors', { title: 'Gestión de Médicos', doctors, specialties, activeCount, specialtyCount });
  } catch(err) {
    console.error(err);
    res.render('error', { message: 'Error al cargar panel admin' });
  }
};

// ── OBTENER UN MÉDICO (AJAX) ──────────────────────────
exports.getDoctor = async (req, res) => {
  try {
    const doc = await db.collection('doctors').doc(req.params.id).get();
    if (!doc.exists) return res.json({ error: 'No encontrado' });
    // Buscar email en users
    const userSnap = await db.collection('users').where('doctorId','==',req.params.id).limit(1).get();
    const email = userSnap.empty ? '' : userSnap.docs[0].data().email;
    res.json({ doctor: { id: doc.id, ...doc.data(), email } });
  } catch(err) {
    res.json({ error: err.message });
  }
};

// ── CREAR MÉDICO ──────────────────────────────────────
exports.createDoctor = async (req, res) => {
  try {
    const { name, email, specialty, phone, consultationFee, experience, bio, photo, location, schedule, slotDuration } = req.body;

    // Crear usuario en Firebase Auth si se proporcionó email
    let uid;
    if (email) {
      try {
        const userRecord = await auth.createUser({
          email,
          password: 'Doctor123456!',
          displayName: name,
        });
        uid = userRecord.uid;
        // Guardar en users
        await db.collection('users').doc(uid).set({
          name, email, role: 'doctor', doctorId: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch(e) {
        // Si el email ya existe, obtener uid
        const existing = await auth.getUserByEmail(email).catch(() => null);
        uid = existing?.uid;
      }
    }

    // Crear documento en doctors
    const docRef = uid
      ? db.collection('doctors').doc(uid)
      : db.collection('doctors').doc();

    await docRef.set({
      name, specialty, phone: phone||'',
      consultationFee: Number(consultationFee)||0,
      experience: Number(experience)||0,
      bio: bio||'', photo: photo||'',
      location: location || {},
      schedule: schedule || {},
      slotDuration: Number(slotDuration)||30,
      isActive: true, verified: false,
      rating: 0, reviewCount: 0,
      userId: uid || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, id: docRef.id });
  } catch(err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
};

// ── ACTUALIZAR MÉDICO ─────────────────────────────────
exports.updateDoctor = async (req, res) => {
  try {
    const { name, specialty, phone, consultationFee, experience, bio, photo, location, schedule, slotDuration } = req.body;
    await db.collection('doctors').doc(req.params.id).update({
      name, specialty, phone: phone||'',
      consultationFee: Number(consultationFee)||0,
      experience: Number(experience)||0,
      bio: bio||'', photo: photo||'',
      location: location || {},
      schedule: schedule || {},
      slotDuration: Number(slotDuration)||30,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Actualizar nombre en users si existe
    await db.collection('users').where('doctorId','==',req.params.id).limit(1).get()
      .then(snap => { if (!snap.empty) snap.docs[0].ref.update({ name }); });
    res.json({ success: true });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
};

// ── ELIMINAR MÉDICO ───────────────────────────────────
exports.deleteDoctor = async (req, res) => {
  try {
    await db.collection('doctors').doc(req.params.id).delete();
    res.json({ success: true });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
};
