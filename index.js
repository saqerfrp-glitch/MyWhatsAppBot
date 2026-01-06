const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot Status: Online 🚀'));
app.listen(process.env.PORT || 10000, () => console.log("Web server is live"));

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// --- 1. برمجة قائمة الأوامر المجمعة ---
bot.setMyCommands([
    { command: 'start', description: 'عرض التعليمات والنماذج' },
    { command: 'aliakum', description: 'القمة: نموذج (عليكم)' },
    { command: 'lakum', description: 'القمة: نموذج (لكم)' },
    { command: 'zain_aliakum', description: 'زين فون: نموذج (عليكم)' },
    { command: 'zain_lakum', description: 'زين فون: نموذج (لكم)' }
]).then(() => console.log("Commands updated with Zain Phone"));

// --- 2. معالجة الرسائل والأوامر ---
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // --- أمر البداية /start ---
    if (text === '/start') {
        const welcome = "📊 **مرحباً بك في بوت إدارة الحسابات**\n\n" +
                        "الآن يمكنك التسجيل للمحلين بسهولة، انسخ النموذج المطلوب عدل البيانات:\n\n" +
                        "🏢 **القمة للجوال:**\n" +
                        "• عليكم: `/aliakum` \n" +
                        "• لكم: `/lakum` \n\n" +
                        "🏢 **زين فون:**\n" +
                        "• عليكم: `/zain_aliakum` \n" +
                        "• لكم: `/zain_lakum` \n\n" +
                        "💡 اضغط على الأمر ليتم إرسال النموذج القابل للنسخ.";
        bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
    }

    // --- نماذج القمة للجوال ---
    else if (text === '/aliakum') {
        bot.sendMessage(chatId, "نسخ وتعديل (القمة - عليكم):\n`القمة للجوال-الموديل-العملية-السعر`", { parse_mode: 'Markdown' });
    }
    else if (text === '/lakum') {
        bot.sendMessage(chatId, "نسخ وتعديل (القمة - لكم):\n`القمة للجوال-لكم-المبلغ-البيان`", { parse_mode: 'Markdown' });
    }

    // --- نماذج زين فون ---
    else if (text === '/zain_aliakum') {
        bot.sendMessage(chatId, "نسخ وتعديل (زين فون - عليكم):\n`زين فون-الموديل-العملية-السعر`", { parse_mode: 'Markdown' });
    }
    else if (text === '/zain_lakum') {
        bot.sendMessage(chatId, "نسخ وتعديل (زين فون - لكم):\n`زين فون-لكم-المبلغ-البيان`", { parse_mode: 'Markdown' });
    }

    // --- معالجة التسجيل التلقائي (الرسائل التي تحتوي على -) ---
    else if (text.includes('-') && !text.startsWith('/')) {
        processSheetData(chatId, text);
    }
});

// --- 3. دالة إرسال البيانات لجوجل ---
async function processSheetData(chatId, text) {
    let parts = text.split('-');
    let shop = parts[0].trim();
    let p2 = parts[1] ? parts[1].trim() : "";
    let p3 = parts[2] ? parts[2].trim() : "";
    let p4 = parts[3] ? parts[3].trim() : "";

    let formattedText = "";
    
    // فحص إذا كانت العملية "لكم"
    if (p2 === "لكم") {
        formattedText = `${shop}\nلكم عملية == ${p4}\nالسعر == ${p3}`;
    } else {
        formattedText = `${shop}\nالموديل = ${p2}\nالعملية = ${p3}\nعليكم = ${p4}`;
    }

    try {
        const response = await axios.post(GOOGLE_SCRIPT_URL, formattedText);
        if (response.data.includes("Success")) {
            bot.sendMessage(chatId, `✅ تم التسجيل بنجاح لـ: **${shop}**`, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, "⚠️ رد جوجل: " + response.data);
        }
    } catch (e) {
        bot.sendMessage(chatId, "❌ فشل الاتصال بسيرفر جوجل.");
    }
}

// --- 4. نبض القلب (Keep-Alive) ---
setInterval(() => { 
    axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(() => {}); 
}, 5 * 60 * 1000);