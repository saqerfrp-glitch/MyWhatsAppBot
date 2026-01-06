const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Live! 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('message', async (msg) => {
    const text = msg.text;
    if (!text) return;

    // إرسال الرسالة كما هي لسكربت جوجل ليتولى هو التفصيل حسب الرموز (= أو ==)
    try {
        const response = await axios.post(GOOGLE_SCRIPT_URL, text, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

        if (response.data.includes("Success")) {
            bot.sendMessage(msg.chat.id, "✅ تم التسجيل بنجاح حسب النموذج.");
        } else if (!response.data.includes("Ignored")) {
            bot.sendMessage(msg.chat.id, "⚠️ تنبيه من جوجل: " + response.data);
        }
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ فشل الاتصال بسيرفر جوجل.");
    }
});

// نبض القلب لمنع النوم
setInterval(() => { axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(()=>{}); }, 5 * 60 * 1000);