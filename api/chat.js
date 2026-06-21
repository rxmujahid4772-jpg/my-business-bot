const { getGroqReply } = require('./_lib/chatbot');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'এই endpoint শুধু POST রিকোয়েস্ট নেয়' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array (role + content) প্রয়োজন' });
  }

  try {
    const reply = await getGroqReply(messages);
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
