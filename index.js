const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';

// رقمك الموحد (واتساب أعمال)
const MY_WHATSAPP_NUMBER = "967775787199"; 

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) {
        handleCommands(chatId, text);
        return;
    }

    if (text.includes('-')) {
        let parts = text.split('-');
        let shop = parts[0].trim();
        let p2 = parts[1] ? parts[1].trim() : "";
        let p3 = parts[2] ? parts[2].trim() : "";
        let p4 = parts[3] ? parts[3].trim() : "";

        let waMsg = "";
        let googleData = "";

        if (p2 === "لكم") {
            googleData = `${shop}\nلكم عملية == ${p4}\nالسعر == ${p3}`;
            waMsg = `✅ *تمت عملية الإيداع بنجاح*\n\n🏢 المحل: ${shop}\n💵 المبلغ: ${p3}\n📝 البيان: ${p4}\n\nشكراً لتعاملكم معنا 🌹`;
        } else {
            googleData = `${shop}\nالموديل = ${p2}\nالعملية = ${p3}\nعليكم = ${p4}`;
            waMsg = `✅ *تمت العملية بنجاح*\n\n🏢 المحل: ${shop}\n📱 الموديل: ${p2}\n🛠 العملية: ${p3}\n💸 السعر: ${p4}\n\nشكراً لتعاملكم معنا 🌹`;
        }

        try {
            const response = await axios.post(GOOGLE_SCRIPT_URL, googleData);
            if (response.data.includes("Success")) {
                
                const encodedMsg = encodeURIComponent(waMsg);
                // استخدام رابط api.whatsapp لضمان استجابة أسرع للتطبيقات المثبتة
                const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodedMsg}`;

                const responseMsg = `✅ **سُجلت في الشيت لـ ${shop}**\n\n` +
                                    `📄 **النص المنسق (اضغط للنسخ):**\n` +
                                    `\`${waMsg}\``;

                const opts = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '📲 فتح واتساب الأعمال الآن', url: waLink }]]
                    }
                };

                bot.sendMessage(chatId, responseMsg, opts);
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ فشل الاتصال بجوجل.");
        }
    }
});

function handleCommands(chatId, text) {
    if (text === '/start') {
        bot.sendMessage(chatId, "مرحباً بك! أرسل البيانات بالصيغة المعروفة أو استخدم الأوامر.");
    }
    // يمكن إضافة أوامر النماذج هنا كما في السابق
}

// نبض القلب
setInterval(() => { axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(()=>{}); }, 5 * 60 * 1000);