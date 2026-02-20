const axios = require('axios');

const BASE_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  try {
    const { data } = await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    return { success: true, messageId: data.result?.message_id };
  } catch (err) {
    const msg = err.response?.data?.description || err.message;
    console.error(`Telegram send failed [${chatId}]:`, msg);
    return { success: false, error: msg };
  }
}

// Verify a chat_id is reachable (bot must be admin of channel)
async function verifyChannel(chatId) {
  try {
    const { data } = await axios.get(`${BASE_URL}/getChat`, {
      params: { chat_id: chatId },
    });
    return { valid: true, title: data.result?.title || chatId };
  } catch (err) {
    return { valid: false, error: err.response?.data?.description || err.message };
  }
}

module.exports = { sendMessage, verifyChannel };
