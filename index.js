const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// --- معالجة الرسائل ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || !text.includes('-')) return;

    let parts = text.split('-');
    if (parts.length >= 3) {
        let shop = parts[0].trim();
        let price = parts[1].trim();
        let proc = parts[2].trim();
        let model = parts[3] ? parts[3].trim() : "غير محدد";

        let formattedText = `${shop}\n`;
        formattedText += `الموديل: ${model}\n`;
        formattedText += `العملية: ${proc}\n`;
        formattedText += `السعر: ${price}`;

        console.log("📡 إرسال البيانات لجوجل:\n", formattedText);

        try {
            const response = await axios.post(GOOGLE_SCRIPT_URL, formattedText, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });

            if (response.data.includes("Success")) {
                bot.sendMessage(chatId, `✅ تم التسجيل بنجاح:\n💰 السعر: ${price}\n🛠 العملية: ${proc}`);
            } else {
                bot.sendMessage(chatId, "⚠️ استلم جوجل البيانات ولكن حدث خطأ في التصنيف.");
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ فشل الاتصال بسيرفر جوجل.");
        }
    }
});

// --- كود نبض القلب (يوضع خارج الدالة ليعمل مرة واحدة باستمرار) ---
const URL_MY_APP = "https://mywhatsappbot-7jf2.onrender.com";
setInterval(() => {
    axios.get(URL_MY_APP)
        .then(() => console.log('--- نبض القلب: البوت مستيقظ ---'))
        .catch((err) => console.log('--- نبض القلب: تنبيه الاستيقاظ ---'));
}, 10 * 60 * 1000); // كل 10 دقائق