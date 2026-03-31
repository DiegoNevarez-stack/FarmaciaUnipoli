const { db, admin } = require('../config/firebase');

// ── BÚSQUEDA PÚBLICA ──────────────────────────────────
exports.search = async (req, res) => {
  const { specialty, city, name } = req.query;
  try {
    let query = db.collection('doctors').where('isActive','==',true);
    if (specialty) query = query.where('specialty','==',specialty);
    const snap = await query.limit(20).get();
    let doctors = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (b.rating||0)-(a.rating||0));
    if (city) doctors = doctors.filter(d => d.location?.city?.toLowerCase().includes(city.toLowerCase()));
    if (name) doctors = doctors.filter(d => d.name?.toLowerCase().includes(name.toLowerCase()));

    const specSnap = await db.collection('specialties').orderBy('name').get();

    res.render('doctor/search', {
      title: 'Buscar Médicos',
      doctors,
      doctorsCount: doctors.length,
      specialties: specSnap.docs.map(d => d.data().name),
      filters: { specialty:specialty||'', city:city||'', name:name||'' },
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message:'Error al buscar médicos' });
  }
};

// ── PERFIL PÚBLICO ────────────────────────────────────
exports.profile = async (req, res) => {
  const { id } = req.params;
  try {
    const doctorDoc = await db.collection('doctors').doc(id).get();
    if (!doctorDoc.exists) return res.status(404).render('error', { message:'Médico no encontrado' });
    const doctor = { id:doctorDoc.id, ...doctorDoc.data() };

    const reviewsSnap = await db.collection('reviews')
      .where('doctorId','==',id).orderBy('date','desc').limit(10).get();
    const reviews = reviewsSnap.docs.map(d => ({ id:d.id, ...d.data() }));

    const dayMap = [
      {key:'monday',   label:'Lun'},{key:'tuesday',   label:'Mar'},
      {key:'wednesday',label:'Mié'},{key:'thursday',  label:'Jue'},
      {key:'friday',   label:'Vie'},{key:'saturday',  label:'Sáb'},
      {key:'sunday',   label:'Dom'},
    ];
    const schedule = dayMap.map(d => ({
      label: d.label,
      blocks: doctor.schedule?.[d.key] || [],
    }));

    res.render('doctor/profile', {
      title: doctor.name,
      doctor,
      reviews,
      schedule,
      minDate: new Date().toISOString().split('T')[0],
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message:'Error al cargar perfil' });
  }
};

