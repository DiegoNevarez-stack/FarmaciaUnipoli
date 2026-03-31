// config/seed.js
// =============================================
// SCRIPT DE INICIALIZACIÓN DE FIREBASE
// Ejecutar UNA SOLA VEZ: node config/seed.js
// =============================================
require('dotenv').config();
const { db, auth, admin } = require('./firebase');

async function seedFirebase() {
  console.log('🌱 Iniciando seed de Firebase...\n');

  // ─────────────────────────────────────────
  // 1. CREAR REGLAS DE COLECCIONES (estructura)
  // ─────────────────────────────────────────

  // Especialidades médicas
  const specialties = [
    'Medicina General', 'Cardiología', 'Dermatología', 'Ginecología',
    'Neurología', 'Ortopedia', 'Pediatría', 'Psiquiatría',
    'Oftalmología', 'Urología', 'Endocrinología', 'Oncología',
    'Gastroenterología', 'Neumología', 'Reumatología'
  ];

  const batch1 = db.batch();
  for (const spec of specialties) {
    const ref = db.collection('specialties').doc();
    batch1.set(ref, { name: spec, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  await batch1.commit();
  console.log('✅ Especialidades creadas');

  // ─────────────────────────────────────────
  // 2. CREAR USUARIO ADMIN
  // ─────────────────────────────────────────
  let adminUser;
  try {
    adminUser = await auth.createUser({
      email: 'admin@mediconnect.com',
      password: 'Admin123456!',
      displayName: 'Administrador',
    });
    await db.collection('users').doc(adminUser.uid).set({
      name: 'Administrador',
      email: 'admin@mediconnect.com',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Usuario admin creado: admin@mediconnect.com / Admin123456!');
  } catch (e) {
    console.log('ℹ️  Admin ya existe, continuando...');
  }

  // ─────────────────────────────────────────
  // 3. CREAR MÉDICOS DE EJEMPLO
  // ─────────────────────────────────────────
  const doctors = [
    {
      name: 'Dr. Carlos Mendoza',
      specialty: 'Cardiología',
      email: 'carlos.mendoza@mediconnect.com',
      phone: '+521234567890',
      bio: 'Cardiólogo con más de 15 años de experiencia en enfermedades cardiovasculares.',
      photo: 'https://randomuser.me/api/portraits/men/32.jpg',
      location: {
        address: 'Av. Reforma 456, Col. Juárez',
        city: 'Ciudad de México',
        state: 'CDMX',
        lat: 19.4271,
        lng: -99.1677,
      },
      consultationFee: 800,
      rating: 4.8,
      reviewCount: 124,
      experience: 15,
      education: ['UNAM - Medicina General', 'INCMNSZ - Cardiología'],
      languages: ['Español', 'Inglés'],
      schedule: {
        monday:    [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }],
        tuesday:   [{ start: '09:00', end: '13:00' }],
        wednesday: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }],
        thursday:  [{ start: '09:00', end: '13:00' }],
        friday:    [{ start: '09:00', end: '13:00' }],
        saturday:  [],
        sunday:    [],
      },
      slotDuration: 30,
      isActive: true,
      verified: true,
    },
    {
      name: 'Dra. Ana García',
      specialty: 'Dermatología',
      email: 'ana.garcia@mediconnect.com',
      phone: '+529876543210',
      bio: 'Especialista en dermatología clínica y estética. Experta en tratamientos de acné y envejecimiento.',
      photo: 'https://randomuser.me/api/portraits/women/44.jpg',
      location: {
        address: 'Calle Madero 123, Centro',
        city: 'Guadalajara',
        state: 'Jalisco',
        lat: 20.6597,
        lng: -103.3496,
      },
      consultationFee: 650,
      rating: 4.9,
      reviewCount: 87,
      experience: 10,
      education: ['Universidad de Guadalajara - Medicina', 'Hospital Civil - Dermatología'],
      languages: ['Español'],
      schedule: {
        monday:    [{ start: '10:00', end: '14:00' }],
        tuesday:   [{ start: '10:00', end: '14:00' }, { start: '16:00', end: '20:00' }],
        wednesday: [{ start: '10:00', end: '14:00' }],
        thursday:  [{ start: '10:00', end: '14:00' }, { start: '16:00', end: '20:00' }],
        friday:    [{ start: '10:00', end: '14:00' }],
        saturday:  [{ start: '09:00', end: '12:00' }],
        sunday:    [],
      },
      slotDuration: 45,
      isActive: true,
      verified: true,
    },
    {
      name: 'Dr. Roberto Sánchez',
      specialty: 'Pediatría',
      email: 'roberto.sanchez@mediconnect.com',
      phone: '+525551234567',
      bio: 'Pediatra dedicado al cuidado integral de niños y adolescentes.',
      photo: 'https://randomuser.me/api/portraits/men/55.jpg',
      location: {
        address: 'Blvd. Hidalgo 789, Del Valle',
        city: 'Monterrey',
        state: 'Nuevo León',
        lat: 25.6866,
        lng: -100.3161,
      },
      consultationFee: 700,
      rating: 4.7,
      reviewCount: 203,
      experience: 12,
      education: ['TEC Monterrey - Medicina', 'IMSS - Pediatría'],
      languages: ['Español', 'Inglés'],
      schedule: {
        monday:    [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
        tuesday:   [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
        wednesday: [{ start: '08:00', end: '12:00' }],
        thursday:  [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
        friday:    [{ start: '08:00', end: '12:00' }],
        saturday:  [{ start: '09:00', end: '13:00' }],
        sunday:    [],
      },
      slotDuration: 20,
      isActive: true,
      verified: true,
    },
  ];

  for (const doctorData of doctors) {
    // Crear usuario en Firebase Auth
    let doctorUser;
    try {
      doctorUser = await auth.createUser({
        email: doctorData.email,
        password: 'Doctor123456!',
        displayName: doctorData.name,
      });
    } catch (e) {
      const existing = await auth.getUserByEmail(doctorData.email);
      doctorUser = existing;
    }

    // Guardar en colección users
    await db.collection('users').doc(doctorUser.uid).set({
      name: doctorData.name,
      email: doctorData.email,
      role: 'doctor',
      doctorId: doctorUser.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Guardar en colección doctors
    const { email, ...rest } = doctorData;
    await db.collection('doctors').doc(doctorUser.uid).set({
      ...rest,
      userId: doctorUser.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Crear reseñas de ejemplo para este médico
    const reviews = [
      { rating: 5, comment: 'Excelente médico, muy atento y profesional.', patientName: 'María L.' },
      { rating: 5, comment: 'Me explicó todo muy bien, quedé muy satisfecha.', patientName: 'Juan P.' },
      { rating: 4, comment: 'Buen servicio, aunque la espera fue larga.', patientName: 'Sofia R.' },
    ];

    for (const review of reviews) {
      await db.collection('reviews').add({
        doctorId: doctorUser.uid,
        patientId: 'sample',
        patientName: review.patientName,
        rating: review.rating,
        comment: review.comment,
        date: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`✅ Médico creado: ${doctorData.name}`);
  }

  // ─────────────────────────────────────────
  // 4. CREAR ÍNDICES NECESARIOS (instrucciones)
  // ─────────────────────────────────────────
  console.log('\n📋 ÍNDICES NECESARIOS EN FIREBASE CONSOLE:');
  console.log('Colección: doctors | Campos: specialty ASC, rating DESC');
  console.log('Colección: doctors | Campos: location.city ASC, specialty ASC');
  console.log('Colección: appointments | Campos: doctorId ASC, date ASC');
  console.log('Colección: appointments | Campos: patientId ASC, date DESC');
  console.log('Colección: reviews | Campos: doctorId ASC, date DESC');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📝 CREDENCIALES DE ACCESO:');
  console.log('Admin: admin@mediconnect.com / Admin123456!');
  console.log('Médico ejemplo: carlos.mendoza@mediconnect.com / Doctor123456!');
  process.exit(0);
}

seedFirebase().catch(err => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
