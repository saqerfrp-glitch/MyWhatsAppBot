const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot Status: Active ✅'));
app.listen(process.env.PORT || 10000);

// --- إعداداتك ---
const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
// ⚠️ ضع هنا رابط جوجل الجديد الذي حصلت عليه بعد خطوة JSON والأذونات
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec'; 
const MY_WHATSAPP_NUMBER = "967775787199"; 
const ADMIN_ID = 656096830; // ⚠️ ضع الآيدي الخاص بك

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
let userState = {};

bot.setMyCommands([
    { command: 'start', description: '🏠 القائمة' },
    { command: 'new', description: '➕ جديد' },
    { command: 'balance', description: '💰 رصيد' },
    { command: 'today', description: '📊 اليومية' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (chatId !== ADMIN_ID || !text) return;

    if (text === '/start') {
        return bot.sendMessage(chatId, "مرحباً بك 🛠", {
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
        return bot.sendMessage(chatId, "🏬 اختر المحل:", keyboard);
    }

    if (userState[chatId] && userState[chatId].waitingForData) {
        const { shop, type } = userState[chatId];
        let parts = text.trim().split(/\s+/);
        if (type === 'aliakum' && parts.length >= 3) {
            let p = parts.pop(); let m = parts.shift(); let pr = parts.join(' ');
            processTransaction(chatId, shop, type, m, pr, p);
            delete userState[chatId];
        } else if (type === 'lakum' && parts.length >= 2) {
            let a = parts.shift(); let n = parts.join(' ');
            processTransaction(chatId, shop, type, null, n, a);
            delete userState[chatId];
        }
    }
    
    if (text === '/balance') return handleBalanceMenu(chatId);
    if (text === '/today') return handleTodayReport(chatId);
});

bot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id;
    const data = q.data;
    bot.answerCallbackQuery(q.id);

    if (data.startsWith('select_')) {
        const shop = data.split('_')[1];
        bot.sendMessage(chatId, `🏢 المحل: *${shop}*`, { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '🛠 شغل (عليكم)', callback_data: `type_aliakum_${shop}` }], [{ text: '💵 واصل (لكم)', callback_data: `type_lakum_${shop}` }]] } 
        });
    }

    if (data.startsWith('type_')) {
        const [, type, shop] = data.split('_');
        userState[chatId] = { waitingForData: true, shop: shop, type: type };
        bot.sendMessage(chatId, (type === 'aliakum') ? `📝 شغل لـ ${shop}: (الموديل العملية السعر)` : `💰 واصل من ${shop}: (المبلغ البيان)`);
    }

    if (data.startsWith('bal_')) return handleBalanceQuery(chatId, data.split('_')[1]);

    if (data.startsWith('pdf_')) {
        const shop = data.split('_')[1];
        bot.sendMessage(chatId, `⏳ جاري إنشاء ملف PDF لـ ${shop}...`);
        try {
            const res = await axios.post(GOOGLE_SCRIPT_URL, `GENERATE_PDF:${shop}`);
            if (res.data.includes("PDF_URL")) {
                bot.sendMessage(chatId, `✅ كشف الحساب جاهز:\n${res.data.split('|')[1]}`);
            } else { bot.sendMessage(chatId, "❌ خطأ في جوجل: " + res.data); }
        } catch (e) { bot.sendMessage(chatId, "❌ خطأ اتصال."); }
    }
});

async function processTransaction(chatId, shop, type, p1, p2, p3) {
    let payload = (type === 'aliakum') ? `${shop}|aliakum|${p1}|${p2}|${p3}` : `${shop}|lakum|${p3}|${p2}`;
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, payload);
        if (res.data.includes("Success")) {
            let waMsg = `🏢 *المحل:* ${shop}\n${(type==='lakum'?'💵':'📱')} *التفاصيل:* ${p2} ${p3}\n📅 *التاريخ:* ${new Date().toLocaleDateString('en-GB')}`;
            bot.sendMessage(chatId, `✅ تم الحفظ بنجاح.\n\n\`${waMsg}\``, { parse_mode: 'Markdown' });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ فشل الحفظ."); }
}

async function handleBalanceMenu(chatId) {
    bot.sendMessage(chatId, "💰 اختر المحل:", { reply_markup: { inline_keyboard: [[{ text: 'القمة', callback_data: 'bal_القمة للجوال' }, { text: 'زين فون', callback_data: 'bal_زين فون' }], [{ text: 'عدنان', callback_data: 'bal_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'bal_المهندس' }]] } });
}

async function handleBalanceQuery(chatId, shop) {
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, `BALANCE_CHECK:${shop}`);
        if (res.data.includes("BAL_DATA")) {
            const p = res.data.split('|');
            bot.sendMessage(chatId, `🧾 *${shop}*\n🔴 عليكم: ${p[1]}\n🟢 واصل: ${p[2]}\n💵 الصافي: ${p[3]}`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [[{ text: '📄 كشف PDF', callback_data: `pdf_${shop}` }]] }
            });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

async function handleTodayReport(chatId) {
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, "GET_TODAY_REPORT");
        if (res.data.includes("TODAY_DATA")) {
            const p = res.data.split('|');
            bot.sendMessage(chatId, `📊 *اليومية:*\n💰 الإجمالي: ${p[1]}\n✅ العمليات: ${p[2]}\n\n${p[3]}`, { parse_mode: 'Markdown' });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}