// ── SLOTS DISPONIBLES (AJAX) ──────────────────────────
exports.getAvailableSlots = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  try {
    const doctorDoc = await db.collection('doctors').doc(id).get();
    if (!doctorDoc.exists) return res.json({ slots:[] });
    const doctor = doctorDoc.data();

    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const [y,m,d] = date.split('-').map(Number);
    const dayName  = dayNames[new Date(y, m-1, d).getDay()];
    const blocks   = doctor.schedule?.[dayName] || [];
    console.log('Slots debug:', date, '->', dayName, '| blocks:', JSON.stringify(blocks));
    const duration = doctor.slotDuration || 30;

    const allSlots = [];
    for (const b of blocks) {
      const [sh,sm] = b.start.split(':').map(Number);
      const [eh,em] = b.end.split(':').map(Number);
      let cur = sh*60+sm, end = eh*60+em;
      while (cur+duration <= end) {
        allSlots.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`);
        cur += duration;
      }
    }

    const apptSnap = await db.collection('appointments')
      .where('doctorId','==',id).where('date','==',date)
      .where('status','in',['pending','confirmed']).get();
    const booked = apptSnap.docs.map(d => d.data().time);

    res.json({ slots: allSlots.filter(s => !booked.includes(s)) });
  } catch (err) {
    res.json({ slots:[] });
  }
};

// ── DASHBOARD MÉDICO ──────────────────────────────────
exports.dashboard = async (req, res) => {
  const doctorId = req.user.doctorId || req.user.id;
  const today = new Date().toISOString().split('T')[0];
  try {
    const [todaySnap, pendingSnap, doctorDoc] = await Promise.all([
      db.collection('appointments').where('doctorId','==',doctorId).where('date','==',today).get(),
      db.collection('appointments').where('doctorId','==',doctorId).where('status','==','pending').limit(5).get(),
      db.collection('doctors').doc(doctorId).get(),
    ]);
    res.render('doctor/dashboard', {
      title: 'Mi Panel',
      todayAppts:   todaySnap.docs.map(d => ({ id:d.id, ...d.data() })),
      pendingAppts: pendingSnap.docs.map(d => ({ id:d.id, ...d.data() })),
      doctor: doctorDoc.exists ? { id:doctorDoc.id, ...doctorDoc.data() } : {},
      doctorId,
    });
  } catch (err) {
    res.render('error', { message:'Error al cargar panel' });
  }
};

// ── CITAS DEL MÉDICO ──────────────────────────────────
exports.appointments = async (req, res) => {
  const doctorId = req.user.doctorId || req.user.id;
  const { status, date } = req.query;
  try {
    let query = db.collection('appointments').where('doctorId','==',doctorId);
    if (status) query = query.where('status','==',status);
    if (date)   query = query.where('date','==',date);
    const snap = await query.limit(50).get();
    const appointments = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => a.date > b.date ? 1 : a.date < b.date ? -1 : a.time > b.time ? 1 : -1);
    res.render('doctor/appointments', {
      title: 'Mis Citas',
      appointments,
      filters: { status:status||'', date:date||'' },
    });
  } catch (err) {
    res.render('error', { message:'Error al cargar citas' });
  }
};

// ── ACTUALIZAR CITA ───────────────────────────────────
exports.updateAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;
  const whatsapp = require('../services/whatsapp');
  try {
    const apptDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!apptDoc.exists) return res.json({ success:false });
    await db.collection('appointments').doc(appointmentId).update({
      status, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const appt = apptDoc.data();
    if (appt.patientPhone) {
      if (status==='confirmed') {
        const dDoc = await db.collection('doctors').doc(appt.doctorId).get();
        const dData = dDoc.exists ? dDoc.data() : {};
        await whatsapp.sendAppointmentConfirmation({ patientPhone:appt.patientPhone, patientName:appt.patientName, doctorName:appt.doctorName, date:appt.date, time:appt.time, lat:dData.location?.lat, lng:dData.location?.lng, address:dData.location?.address });
      }
      if (status==='cancelled') await whatsapp.sendAppointmentCancellation({ patientPhone:appt.patientPhone, doctorName:appt.doctorName, date:appt.date, time:appt.time });
    }
    res.json({ success:true });
  } catch (err) {
    res.json({ success:false, error:err.message });
  }
};

// ── EDITAR PERFIL ─────────────────────────────────────
exports.editProfile = async (req, res) => {
  const doctorId = req.user.doctorId || req.user.id;
  try {
    const [doctorDoc, specSnap] = await Promise.all([
      db.collection('doctors').doc(doctorId).get(),
      db.collection('specialties').orderBy('name').get(),
    ]);
    res.render('doctor/edit-profile', {
      title: 'Editar Perfil',
      doctor: doctorDoc.exists ? { id:doctorDoc.id, ...doctorDoc.data() } : {},
      specialties: specSnap.docs.map(d => d.data().name),
    });
  } catch (err) {
    res.render('error', { message:'Error al cargar perfil' });
  }
};

exports.updateProfile = async (req, res) => {
  const doctorId = req.user.doctorId || req.user.id;
  const { name, bio, specialty, consultationFee, address, city, state, lat, lng, slotDuration, phone, photoUrl } = req.body;
  try {
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const schedule = {};
    for (const day of days) {
      const starts = [].concat(req.body[`${day}_start`]||[]);
      const ends   = [].concat(req.body[`${day}_end`]||[]);
      schedule[day] = starts.map((s,i) => ({ start:s, end:ends[i] })).filter(b => b.start && b.end);
    }
    const data = {
      name, bio, specialty,
      consultationFee: Number(consultationFee),
      phone, slotDuration: Number(slotDuration)||30,
      location: { address, city, state, lat:Number(lat)||0, lng:Number(lng)||0 },
      schedule, isActive:true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (photoUrl?.trim()) data.photo = photoUrl.trim();
    await db.collection('doctors').doc(doctorId).set(data, { merge:true });
    await db.collection('users').doc(req.user.id).update({ name });
    res.redirect('/doctors/panel/dashboard');
  } catch (err) {
    console.error(err);
    res.render('error', { message:'Error al actualizar perfil' });
  }
};
