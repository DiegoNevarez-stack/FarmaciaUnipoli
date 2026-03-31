const { db } = require('../config/firebase');

const loadUser = async (req, res, next) => {
  if (req.session?.userId) {
    try {
      const doc = await db.collection('users').doc(req.session.userId).get();
      if (doc.exists) {
        req.user = { id: doc.id, ...doc.data() };
        res.locals.user = req.user;
      }
    } catch (e) {}
  }
  next();
};

const requireAuth = async (req, res, next) => {
  if (!req.session?.userId) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  try {
    const doc = await db.collection('users').doc(req.session.userId).get();
    if (!doc.exists) { req.session.destroy(); return res.redirect('/auth/login'); }
    req.user = { id: doc.id, ...doc.data() };
    res.locals.user = req.user;
    next();
  } catch (e) { res.redirect('/auth/login'); }
};

const requireDoctor = (req, res, next) => {
  if (!req.user || req.user.role !== 'doctor')
    return res.status(403).render('error', { message: 'Acceso restringido a médicos' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin')
    return res.status(403).render('error', { message: 'Acceso restringido' });
  next();
};

module.exports = { loadUser, requireAuth, requireDoctor, requireAdmin };
