const { auth, db, admin } = require('../config/firebase');
const axios = require('axios');

exports.getLogin    = (req, res) => res.render('auth/login',    { title:'Iniciar Sesión', error:null });
exports.getRegister = (req, res) => res.render('auth/register', { title:'Registrarse',    error:null });

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      { email, password, returnSecureToken: true }
    );
    const { localId } = response.data;
    const userDoc = await db.collection('users').doc(localId).get();
    if (!userDoc.exists) return res.render('auth/login', { title:'Iniciar Sesión', error:'Usuario no encontrado' });

    req.session.userId = localId;
    req.session.save(() => {
      const user = userDoc.data();
      if (user.role === 'doctor') return res.redirect('/doctors/panel/dashboard');
      if (user.role === 'admin')  return res.redirect('/');
      res.redirect(req.session.returnTo || '/');
    });
  } catch (err) {
    const code = err.response?.data?.error?.message;
    const msg  = code === 'INVALID_PASSWORD'  ? 'Contraseña incorrecta'
               : code === 'EMAIL_NOT_FOUND'   ? 'Email no registrado'
               : 'Error al iniciar sesión';
    res.render('auth/login', { title:'Iniciar Sesión', error:msg });
  }
};

exports.postRegister = async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const userRecord = await auth.createUser({ email, password, displayName: name });
    await db.collection('users').doc(userRecord.uid).set({
      name, email, phone: phone||'', role: 'patient',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    req.session.userId = userRecord.uid;
    req.session.save(() => res.redirect('/'));
  } catch (err) {
    const msg = err.code === 'auth/email-already-exists' ? 'El email ya está registrado' : 'Error al crear cuenta';
    res.render('auth/register', { title:'Registrarse', error:msg });
  }
};

exports.logout = (req, res) => req.session.destroy(() => res.redirect('/'));
