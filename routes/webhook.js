const express = require('express');
const router  = express.Router();

// Verificación del webhook de WhatsApp (Meta)
router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Recibir mensajes entrantes de WhatsApp
router.post('/whatsapp', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        const message = change.value?.messages?.[0];
        if (message) console.log('📱 Mensaje recibido:', message.from, message.text?.body);
      });
    });
    return res.sendStatus(200);
  }
  res.sendStatus(404);
});

module.exports = router;
