const { db, admin } = require('../config/firebase');
const whatsapp = require('../services/whatsapp');

// ── CREAR CITA ────────────────────────────────────────
exports.create = async (req, res) => {
  const { doctorId, date, time, reason, patientPhone } = req.body;
  try {
    const [doctorDoc, patientDoc] = await Promise.all([
      db.collection('doctors').doc(doctorId).get(),
      db.collection('users').doc(req.user.id).get(),
    ]);

    if (!doctorDoc.exists) return res.json({ success:false, error:'Médico no encontrado' });

    const doctor  = doctorDoc.data();
    const patient = patientDoc.data();

    // Guardar cita
    const apptRef = await db.collection('appointments').add({
      doctorId, patientId: req.user.id,
      doctorName: doctor.name || '',
      patientName: patient.name || '',
      patientPhone: patientPhone || patient.phone || '',
      doctorPhone: doctor.phone || '',
      date, time,
      reason: reason || '',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // WhatsApp al paciente
    const phone = patientPhone || patient.phone || '';
    if (phone) {
      try {
        await whatsapp.sendAppointmentConfirmation({
          patientPhone: phone,
          patientName: patient.name || 'Paciente',
          doctorName: doctor.name || 'Médico',
          date, time,
          lat: doctor.location?.lat, lng: doctor.location?.lng, address: doctor.location?.address,
        });
      } catch (e) {
        console.error('WhatsApp paciente falló:', e.message);
      }
    }

    // WhatsApp al médico (solo si tiene teléfono)
    if (doctor.phone) {
      try {
        await whatsapp.sendDoctorNewAppointmentAlert({
          doctorPhone: doctor.phone,
          patientName: patient.name || 'Paciente',
          date, time,
          reason: reason || 'No especificado',
        });
      } catch (e) {
        console.error('WhatsApp médico falló:', e.message);
      }
    }

    res.json({ success:true, appointmentId:apptRef.id });
  } catch (err) {
    console.error(err);
    res.json({ success:false, error:'Error al crear cita' });
  }
};

// ── MIS CITAS (PACIENTE) ──────────────────────────────
exports.myAppointments = async (req, res) => {
  try {
    // Sin orderBy para evitar necesitar índice
    const snap = await db.collection('appointments')
      .where('patientId','==',req.user.id).limit(30).get();
    const appointments = snap.docs
      .map(d => ({ id:d.id, ...d.data() }))
      .sort((a,b) => (b.date > a.date ? 1 : -1));
    res.render('patient/appointments', {
      title: 'Mis Citas',
      appointments,
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message:'Error al cargar citas' });
  }
};

// ── CANCELAR CITA ─────────────────────────────────────
exports.cancel = async (req, res) => {
  const { appointmentId } = req.params;
  try {
    const apptDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!apptDoc.exists) return res.json({ success:false });
    const appt = apptDoc.data();
    if (appt.patientId !== req.user.id) return res.json({ success:false, error:'Sin permisos' });

    await db.collection('appointments').doc(appointmentId).update({
      status:'cancelled', updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (appt.patientPhone) {
      try {
        await whatsapp.sendAppointmentCancellation({
          patientPhone: appt.patientPhone,
          doctorName: appt.doctorName,
          date: appt.date,
          time: appt.time,
        });
      } catch(e) {}
    }
    res.json({ success:true });
  } catch (err) {
    res.json({ success:false, error:err.message });
  }
};

// ── RESEÑA ────────────────────────────────────────────
exports.submitReview = async (req, res) => {
  const { doctorId, rating, comment, appointmentId } = req.body;
  try {
    await db.collection('reviews').add({
      doctorId, patientId:req.user.id, patientName:req.user.name,
      rating:Number(rating), comment, appointmentId,
      date: admin.firestore.FieldValue.serverTimestamp(),
    });
    const reviewsSnap = await db.collection('reviews').where('doctorId','==',doctorId).get();
    const reviews = reviewsSnap.docs.map(d => d.data());
    const avg = reviews.reduce((s,r) => s+r.rating, 0) / reviews.length;
    await db.collection('doctors').doc(doctorId).update({
      rating: Math.round(avg*10)/10, reviewCount: reviews.length,
    });
    res.json({ success:true });
  } catch (err) {
    res.json({ success:false, error:err.message });
  }
};
