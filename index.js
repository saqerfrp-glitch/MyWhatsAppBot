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
const ADMIN_ID = 656096830; // ⚠️ ضع الآيدي الخاص بك

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
let userState = {};

bot.setMyCommands([
    { command: 'start', description: '🏠 الرئيسية' },
    { command: 'new', description: '➕ عملية جديدة' },
    { command: 'balance', description: '💰 الرصيد' },
    { command: 'today', description: '📊 اليومية' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId !== ADMIN_ID || !text) return;

    if (text === '/start') {
        return bot.sendMessage(chatId, "مرحباً بك 🛠\nاختر العملية:", {
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

    // --- معالجة النص المدخل (الإصلاح هنا) ---
    if (userState[chatId] && userState[chatId].waitingForData) {
        const { shop, type } = userState[chatId];
        // تقسيم النص بناءً على المسافات فقط
        let parts = text.trim().split(/\s+/);
        
        if (type === 'aliakum') {
            // نتوقع: موديل ... عملية ... سعر
            if (parts.length >= 3) {
                let price = parts.pop(); // آخر كلمة هي السعر
                let model = parts.shift(); // أول كلمة هي الموديل
                let process = parts.join(' '); // كل الباقي هو العملية
                
                // نرسل البيانات مباشرة للدالة
                processTransaction(chatId, shop, type, model, process, price);
                delete userState[chatId];
            } else {
                bot.sendMessage(chatId, "⚠️ خطأ! الصيغة: الموديل العملية السعر");
            }
        } 
        else if (type === 'lakum') {
            // نتوقع: مبلغ ... بيان
            if (parts.length >= 2) {
                let amount = parts.shift(); // أول كلمة هي المبلغ
                let note = parts.join(' '); // الباقي بيان
                
                processTransaction(chatId, shop, type, null, note, amount);
                delete userState[chatId];
            } else {
                bot.sendMessage(chatId, "⚠️ خطأ! الصيغة: المبلغ البيان");
            }
        }
        return;
    }

    if (text === '/balance') return handleBalanceMenu(chatId);
    if (text === '/today') return handleTodayReport(chatId);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const msgId = query.message.message_id;

    bot.answerCallbackQuery(query.id);

    if (data.startsWith('select_')) {
        const shop = data.split('_')[1];
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🛠 تسجيل شغل (عليكم)', callback_data: `type_aliakum_${shop}` }],
                    [{ text: '💵 تسجيل واصل (لكم)', callback_data: `type_lakum_${shop}` }]
                ]
            }
        };
        return bot.editMessageText(`🏢 المحل: *${shop}*`, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: keyboard.reply_markup });
    }

    if (data.startsWith('type_')) {
        const [, type, shop] = data.split('_');
        userState[chatId] = { waitingForData: true, shop: shop, type: type };
        const msg = (type === 'aliakum') ? `📝 شغل لـ *${shop}*\nأرسل: (الموديل العملية السعر)` : `💰 واصل من *${shop}*\nأرسل: (المبلغ البيان)`;
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
                bot.sendMessage(chatId, `✅ تم استخراج الكشف:\n${url}`, {
                    reply_markup: { inline_keyboard: [[{ text: '📂 فتح الملف', url: url }]] }
                });
            } else {
                bot.sendMessage(chatId, "❌ حدث خطأ في إنشاء الملف: " + res.data);
            }
        } catch (e) { bot.sendMessage(chatId, "❌ خطأ اتصال."); }
    }
});

// دالة المعالجة الجديدة (تقبل متغيرات منفصلة)
async function processTransaction(chatId, shop, type, p1, p2, p3) {
    // تجهيز البيانات لإرسالها لجوجل (فاصل | )
    // type aliakum: shop|aliakum|model|process|price
    // type lakum:   shop|lakum|amount|note
    
    let googlePayload = "";
    if (type === 'aliakum') {
        googlePayload = `${shop}|aliakum|${p1}|${p2}|${p3}`;
    } else {
        googlePayload = `${shop}|lakum|${p3}|${p2}`; // p3 here is amount, p2 is note
    }

    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, googlePayload);
        if (res.data.includes("Success")) {
            // تنسيق رسالة الواتساب
            let header = (type === 'lakum') ? "📥 *سند استلام مبلغ*" : "📱 *إشعار إنجاز عملية*";
            let body = (type === 'lakum') ? 
                `💵 *المبلغ:* ${p3}\n📝 *البيان:* ${p2}` : 
                `📱 *الموديل:* ${p1}\n🛠 *العملية:* ${p2}\n💸 *السعر:* ${p3}`;

            let waMsg = `${header}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🏢 *المحل:* ${shop}\n${body}\n📅 *التاريخ:* ${new Date().toLocaleDateString('en-GB')}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🤖 *هذا الإشعار صدر آلياً*\n✅ *تم التوثيق بنجاح*\n🌹 *شكراً لتعاملكم معنا*`;
            
            const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodeURIComponent(waMsg)}`;
            
            bot.sendMessage(chatId, `✅ تم التسجيل:\n\n\`${waMsg}\``, { 
                parse_mode: 'Markdown', 
                reply_markup: { inline_keyboard: [[{ text: '📲 إرسال واتساب', url: waLink }]] } 
            });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ في السيرفر."); }
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
            const msg = `🧾 *كشف حساب: ${shop}*\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🔴 عليكم: ${ali}\n🟢 واصل: ${lak}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n💵 *الصافي المطلوب:* ${bal}`;
            bot.sendMessage(chatId, msg, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [[{ text: '📄 كشف PDF', callback_data: `pdf_${shop}` }]] }
            });
        } else {
            bot.sendMessage(chatId, "⚠️ البيانات غير صحيحة من المصدر.");
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

async function handleTodayReport(chatId) {
    bot.sendMessage(chatId, "⏳ جاري التجميع...");
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, "GET_TODAY_REPORT");
        // تأكد من تحديث دالة التقرير في جوجل لتعيد البيانات
        bot.sendMessage(chatId, `📊 تقرير اليوم: ${res.data}`); 
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

setInterval(() => { axios.get(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`).catch(() => {}); }, 4 * 60 * 1000);