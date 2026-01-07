const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const MY_WHATSAPP_NUMBER = "967775787199"; 

// 🛡️ استبدل هذا الرقم بالرقم الذي حصلت عليه من @userinfobot
const ADMIN_ID = 444444444; 

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.setMyCommands([
    { command: 'start', description: 'النماذج والتعليمات' },
    { command: 'balance', description: '💰 كشف الحساب' },
    { command: 'today', description: '📊 تقرير اليومية' },
    { command: 'aliakum', description: 'القمة: عليكم' },
    { command: 'zain', description: 'زين: عليكم' },
    { command: 'adnan', description: 'عدنان: عليكم' },
    { command: 'mohandes', description: 'المهندس: عليكم' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId !== ADMIN_ID) {
        bot.sendMessage(chatId, "⛔ الوصول مرفوض.");
        return;
    }

    if (!text) return;

    if (text === '/balance') {
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'القمة للجوال', callback_data: 'bal_القمة للجوال' }, { text: 'زين فون', callback_data: 'bal_زين فون' }],
                    [{ text: 'عدنان بايزيد', callback_data: 'bal_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'bal_المهندس' }]
                ]
            }
        };
        bot.sendMessage(chatId, "💰 **اختر المحل لعرض الرصيد:**", keyboard);
        return;
    }

    if (text === '/today') {
        bot.sendMessage(chatId, "⏳ جاري تجميع تقرير اليوم...");
        try {
            const res = await axios.post(GOOGLE_SCRIPT_URL, "GET_TODAY_REPORT");
            if (res.data.includes("REPORT")) {
                const p = res.data.split('|');
                bot.sendMessage(chatId, `📅 **تقرير الإنجاز اليومي**\n--------------------------\n✅ العمليات: ${p[2]}\n💰 المبلغ: ${Number(p[1]).toLocaleString()} ريال\n\n**التفاصيل:**\n${p[3] || "لا يوجد"}`, { parse_mode: 'Markdown' });
            }
        } catch (e) { bot.sendMessage(chatId, "❌ فشل الاتصال."); }
        return;
    }

    if (text.startsWith('/')) {
        handleCommands(chatId, text);
    } else if (text.includes('-')) {
        processTransaction(chatId, text);
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (chatId !== ADMIN_ID) return;
    const shop = query.data.split('_')[1];
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId, `⏳ حساب رصيد *${shop}*...`, { parse_mode: 'Markdown' });
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, `BALANCE_CHECK:${shop}`);
        if (res.data.includes("BALANCE_RESULT")) {
            const p = res.data.split('|');
            const msg = `💰 **كشف حساب: ${shop}**\n\n🔴 عليكم: ${Number(p[1]).toLocaleString()}\n🟢 لكم: ${Number(p[2]).toLocaleString()}\n----------------\n💵 **الصافي: ${Number(p[3]).toLocaleString()}**`;
            bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
});

async function processTransaction(chatId, text) {
    let parts = text.split('-');
    let shop = parts[0].trim(), p2 = parts[1], p3 = parts[2], p4 = parts[3];
    let googleData = (p2 === "لكم") ? `${shop}\nلكم عملية == ${p4}\nالسعر == ${p3}` : `${shop}\nالموديل = ${p2}\nالعملية = ${p3}\nعليكم = ${p4}`;
    let waMsg = (p2 === "لكم") ? `✅ *تمت عملية الإيداع*\n\n🏢 المحل: ${shop}\n💵 المبلغ: ${p3}\n📝 البيان: ${p4}\n\nشكراً لتعاملكم 🌹` : `✅ *تمت العملية بنجاح*\n\n🏢 المحل: ${shop}\n📱 الموديل: ${p2}\n🛠 العملية: ${p3}\n💸 السعر: ${p4}\n\nشكراً لتعاملكم 🌹`;

    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, googleData);
        if (res.data.includes("Success")) {
            const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodeURIComponent(waMsg)}`;
            bot.sendMessage(chatId, `✅ سُجلت لـ *${shop}*\n\n\`${waMsg}\``, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '📲 فتح واتساب', url: waLink }]] } });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

function handleCommands(chatId, text) {
    const templates = {
        '/start': "✅ النظام جاهز ومحمي.\nاستخدم /balance للرصيد و /today للتقرير.",
        '/aliakum': "`القمة للجوال-الموديل-العملية-السعر`",
        '/zain': "`زين فون-الموديل-العملية-السعر`",
        '/adnan': "`عدنان بايزيد-الموديل-العملية-السعر`",
        '/mohandes': "`المهندس-الموديل-العملية-السعر`"
    };
    if (templates[text]) bot.sendMessage(chatId, templates[text], { parse_mode: 'Markdown' });
}

setInterval(() => { axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(()=>{}); }, 5 * 60 * 1000);