const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const URL_MY_APP = "https://mywhatsappbot-7jf2.onrender.com";

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // إرسال النص كما هو تماماً لسكربت جوجل
    try {
        const response = await axios.post(GOOGLE_SCRIPT_URL, text, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

        if (response.data.includes("Success")) {
            bot.sendMessage(chatId, "✅ تم تسجيل البيانات في الشيت بنجاح.");
        } else if (!response.data.includes("Ignored")) {
            bot.sendMessage(chatId, "⚠️ رد السيرفر: " + response.data);
        }
    } catch (e) {
        bot.sendMessage(chatId, "❌ فشل الاتصال بسيرفر جوجل.");
    }
});

// نبض القلب
setInterval(() => {
    axios.get(URL_MY_APP).catch(() => {});
}, 10 * 60 * 1000);