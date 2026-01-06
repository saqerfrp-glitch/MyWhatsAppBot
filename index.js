const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// --- إعداد السيرفر لمنع النوم ---
const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

// --- الإعدادات الأساسية ---
const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const URL_MY_APP = "https://mywhatsappbot-7jf2.onrender.com";

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// --- رسالة الترحيب والنماذج الثابتة ---
const welcomeMessage = `
مرحباً بك في بوت إدارة الحسابات 📊

لضمان تسجيل البيانات بشكل صحيح، يرجى استخدام النماذج التالية:

1️⃣ **عملية عادية (عليكم):**
(المحل-الموديل-العملية-السعر)
مثال: \`القمة للجوال-A10-تخطي حساب-5000\`

2️⃣ **دفعة حساب (لكم):**
(المحل-لكم-المبلغ-البيان)
مثال: \`القمة للجوال-لكم-10000-تصفية حساب\`

💡 فقط قم بنسخ النموذج وتعديل البيانات المرسلة.
`;

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown' });
});

// --- معالجة الرسائل الواردة ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // تجاهل الأوامر مثل /start
    if (!text || text.startsWith('/')) return;

    // التأكد من وجود الشرطات كفاصل
    if (!text.includes('-')) {
        return bot.sendMessage(chatId, "⚠️ صيغة الرسالة غير صحيحة. يرجى استخدام الشرطة (-) بين البيانات.");
    }

    let parts = text.split('-');
    let shop = parts[0].trim();
    let p2 = parts[1] ? parts[1].trim() : "";
    let p3 = parts[2] ? parts[2].trim() : "";
    let p4 = parts[3] ? parts[3].trim() : "";

    let formattedText = "";

    // التحقق من نوع العملية (لكم أم عملية عادية)
    if (p2 === "لكم") {
        // النموذج: القمة للجوال-لكم-1000-دفعه حساب
        formattedText = `${shop}\n`;
        formattedText += `لكم عملية == ${p4}\n`;
        formattedText += `السعر == ${p3}`;
    } else {
        // النموذج: القمة للجوال-الموديل-العملية-السعر
        formattedText = `${shop}\n`;
        formattedText += `الموديل = ${p2}\n`;
        formattedText += `العملية = ${p3}\n`;
        formattedText += `عليكم = ${p4}`;
    }

    try {
        const response = await axios.post(GOOGLE_SCRIPT_URL, formattedText, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

        if (response.data.includes("Success")) {
            bot.sendMessage(chatId, `✅ تم التسجيل بنجاح في شيت (${shop})`);
        } else {
            bot.sendMessage(chatId, `⚠️ رد جوجل: ${response.data}`);
        }
    } catch (e) {
        bot.sendMessage(chatId, "❌ فشل الاتصال بسيرفر جوجل. تأكد من الرابط.");
    }
});

// --- نبض القلب (Keep-Alive) كل 5 دقائق ---
setInterval(() => {
    axios.get(URL_MY_APP).catch(() => console.log("Ping..."));
}, 5 * 60 * 1000);