// api/wa-webhook.js
// WhatsApp Cloud API webhook — fb-webhook.js এর মতই, একই getGroqReply
// ফাংশন ব্যবহার করে, যাতে WhatsApp-এও একই উত্তর/আচরণ পাওয়া যায়।
const { getGroqReply } = require('./_lib/chatbot');

async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  });
}

module.exports = async function handler(req, res) {
  // ১) Meta App সেটআপের সময় একবার GET কল করে webhook ভেরিফাই করে
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }

  // ২) কাস্টমার WhatsApp-এ মেসেজ পাঠালে Meta এখানে POST করে
  if (req.method === 'POST') {
    const body = req.body;
    if (body && body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const messages = change.value?.messages || [];
          for (const msg of messages) {
            const userText = msg.text?.body;
            const from = msg.from;
            if (userText && from) {
              try {
                const reply = await getGroqReply([{ role: 'user', content: userText }]);
                await sendWhatsAppMessage(from, reply);
              } catch (err) {
                await sendWhatsAppMessage(
                  from,
                  'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। একটু পর আবার চেষ্টা করুন।'
                );
              }
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).send('Not found');
  }

  return res.status(405).send('Method not allowed');
};
