// api/fb-webhook.js
// ──────────────────────────────────────────────────────────
// Facebook Messenger webhook — একই getGroqReply ফাংশন ব্যবহার করে
// যা api/chat.js (website) ও ব্যবহার করে। ফলে Website আর Facebook-এ
// একই প্রোডাক্ট তথ্য, একই আচরণ, একই উত্তর পাওয়া যায় — দুই জায়গায়
// আলাদা করে কোড লিখতে হয় না।
// ──────────────────────────────────────────────────────────

const { getGroqReply } = require('./_lib/chatbot');

async function sendFacebookMessage(recipientId, text) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text }
    })
  });
}

module.exports = async function handler(req, res) {
  // ১) Facebook App সেটআপের সময় একবার এই GET কল করে webhook ভেরিফাই করে
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }

  // ২) কাস্টমার Messenger-এ মেসেজ পাঠালে Facebook এখানে POST করে
  if (req.method === 'POST') {
    const body = req.body;

    if (body && body.object === 'page') {
      for (const entry of body.entry || []) {
        const event = entry.messaging?.[0];
        const userText = event?.message?.text;
        const senderId = event?.sender?.id;

        if (userText && senderId) {
          try {
            const reply = await getGroqReply([{ role: 'user', content: userText }]);
            await sendFacebookMessage(senderId, reply);
          } catch (err) {
            await sendFacebookMessage(
              senderId,
              'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। একটু পর আবার চেষ্টা করুন।'
            );
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).send('Not found');
  }

  return res.status(405).send('Method not allowed');
};

