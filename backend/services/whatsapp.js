const axios = require('axios');

const BASE_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

async function sendMessage(to, text) {
  try {
    const { data } = await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`WhatsApp send failed [${to}]:`, msg);
    return { success: false, error: msg };
  }
}

module.exports = { sendMessage };
