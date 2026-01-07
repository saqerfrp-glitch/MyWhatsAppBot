const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const MY_WHATSAPP_NUMBER = "967775787199"; 
const ADMIN_ID = 656096830; // ضع رقم ID الخاص بك هنا

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// لتخزين حالة المستخدم (هل هو بصدد إدخال بيانات؟)
let userState = {};

bot.setMyCommands([
    { command: 'start', description: 'الرئيسية والتعليمات' },
    { command: 'new', description: '➕ إضافة عملية جديدة' },
    { command: 'balance', description: '💰 كشف الحساب' },
    { command: 'today', description: '📊 تقرير اليومية' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId !== ADMIN_ID) {
        bot.sendMessage(chatId, "⛔ الوصول مرفوض.");
        return;
    }

    if (!text) return;

    // --- أمر إضافة عملية جديدة (بالأزرار) ---
    if (text === '/new') {
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'القمة للجوال', callback_data: 'add_القمة للجوال' }, { text: 'زين فون', callback_data: 'add_زين فون' }],
                    [{ text: 'عدنان بايزيد', callback_data: 'add_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'add_المهندس' }]
                ]
            }
        };
        bot.sendMessage(chatId, "🏬 اختر المحل الذي تريد التسجيل فيه:", keyboard);
        return;
    }

    // --- إذا كان البوت ينتظر من المستخدم بيانات المحل ---
    if (userState[chatId] && userState[chatId].waitingForData) {
        const shop = userState[chatId].shop;
        // نقوم بتحويل النص العادي إلى صيغة الشرطات تلقائياً
        // نتوقع أن يرسل المستخدم: موديل عملية سعر (بينهما فراغات)
        let parts = text.split(' ');
        if (parts.length >= 3) {
            let formattedText = `${shop}-${parts[0]}-${parts[1]}-${parts[2]}`;
            bot.sendMessage(chatId, `⏳ جاري معالجة: ${formattedText}`);
            processTransaction(chatId, formattedText);
            delete userState[chatId]; // مسح الحالة بعد التنفيذ
        } else {
            bot.sendMessage(chatId, "⚠️ الصيغة خاطئة. أرسل (الموديل العملية السعر) وبينهما مسافات فقط.");
        }
        return;
    }

    // --- الأوامر العادية ---
    if (text === '/start') {
        bot.sendMessage(chatId, "✅ نظام المحاسبة جاهز.\nاستخدم الأوامر بالأسفل أو من القائمة.", {
            reply_markup: {
                keyboard: [['/new', '/balance'], ['/today']],
                resize_keyboard: true
            }
        });
    } else if (text === '/balance') {
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'القمة للجوال', callback_data: 'bal_القمة للجوال' }, { text: 'زين فون', callback_data: 'bal_زين فون' }],
                    [{ text: 'عدنان بايزيد', callback_data: 'bal_عدنان بايزيد' }, { text: 'المهندس', callback_data: 'bal_المهندس' }]
                ]
            }
        };
        bot.sendMessage(chatId, "💰 اختر المحل لعرض الرصيد:", keyboard);
    } else if (text === '/today') {
        handleTodayReport(chatId);
    } else if (text.includes('-')) {
        processTransaction(chatId, text);
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('add_')) {
        const shop = data.split('_')[1];
        userState[chatId] = { waitingForData: true, shop: shop };
        bot.answerCallbackQuery(query.id);
        bot.sendMessage(chatId, `📝 سجل الآن لـ *${shop}*\nأرسل البيانات بالصيغة: (الموديل العملية السعر)\n_مثال: A10 تخطي 5000_`, { parse_mode: 'Markdown' });
    }
    
    // ... بقية الـ callback_query الخاصة بالـ balance كما هي ...
    else if (data.startsWith('bal_')) {
        handleBalanceQuery(chatId, data.split('_')[1], query.id);
    }
});

// دالة تقرير اليومية
async function handleTodayReport(chatId) {
    bot.sendMessage(chatId, "⏳ جاري تجميع تقرير اليوم...");
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, "GET_TODAY_REPORT");
        const p = res.data.split('|');
        bot.sendMessage(chatId, `📅 **تقرير الإنجاز اليومي**\n--------------------------\n✅ العمليات: ${p[2]}\n💰 المبلغ: ${Number(p[1]).toLocaleString()} ريال\n\n**التفاصيل:**\n${p[3] || "لا يوجد"}`, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

// دالة كشف الحساب
async function handleBalanceQuery(chatId, shop, queryId) {
    bot.answerCallbackQuery(queryId);
    bot.sendMessage(chatId, `⏳ جاري حساب رصيد *${shop}*...`, { parse_mode: 'Markdown' });
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, `BALANCE_CHECK:${shop}`);
        const p = res.data.split('|');
        const msg = `💰 **كشف حساب: ${shop}**\n\n🔴 عليكم: ${Number(p[1]).toLocaleString()}\n🟢 لكم: ${Number(p[2]).toLocaleString()}\n----------------\n💵 **الصافي: ${Number(p[3]).toLocaleString()}**`;
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

// دالة التسجيل الأساسية
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
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ في الاتصال بجوجل."); }
}

setInterval(() => { axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(()=>{}); }, 5 * 60 * 1000);