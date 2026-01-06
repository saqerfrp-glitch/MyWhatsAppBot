const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';

// --- ضع هنا الرقم الذي تريد استلام كل الرسائل عليه (رقمك أنت) ---
// الرقم بالصيغة الدولية بدون أصفار في البداية وبدون + (مثلاً اليمن 967)
const MY_WHATSAPP_NUMBER = "967775787199"; 

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// قائمة الأوامر الموحدة
bot.setMyCommands([
    { command: 'start', description: 'النماذج والتعليمات' },
    { command: 'aliakum', description: 'القمة: نموذج عليكم' },
    { command: 'lakum', description: 'القمة: نموذج لكم' },
    { command: 'zain', description: 'زين فون: نموذج عليكم' },
    { command: 'adnan', description: 'عدنان بايزيد: نموذج عليكم' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // --- أوامر النماذج السريعة ---
    if (text === '/start') {
        bot.sendMessage(chatId, "📊 **مرحباً بك**\nاضغط للنسخ ثم عدل البيانات:\n\n🏢 القمة: `/aliakum`\n🏢 زين: `/zain`\n🏢 عدنان: `/adnan`", { parse_mode: 'Markdown' });
        return;
    }
    if (text === '/aliakum') {
        bot.sendMessage(chatId, "القمة للجوال-الموديل-العملية-السعر");
        return;
    }
    if (text === '/zain') {
        bot.sendMessage(chatId, "زين فون-الموديل-العملية-السعر");
        return;
    }
    if (text === '/adnan') {
        bot.sendMessage(chatId, "عدنان بايزيد-الموديل-العملية-السعر");
        return;
    }

    // --- معالجة التسجيل (الرسائل التي تحتوي على -) ---
    if (text.includes('-') && !text.startsWith('/')) {
        let parts = text.split('-');
        let shop = parts[0].trim();
        let p2 = parts[1] ? parts[1].trim() : "";
        let p3 = parts[2] ? parts[2].trim() : "";
        let p4 = parts[3] ? parts[3].trim() : "";

        let formattedTextForGoogle = "";
        let waMsg = "";

        if (p2 === "لكم") {
            formattedTextForGoogle = `${shop}\nلكم عملية == ${p4}\nالسعر == ${p3}`;
            waMsg = `✅ *تمت عملية الإيداع بنجاح*\n\n🏢 المحل: ${shop}\n💵 المبلغ: ${p3}\n📝 البيان: ${p4}\n\nشكراً لتعاملكم معنا 🌹`;
        } else {
            formattedTextForGoogle = `${shop}\nالموديل = ${p2}\nالعملية = ${p3}\nعليكم = ${p4}`;
            waMsg = `✅ *تمت العملية بنجاح*\n\n🏢 المحل: ${shop}\n📱 الموديل: ${p2}\n🛠 العملية: ${p3}\n💸 السعر: ${p4}\n\nشكراً لتعاملكم معنا 🌹`;
        }

        try {
            const response = await axios.post(GOOGLE_SCRIPT_URL, formattedTextForGoogle);
            if (response.data.includes("Success")) {
                
                const encodedMsg = encodeURIComponent(waMsg);
                // الرابط الآن دائماً يرسل لرقمك الشخصي الموحد
                const waLink = `https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodedMsg}`;

                const opts = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '📲 إرسال الفاتورة للواتساب', url: waLink }]]
                    }
                };

                bot.sendMessage(chatId, `✅ تم التسجيل لـ *${shop}*\n\nالآن اضغط الزر لإرسالها لواتسابك ثم وجهها للعميل.`, opts);
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ فشل الاتصال بجوجل.");
        }
    }
});

// نبض القلب
setInterval(() => { axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(()=>{}); }, 5 * 60 * 1000);