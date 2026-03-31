const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebase');

router.get('/', async (req, res) => {
  try {
    const [doctorsSnap, specSnap] = await Promise.all([
      db.collection('doctors').where('isActive','==',true).orderBy('rating','desc').limit(6).get(),
      db.collection('specialties').orderBy('name').get(),
    ]);
    res.render('home', {
      title: 'Encuentra tu Médico',
      featuredDoctors: doctorsSnap.docs.map(d => ({ id:d.id, ...d.data() })),
      specialties: specSnap.docs.map(d => d.data().name),
    });
  } catch (err) {
    console.error(err);
    res.render('home', { title:'MediConnect', featuredDoctors:[], specialties:[] });
  }
});

module.exports = router;
