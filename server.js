require('dotenv').config();
const express        = require('express');
const { engine }     = require('express-handlebars');
const session        = require('express-session');
const cookieParser   = require('cookie-parser');
const methodOverride = require('method-override');
const morgan         = require('morgan');
const path           = require('path');

const { loadUser }  = require('./middleware/auth');

const app = express();

// ─── HANDLEBARS ───────────────────────────────────────
app.engine('hbs', engine({
  extname: '.hbs',
  cache: false,
  defaultLayout: 'main',
  layoutsDir:  path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
  helpers: {
    ifCond(a, op, b, options) {
      const r = { '===': a===b, '!==': a!==b, '>': a>b, '<': a<b, '>=': a>=b }[op];
      return r ? options.fn(this) : options.inverse(this);
    },
    json:        (o)   => JSON.stringify(o),
    truncate:    (s,n) => s && s.length>n ? s.substring(0,n)+'...' : (s||''),
    encodeURI:   (s)   => encodeURIComponent(s||''),
    firstLetter: (s)   => (s||'').charAt(0).toUpperCase(),
    avatar:      (n)   => `https://ui-avatars.com/api/?name=${encodeURIComponent(n||'?')}&background=0066FF&color=fff&size=200`,
    repeat:      (s,n) => s.repeat(Math.round(n||0)),
    dayNumber:   (d)   => d ? new Date(d+'T00:00:00').getDate() : '',
    monthShort:  (d)   => d ? new Date(d+'T00:00:00').toLocaleDateString('es-MX',{month:'short'}).toUpperCase() : '',
    statusLabel: (s)   => ({pending:'⏳ Pendiente',confirmed:'✅ Confirmada',cancelled:'❌ Cancelada'}[s]||s),
    toString:    (v)   => String(v ?? ''),
  },
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ─── MIDDLEWARE ───────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mediconnect_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7*24*60*60*1000 },
}));

app.use(loadUser);
app.use((req, res, next) => {
  res.locals.geoapifyKey = process.env.GEOAPIFY_API_KEY;
  next();
});

// ─── ROUTES ───────────────────────────────────────────
app.use('/',             require('./routes/index'));
app.use('/auth',         require('./routes/auth'));
app.use('/doctors',      require('./routes/doctors'));
app.use('/appointments', require('./routes/appointments'));
app.use('/webhook',      require('./routes/webhook'));
app.use('/admin',        require('./routes/admin'));
app.use('/medicinas',    require('./routes/medicinas'));
app.use('/recetas',      require('./routes/recetas'));

// ─── ERRORS ───────────────────────────────────────────
app.use((req, res) => res.status(404).render('error', { message: 'Página no encontrada' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Error interno del servidor' });
});

// ─── START ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🏥 MediConnect → http://localhost:${PORT}\n`));
module.exports = app;

// ─── RECORDATORIOS AUTOMÁTICOS ────────────────────────
// Solo se activan si Firebase está configurado correctamente
try {
  const { db } = require('./config/firebase');
  const whatsapp = require('./services/whatsapp');

  async function sendReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      console.log(`\n⏰ Enviando recordatorios para citas del ${tomorrowStr}...`);
      const snap = await db.collection('appointments')
        .where('date', '==', tomorrowStr)
        .where('status', '==', 'confirmed')
        .get();
      if (snap.empty) { console.log('📭 Sin citas confirmadas para mañana.'); return; }
      let sent = 0;
      for (const doc of snap.docs) {
        const appt = doc.data();
        if (!appt.patientPhone) continue;
        const doctorDoc = await db.collection('doctors').doc(appt.doctorId).get();
        const address = doctorDoc.exists
          ? `${doctorDoc.data().location?.address}, ${doctorDoc.data().location?.city}`
          : 'Ver perfil del médico';
        try {
          await whatsapp.sendAppointmentReminder({ patientPhone: appt.patientPhone, patientName: appt.patientName || 'Paciente', doctorName: appt.doctorName || 'Médico', time: appt.time, address });
          sent++;
        } catch(e) { console.error(`❌ Error recordatorio ${doc.id}:`, e.message); }
      }
      console.log(`✅ Recordatorios enviados: ${sent}/${snap.size}`);
    } catch(e) { console.error('❌ Error en sendReminders:', e.message); }
  }

  function scheduleReminders() {
    const now = new Date(), next = new Date();
    next.setHours(9, 0, 0, 0);
    if (now >= next) next.setDate(next.getDate() + 1);
    const msUntilNext = next - now;
    console.log(`⏰ Recordatorios programados en ${Math.round(msUntilNext/1000/60)} minutos`);
    setTimeout(() => { sendReminders(); setInterval(sendReminders, 24*60*60*1000); }, msUntilNext);
  }
  scheduleReminders();
} catch(e) {
  console.log('ℹ️  Recordatorios WhatsApp desactivados (Firebase no configurado).');
}