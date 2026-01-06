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

    if (!text || !text.includes('-')) return;

    let parts = text.split('-');
    let shop = parts[0] ? parts[0].trim() : "";
    let p2 = parts[1] ? parts[1].trim() : "";
    let p3 = parts[2] ? parts[2].trim() : "";
    let p4 = parts[3] ? parts[3].trim() : "";

    // بناء الكائن JSON حسب ما يتوقعه السكربت الجديد
    let jsonData = {};

    // --- الحالة الأولى: تسجيل رصيد للعميل (لكم) ---
    // النموذج: القمة للجوال-لكم-1000-دفعة حساب
    if (p2 === "لكم") {
        jsonData = {
            "shop": shop,
            "type": "رصيد/دفعة", // الكلمة الدالة في السكربت لتفعيل شرط العمود C
            "price": p3,         // المبلغ
            "process": p4,       // تفاصيل العملية
            "model": "رصيد"      // ثابت للرصيد
        };
    } 
    // --- الحالة الثانية: تسجيل عملية عادية (عليكم) ---
    // النموذج: القمة للجوال-A10-تخطي-500
    else {
        jsonData = {
            "shop": shop,
            "type": "عملية عادية",
            "price": p4,         // المبلغ يذهب لـ عليكم (العمود D)
            "process": p3,       // العملية (تخطي)
            "model": p2          // الموديل (A10)
        };
    }

    if (jsonData.shop) {
        try {
            // إرسال البيانات بصيغة JSON حقيقية
            const response = await axios.post(GOOGLE_SCRIPT_URL, JSON.stringify(jsonData));

            if (response.data.includes("Success")) {
                bot.sendMessage(chatId, `✅ تم التسجيل بنجاح في شيت ${shop}`);
            } else {
                bot.sendMessage(chatId, "⚠️ رد جوجل: " + response.data);
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ فشل الاتصال بسيرفر جوجل.");
        }
    }
});

// نبض القلب
setInterval(() => {
    axios.get(URL_MY_APP).catch(() => {});
}, 10 * 60 * 1000);