const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const MY_WHATSAPP_NUMBER = "967775787199"; 

// 🛡️ ضع رقم الـ ID الخاص بك هنا (الذي استخرجته من @userinfobot)
const ADMIN_ID = 656096830; 

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
let userState = {};

bot.setMyCommands([
    { command: 'start', description: '🏠 القائمة الرئيسية' },
    { command: 'new', description: '➕ إضافة عملية أو سداد' },
    { command: 'balance', description: '💰 كشف الحساب (الرصيد)' },
    { command: 'today', description: '📊 تقرير الإنجاز اليومي' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId !== ADMIN_ID || !text) return;

    // --- القائمة الرئيسية ---
    if (text === '/start') {
        bot.sendMessage(chatId, "مرحباً بك في نظام الإدارة المحاسبي الذكي 🛠\nاختر من الأزرار بالأسفل للبدء:", {
            reply_markup: { 
                keyboard: [['/new', '/balance'], ['/today']], 
                resize_keyboard: true 
            }
        });
        return;
    }

    // --- أمر إضافة جديد ---
    if (text === '/new') {
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'القمة للجوال', callback_data: 'select_القمة للجوال' }, { text: 'زين فون', callback_data: 'select_زين فون' }],
                    [{ text: 'عدنان بايزيد', callback_data: 'select_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'select_المهندس' }]
                ]
            }
        };
        bot.sendMessage(chatId, "🏬 اختر المحل المطلوب التسجيل له:", keyboard);
        return;
    }

    // --- استقبال البيانات بناءً على الحالة ---
    if (userState[chatId] && userState[chatId].waitingForData) {
        const { shop, type } = userState[chatId];
        let parts = text.split(' ');
        
        if (type === 'aliakum' && parts.length >= 3) {
            processTransaction(chatId, `${shop}-${parts[0]}-${parts[1]}-${parts[2]}`);
            delete userState[chatId];
        } else if (type === 'lakum' && parts.length >= 2) {
            processTransaction(chatId, `${shop}-لكم-${parts[0]}-${parts[1]}`);
            delete userState[chatId];
        } else {
            bot.sendMessage(chatId, "⚠️ بيانات ناقصة! يرجى إرسال البيانات بمسافات واضحة.");
        }
        return;
    }

    if (text === '/balance') handleBalanceMenu(chatId);
    if (text === '/today') handleTodayReport(chatId);
    if (text.includes('-')) processTransaction(chatId, text);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

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
        bot.editMessageText(`🏢 المحل: *${shop}*\nما هي نوع العملية؟`, { 
            chat_id: chatId, 
            message_id: query.message.message_id, 
            parse_mode: 'Markdown', 
            reply_markup: keyboard.reply_markup 
        });
    }

    if (data.startsWith('type_')) {
        const [, type, shop] = data.split('_');
        userState[chatId] = { waitingForData: true, shop: shop, type: type };
        bot.answerCallbackQuery(query.id);
        const msg = (type === 'aliakum') ? 
            `📝 سجل شغل لـ *${shop}*\nأرسل: (الموديل العملية السعر)\nمثال: \`A30 برمجة 3000\`` : 
            `💰 سجل واصل من *${shop}*\nأرسل: (المبلغ البيان)\nمثال: \`15000 كاش\``;
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('bal_')) handleBalanceQuery(chatId, data.split('_')[1], query.id);
});

async function processTransaction(chatId, text) {
    let parts = text.split('-');
    let shop = parts[0].trim(), p2 = parts[1], p3 = parts[2], p4 = parts[3];
    
    let isLakum = (p2 === "لكم");
    let googleData = isLakum ? `${shop}\nلكم عملية == ${p4}\nالسعر == ${p3}` : `${shop}\nالموديل = ${p2}\nالعملية = ${p3}\nعليكم = ${p4}`;

    let header = isLakum ? "📥 *سند استلام مبلغ*" : "📱 *إشعار إنجاز عملية*";
    let body = isLakum ? 
        `💵 *المبلغ:* ${p3}\n📝 *البيان:* ${p4}` : 
        `📱 *الموديل:* ${p2}\n🛠 *العملية:* ${p3}\n💸 *السعر:* ${p4}`;

    let waMsg = `${header}\n` +
                `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n` +
                `🏢 *المحل:* ${shop}\n` +
                `${body}\n` +
                `📅 *التاريخ:* ${new Date().toLocaleDateString('en-GB')}\n` +
                `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n` +
                `🤖 *هذا الإشعار صدر آلياً*\n` +
                `✅ *تم التوثيق في النظام بنجاح*\n` +
                `🌹 *شكراً لتعاملكم معنا*`;

    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, googleData);
        if (res.data.includes("Success")) {
            const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodeURIComponent(waMsg)}`;
            bot.sendMessage(chatId, `✅ تم تسجيل البيانات بنجاح لـ *${shop}*:\n\n\`${waMsg}\``, { 
                parse_mode: 'Markdown', 
                reply_markup: { inline_keyboard: [[{ text: '📲 إرسال الإشعار للعميل', url: waLink }]] } 
            });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ فشل الاتصال بخوادم جوجل."); }
}

function handleBalanceMenu(chatId) {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'القمة للجوال', callback_data: 'bal_القمة للجوال' }, { text: 'زين فون', callback_data: 'bal_زين فون' }],
                [{ text: 'عدنان بايزيد', callback_data: 'bal_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'bal_المهندس' }]
            ]
        }
    };
    bot.sendMessage(chatId, "💰 اختر المحل لعرض الرصيد الحالي:", keyboard);
}

async function handleBalanceQuery(chatId, shop, queryId) {
    bot.answerCallbackQuery(queryId);
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, `BALANCE_CHECK:${shop}`);
        const p = res.data.split('|');
        const msg = `🧾 *كشف حساب: ${shop}*\n` +
                    `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n` +
                    `🔴 إجمالي عليكم: ${Number(p[1]).toLocaleString()}\n` +
                    `🟢 إجمالي واصل: ${Number(p[2]).toLocaleString()}\n` +
                    `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n` +
                    `💵 *الصافي المطلوب:* ${Number(p[3]).toLocaleString()}\n\n` +
                    `🤖 *هذا الإشعار صدر آلياً*`;
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

async function handleTodayReport(chatId) {
    bot.sendMessage(chatId, "⏳ جاري تجميع تقارير اليومية...");
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, "GET_TODAY_REPORT");
        const p = res.data.split('|');
        bot.sendMessage(chatId, `📊 *تقرير يوم:* ${new Date().toLocaleDateString()}\n--------------------------\n✅ إجمالي العمليات: ${p[2]}\n💰 إجمالي المبلغ: ${Number(p[1]).toLocaleString()}\n\n*التفاصيل لكل محل:*\n${p[3] || "لا توجد عمليات مسجلة لهذا اليوم."}\n\n🤖 إعداد آلي بواسطة النظام`, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ في الاتصال."); }
}

setInterval(() => { axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(()=>{}); }, 5 * 60 * 1000);