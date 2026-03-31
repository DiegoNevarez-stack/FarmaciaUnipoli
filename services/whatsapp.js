const axios = require('axios');
require('dotenv').config();

const formatPhone = (phone) => {
  if (!phone) return null;
  return phone.replace(/[\s\+\-\(\)]/g, '');
};

const sendTemplate = async (to, templateName, params) => {
  const phone = formatPhone(to);
  if (!phone) return { success: false, error: 'Sin número' };

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es_MX' },
          components: [{
            type: 'body',
            parameters: params.map(p => ({ type: 'text', text: String(p) })),
          }],
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`✅ WhatsApp enviado a ${to}`);
    return { success: true };
  } catch (err) {
    console.error('❌ WhatsApp Error:', err.response?.data || err.message);
    return { success: false };
  }
};

// Plantilla 1: appointment_confirmation
// Hola {{1}}, tu cita con {{2}} ha sido confirmada para el {{3}} a las {{4}}. Consulta aquí la ubicación del consultorio: {{5}}. Te esperamos.
const sendAppointmentConfirmation = ({ patientPhone, patientName, doctorName, date, time, lat, lng, address }) => {
  let mapsLink = 'Ver dirección en perfil del médico';
  if (lat && lng && lat !== 0 && lng !== 0) {
    mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  } else if (address) {
    mapsLink = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  }
  return sendTemplate(patientPhone, 'appointment_confirmation', [
    patientName, doctorName, date, time, mapsLink
  ]);
};

// Plantilla 2: appointment_reminder
// Recordatorio: Hola {{1}}, mañana tienes cita con {{2}} a las {{3}}. Dirección: {{4}}. No faltes.
const sendAppointmentReminder = ({ patientPhone, patientName, doctorName, time, address }) => {
  return sendTemplate(patientPhone, 'appointment_reminder', [
    patientName, doctorName, time, address || 'Ver perfil del médico'
  ]);
};

// Plantilla 3: appointment_cancelled
// Tu cita con {{1}} del {{2}} a las {{3}} ha sido cancelada. Puedes reagendar cuando gustes.
const sendAppointmentCancellation = ({ patientPhone, doctorName, date, time }) => {
  return sendTemplate(patientPhone, 'appointment_cancelled', [
    doctorName, date, time
  ]);
};

// Plantilla 4: doctor_new_appointment
// Nueva cita agendada: {{1}} reservó para el {{2}} a las {{3}}. Motivo: {{4}}. Revisa tu panel.
const sendDoctorNewAppointmentAlert = ({ doctorPhone, patientName, date, time, reason }) => {
  return sendTemplate(doctorPhone, 'doctor_new_appointment', [
    patientName, date, time, reason || 'No especificado'
  ]);
};

module.exports = {
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendAppointmentCancellation,
  sendDoctorNewAppointmentAlert,
};
