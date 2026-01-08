const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const MY_WHATSAPP_NUMBER = "967775787199"; 
const ADMIN_ID = 656096830; // ⚠️ ضع ID الخاص بك هنا

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
let userState = {};

bot.setMyCommands([
    { command: 'start', description: '🏠 الرئيسية' },
    { command: 'new', description: '➕ إضافة عملية/سداد' },
    { command: 'balance', description: '💰 كشف الحساب' },
    { command: 'today', description: '📊 تقرير اليوم' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (chatId !== ADMIN_ID || !text) return;

    if (text === '/start') {
        return bot.sendMessage(chatId, "مرحباً بك في نظام الإدارة الذكي 🛠\nاختر من الأزرار لبدء العمل:", {
            reply_markup: { keyboard: [['/new', '/balance'], ['/today']], resize_keyboard: true }
        });
    }

    if (text === '/new') {
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'القمة للجوال', callback_data: 'select_القمة للجوال' }, { text: 'زين فون', callback_data: 'select_زين فون' }],
                    [{ text: 'عدنان بايزيد', callback_data: 'select_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'select_المهندس' }]
                ]
            }
        };
        return bot.sendMessage(chatId, "🏬 اختر المحل المطلوب:", keyboard);
    }

    // استقبال البيانات الذكي (لكم وعليكم)
    if (userState[chatId] && userState[chatId].waitingForData) {
        const { shop, type } = userState[chatId];
        let parts = text.trim().split(/\s+/);
        
        if (type === 'aliakum' && parts.length >= 3) {
            let price = parts.pop(); 
            let model = parts.shift();
            let process = parts.join(' '); 
            processTransaction(chatId, `${shop}-${model}-${process}-${price}`);
            delete userState[chatId];
        } else if (type === 'lakum' && parts.length >= 2) {
            let amount = parts.shift();
            let note = parts.join(' ');
            processTransaction(chatId, `${shop}-لكم-${amount}-${note}`);
            delete userState[chatId];
        } else {
            bot.sendMessage(chatId, "⚠️ بيانات ناقصة! يرجى التأكد من المسافات.");
        }
        return;
    }

    if (text === '/balance') return handleBalanceMenu(chatId);
    if (text === '/today') return handleTodayReport(chatId);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const messageId = query.message.message_id;

    // منع التكرار بالإجابة الفورية
    bot.answerCallbackQuery(query.id);

    if (data.startsWith('select_')) {
        const shop = data.split('_')[1];
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🛠 تسجيل شغل جديد (عليكم)', callback_data: `type_aliakum_${shop}` }],
                    [{ text: '💵 تسجيل مبلغ واصل (لكم)', callback_data: `type_lakum_${shop}` }]
                ]
            }
        };
        return bot.editMessageText(`🏢 المحل: *${shop}*`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard.reply_markup });
    }

    if (data.startsWith('type_')) {
        const [, type, shop] = data.split('_');
        userState[chatId] = { waitingForData: true, shop: shop, type: type };
        const msg = (type === 'aliakum') ? `📝 سجل شغل لـ *${shop}*\nأرسل: (الموديل العملية السعر)` : `💰 سجل واصل من *${shop}*\nأرسل: (المبلغ البيان)`;
        return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('bal_')) return handleBalanceQuery(chatId, data.split('_')[1]);

    if (data.startsWith('pdf_')) {
        const shop = data.split('_')[1];
        bot.sendMessage(chatId, `⏳ جاري إنشاء ملف PDF لـ *${shop}*...`);
        try {
            const res = await axios.post(GOOGLE_SCRIPT_URL, `GENERATE_PDF:${shop}`);
            if (res.data.includes("PDF_URL")) {
                const url = res.data.split('|')[1];
                bot.sendMessage(chatId, `✅ كشف PDF لـ *${shop}* جاهز:`, {
                    reply_markup: { inline_keyboard: [[{ text: '📂 فتح الكشف', url: url }]] }
                });
            }
        } catch (e) { bot.sendMessage(chatId, "❌ فشل إنشاء PDF."); }
    }
});

async function processTransaction(chatId, text) {
    let parts = text.split('-');
    let shop = parts[0], p2 = parts[1], p3 = parts[2], p4 = parts[3];
    let isLakum = (p2 === "لكم");
    let googleData = isLakum ? `${shop}\nلكم عملية == ${p4}\nالسعر == ${p3}` : `${shop}\nالموديل = ${p2}\nالعملية = ${p3}\nعليكم = ${p4}`;

    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, googleData);
        if (res.data.includes("Success")) {
            let header = isLakum ? "📥 *سند استلام مبلغ*" : "📱 *إشعار إنجاز عملية*";
            let body = isLakum ? `💵 *المبلغ:* ${p3}\n📝 *البيان:* ${p4}` : `📱 *الموديل:* ${p2}\n🛠 *العملية:* ${p3}\n💸 *السعر:* ${p4}`;
            let waMsg = `${header}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🏢 *المحل:* ${shop}\n${body}\n📅 *التاريخ:* ${new Date().toLocaleDateString('en-GB')}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🤖 *هذا الإشعار صدر آلياً*\n✅ *تم التوثيق في النظام بنجاح*\n🌹 *شكراً لتعاملكم معنا*`;
            
            const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodeURIComponent(waMsg)}`;
            bot.sendMessage(chatId, `✅ تم التسجيل:\n\n\`${waMsg}\``, { 
                parse_mode: 'Markdown', 
                reply_markup: { inline_keyboard: [[{ text: '📲 إرسال للعميل (واتساب)', url: waLink }]] } 
            });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ اتصال."); }
}

function handleBalanceMenu(chatId) {
    const keyboard = { reply_markup: { inline_keyboard: [[{ text: 'القمة للجوال', callback_data: 'bal_القمة للجوال' }, { text: 'زين فون', callback_data: 'bal_زين فون' }], [{ text: 'عدنان بايزيد', callback_data: 'bal_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'bal_المهندس' }]] } };
    bot.sendMessage(chatId, "💰 اختر المحل:", keyboard);
}

async function handleBalanceQuery(chatId, shop) {
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, `BALANCE_CHECK:${shop}`);
        if (res.data.includes("BAL_DATA")) {
            const p = res.data.split('|');
            const ali = parseFloat(p[1]).toLocaleString();
            const lak = parseFloat(p[2]).toLocaleString();
            const bal = parseFloat(p[3]).toLocaleString();
            const msg = `🧾 *كشف حساب: ${shop}*\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🔴 عليكم: ${ali}\n🟢 واصل: ${lak}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n💵 *الصافي المطلوب:* ${bal}\n\n🤖 صدر آلياً`;
            bot.sendMessage(chatId, msg, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [[{ text: '📄 استخراج كشف PDF رسمي', callback_data: `pdf_${shop}` }]] }
            });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

async function handleTodayReport(chatId) {
    bot.sendMessage(chatId, "⏳ جاري تجميع اليومية...");
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, "GET_TODAY_REPORT");
        const p = res.data.split('|');
        bot.sendMessage(chatId, `📊 *تقرير اليوم:*\n💰 المبلغ: ${p[1]}\n✅ العمليات: ${p[2]}\n\n🤖 إعداد آلي`, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}