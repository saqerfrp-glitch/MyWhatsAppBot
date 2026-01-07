const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const MY_WHATSAPP_NUMBER = "967775787199"; 

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// تحديث قائمة الأوامر
bot.setMyCommands([
    { command: 'start', description: 'النماذج والتعليمات' },
    { command: 'balance', description: '💰 كشف الحساب (الرصيد)' },
    { command: 'aliakum', description: 'القمة: عليكم' },
    { command: 'zain', description: 'زين فون: عليكم' },
    { command: 'adnan', description: 'عدنان: عليكم' },
    { command: 'mohandes', description: 'المهندس: عليكم' }
]);

// قائمة المحلات للأزرار
const shopsKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [{ text: 'القمة للجوال', callback_data: 'bal_القمة للجوال' }, { text: 'زين فون', callback_data: 'bal_زين فون' }],
            [{ text: 'عدنان بايزيد', callback_data: 'bal_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'bal_المهندس' }]
        ]
    }
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // --- أمر كشف الحساب ---
    if (text === '/balance') {
        bot.sendMessage(chatId, "💰 **اختر المحل لعرض كشف الحساب:**", shopsKeyboard);
        return;
    }

    if (text.startsWith('/')) {
        handleCommands(chatId, text);
        return;
    }

    // --- معالجة تسجيل العمليات (الكود القديم كما هو) ---
    if (text.includes('-')) {
        // ... (نفس كود التسجيل السابق تماماً بدون تغيير) ...
        // لعدم الإطالة، اترك كود التسجيل كما كان في ردنا السابق
        processTransaction(chatId, text);
    }
});

// --- معالجة الضغط على الأزرار (الجديد) ---
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('bal_')) {
        const shopName = data.split('_')[1];
        
        // إشعار انتظار
        bot.answerCallbackQuery(query.id, { text: 'جاري جلب الرصيد...' });
        bot.sendMessage(chatId, `⏳ جاري حساب رصيد *${shopName}* من السيرفر...`, { parse_mode: 'Markdown' });

        try {
            // إرسال طلب خاص لجوجل للحساب
            const response = await axios.post(GOOGLE_SCRIPT_URL, `BALANCE_CHECK:${shopName}`);
            
            if (response.data.includes("BALANCE_RESULT")) {
                const parts = response.data.split('|');
                const totalAliakum = Number(parts[1]).toLocaleString();
                const totalLakum = Number(parts[2]).toLocaleString();
                const netBalance = Number(parts[3]).toLocaleString();

                const msg = `💰 **كشف حساب: ${shopName}**\n\n` +
                            `🔴 إجمالي عليكم: ${totalAliakum}\n` +
                            `🟢 إجمالي لكم (واصل): ${totalLakum}\n` +
                            `---------------------------------\n` +
                            `💵 **الصافي المتبقي: ${netBalance}**`;
                
                bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, "⚠️ حدث خطأ أثناء جلب البيانات أو الشيت فارغ.");
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ فشل الاتصال بجوجل.");
        }
    }
});

// دالة التسجيل (فصلناها للترتيب فقط، هي نفسها القديمة)
async function processTransaction(chatId, text) {
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
                const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodedMsg}`;
                const responseMsg = `✅ **سُجلت في الشيت لـ ${shop}**\n\n📄 **النص المنسق:**\n\`${waMsg}\``;
                const opts = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '📲 فتح واتساب الأعمال', url: waLink }]] } };
                bot.sendMessage(chatId, responseMsg, opts);
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ فشل الاتصال بجوجل.");
        }
}

function handleCommands(chatId, text) {
    // (ضع بقية أوامر النماذج هنا كما كانت)
    if (text === '/start') bot.sendMessage(chatId, "أهلاً بك .. استخدم /balance لمعرفة الرصيد");
    if (text === '/aliakum') bot.sendMessage(chatId, "`القمة للجوال-الموديل-العملية-السعر`", {parse_mode: 'Markdown'});
    if (text === '/zain') bot.sendMessage(chatId, "`زين فون-الموديل-العملية-السعر`", {parse_mode: 'Markdown'});
    if (text === '/adnan') bot.sendMessage(chatId, "`عدنان بايزيد-الموديل-العملية-السعر`", {parse_mode: 'Markdown'});
    if (text === '/mohandes') bot.sendMessage(chatId, "`المهندس-الموديل-العملية-السعر`", {parse_mode: 'Markdown'});
}

setInterval(() => { axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(()=>{}); }, 5 * 60 * 1000);