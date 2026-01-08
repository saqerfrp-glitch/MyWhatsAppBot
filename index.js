const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Live ✅'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- إعداداتك ---
const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec'; 
const MY_WHATSAPP_NUMBER = "967775787199"; 
const ADMIN_ID = 656096830; // ⚠️ ضع الآيدي الخاص بك هنا

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
let userState = {};

const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

bot.setMyCommands([
    { command: 'start', description: '🏠 القائمة الرئيسية' },
    { command: 'new', description: '➕ إضافة عملية جديدة' },
    { command: 'balance', description: '💰 استعلام عن رصيد' },
    { command: 'today', description: '📊 تقرير اليومية' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId !== ADMIN_ID || !text) return;

    if (text === '/start') {
        return bot.sendMessage(chatId, "🛠 *نظام إدارة الحسابات الذكي*\n\nاختر المهمة من القائمة أدناه:", {
            parse_mode: 'Markdown',
            reply_markup: { 
                keyboard: [
                    ['➕ عملية جديدة'], 
                    ['💰 كشف حساب', '📊 تقرير اليومية']
                ], 
                resize_keyboard: true 
            }
        });
    }

    if (text === '/new' || text === '➕ عملية جديدة') {
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏢 القمة للجوال', callback_data: 'select_القمة للجوال' }],
                    [{ text: '🏢 زين فون', callback_data: 'select_زين فون' }],
                    [{ text: '🏢 عدنان بايزيد', callback_data: 'select_عدنان بايزيد' }],
                    [{ text: '🏢 المهندس', callback_data: 'select_المهندس' }]
                ]
            }
        };
        return bot.sendMessage(chatId, "🏬 *اختر المحل المطلوب:*", { parse_mode: 'Markdown', ...keyboard });
    }

    if (userState[chatId] && userState[chatId].waitingForData) {
        const { shop, type } = userState[chatId];
        let parts = text.trim().split(/\s+/);
        
        if (type === 'aliakum' && parts.length >= 3) {
            let price = parts.pop(); 
            let model = parts.shift(); 
            let process = parts.join(' '); 
            processTransaction(chatId, shop, type, model, process, price);
            delete userState[chatId];
        } 
        else if (type === 'lakum' && parts.length >= 2) {
            let amount = parts.shift(); 
            let note = parts.join(' '); 
            processTransaction(chatId, shop, type, null, note, amount);
            delete userState[chatId];
        }
        return;
    }

    if (text === '/balance' || text === '💰 كشف حساب') return handleBalanceMenu(chatId);
    if (text === '/today' || text === '📊 تقرير اليومية') return handleTodayReport(chatId);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    bot.answerCallbackQuery(query.id);

    if (data.startsWith('select_')) {
        const shop = data.split('_')[1];
        bot.sendMessage(chatId, `🏢 المحل: *${shop}*`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🛠 تسجيل شغل (عليكم)', callback_data: `type_aliakum_${shop}` }],
                    [{ text: '💵 تسجيل واصل (لكم)', callback_data: `type_lakum_${shop}` }]
                ]
            }
        });
    }

    if (data.startsWith('type_')) {
        const [, type, shop] = data.split('_');
        userState[chatId] = { waitingForData: true, shop: shop, type: type };
        const msg = (type === 'aliakum') ? `📝 *شغل لـ ${shop}*\nأرسل: (الموديل العملية السعر)` : `💰 *واصل من ${shop}*\nأرسل: (المبلغ البيان)`;
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('bal_')) return handleBalanceQuery(chatId, data.split('_')[1]);
});

async function processTransaction(chatId, shop, type, p1, p2, p3) {
    let payload = (type === 'aliakum') ? `${shop}|aliakum|${p1}|${p2}|${p3}` : `${shop}|lakum|${p3}|${p2}`;

    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, payload);
        if (res.data.includes("Success")) {
            let header = (type === 'lakum') ? "*📥 سند استلام مبلغ*" : "*📱 إشعار إنجاز عملية*";
            let body = (type === 'lakum') ? 
                `*💵 المبلغ:* ${p3}\n*📝 البيان:* ${p2}` : 
                `*📱 الموديل:* ${p1}\n*🛠 العملية:* ${p2}\n*💸 السعر:* ${p3}`;

            let now = new Date();
            let dateStr = now.toLocaleDateString('en-GB');
            let dayStr = daysAr[now.getDay()];

            // رسالة واتساب منسقة بالكامل مع الرموز وعبارة الإشعار الآلي
            let waMsg = `${header}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n*🏢 المحل:* ${shop}\n${body}\n*📅 التاريخ:* ${dateStr}\n*📆 اليوم:* ${dayStr}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n*🤖 هذا الإشعار صدر آلياً*\n✅ *تم التوثيق بنجاح*\n🌹 *شكراً لتعاملكم معنا*`;
            
            const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodeURIComponent(waMsg)}`;
            
            bot.sendMessage(chatId, `✅ *تم الحفظ بنجاح*\n\nانقر للنسخ الإحترافي:\n\n\`${waMsg}\``, { 
                parse_mode: 'Markdown', 
                reply_markup: { inline_keyboard: [[{ text: '📲 إرسال سريع (واتساب)', url: waLink }]] } 
            });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ في الاتصال."); }
}

async function handleBalanceMenu(chatId) {
    bot.sendMessage(chatId, "💰 *اختر المحل لعرض الرصيد:*", {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🏢 القمة للجوال', callback_data: 'bal_القمة للجوال' }],
                [{ text: '🏢 زين فون', callback_data: 'bal_زين فون' }],
                [{ text: '🏢 عدنان بايزيد', callback_data: 'bal_عدنان بايزيد' }],
                [{ text: '🏢 المهندس', callback_data: 'bal_المهندس' }]
            ]
        }
    });
}

async function handleBalanceQuery(chatId, shop) {
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, `BALANCE_CHECK:${shop}`);
        if (res.data.includes("BAL_DATA")) {
            const p = res.data.split('|');
            let balMsg = `*🧾 كشف حساب: ${shop}*\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n*🔴 عليكم:* ${Number(p[1]).toLocaleString()}\n*🟢 واصل:* ${Number(p[2]).toLocaleString()}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n*💰 الصافي المطلوب:* ${Number(p[3]).toLocaleString()}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n*🤖 صدر آلياً بتاريخ:* ${new Date().toLocaleDateString('en-GB')}`;
            
            bot.sendMessage(chatId, `📊 *تفاصيل الحساب لـ ${shop}*\n\nانقر للنسخ:\n\n\`${balMsg}\``, { parse_mode: 'Markdown' });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

async function handleTodayReport(chatId) {
    bot.sendMessage(chatId, "⏳ جاري جلب التقرير...");
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, "GET_TODAY_REPORT");
        if (res.data.includes("TODAY_DATA")) {
            const p = res.data.split('|');
            let todayMsg = `*📊 تقرير اليومية*\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n*💰 الإجمالي:* ${Number(p[1]).toLocaleString()}\n*✅ العمليات:* ${p[2]}\n\n*التفاصيل:*\n${p[3] || "لا يوجد عمليات"}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n*🤖 تم الاستخراج آلياً*`;
            
            bot.sendMessage(chatId, `📑 *تقرير اليومية الإجمالي*\n\n\`${todayMsg}\``, { parse_mode: 'Markdown' });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}