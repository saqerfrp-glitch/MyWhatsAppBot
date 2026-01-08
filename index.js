const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Live ✅'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- بياناتك ---
const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec'; // ⚠️ ضع الرابط الجديد هنا
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
        return bot.sendMessage(chatId, "أهلاً بك 🛠 اختر:", {
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

    // --- استقبال البيانات وإصلاح الفراغات ---
    if (userState[chatId] && userState[chatId].waitingForData) {
        const { shop, type } = userState[chatId];
        let parts = text.trim().split(/\s+/);
        
        if (type === 'aliakum') {
            // شغل: الموديل ... العملية ... السعر
            if (parts.length >= 3) {
                let price = parts.pop(); // آخر كلمة سعر
                let model = parts.shift(); // أول كلمة موديل
                let process = parts.join(' '); // الباقي عملية
                
                processTransaction(chatId, shop, type, model, process, price);
                delete userState[chatId];
            } else {
                bot.sendMessage(chatId, "⚠️ الصيغة خطأ! الموديل العملية السعر");
            }
        } 
        else if (type === 'lakum') {
            // واصل: المبلغ ... البيان
            if (parts.length >= 2) {
                let amount = parts.shift(); // أول كلمة مبلغ
                let note = parts.join(' '); // الباقي بيان
                
                processTransaction(chatId, shop, type, null, note, amount);
                delete userState[chatId];
            } else {
                bot.sendMessage(chatId, "⚠️ الصيغة خطأ! المبلغ البيان");
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
        bot.sendMessage(chatId, `🏢 المحل: *${shop}*`, { parse_mode: 'Markdown', reply_markup: keyboard.reply_markup });
    }

    if (data.startsWith('type_')) {
        const [, type, shop] = data.split('_');
        userState[chatId] = { waitingForData: true, shop: shop, type: type };
        const msg = (type === 'aliakum') ? `📝 شغل لـ *${shop}*\n(الموديل العملية السعر)` : `💰 واصل من *${shop}*\n(المبلغ البيان)`;
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('bal_')) return handleBalanceQuery(chatId, data.split('_')[1]);

    if (data.startsWith('pdf_')) {
        const shop = data.split('_')[1];
        bot.sendMessage(chatId, `⏳ جاري إنشاء كشف PDF لـ ${shop}...`);
        try {
            const res = await axios.post(GOOGLE_SCRIPT_URL, `GENERATE_PDF:${shop}`);
            if (res.data.includes("PDF_URL")) {
                const url = res.data.split('|')[1];
                bot.sendMessage(chatId, `✅ تم الاستخراج بنجاح:\n${url}`, {
                    reply_markup: { inline_keyboard: [[{ text: '📂 تحميل الكشف', url: url }]] }
                });
            } else {
                bot.sendMessage(chatId, "❌ حدث خطأ أثناء إنشاء الملف.");
            }
        } catch (e) { bot.sendMessage(chatId, "❌ خطأ اتصال."); }
    }
});

async function processTransaction(chatId, shop, type, p1, p2, p3) {
    // إرسال البيانات بنظام الفواصل |
    // Shop|Type|Data1|Data2|Data3
    let payload = "";
    if (type === 'aliakum') {
        payload = `${shop}|aliakum|${p1}|${p2}|${p3}`; // Model|Process|Price
    } else {
        payload = `${shop}|lakum|${p3}|${p2}`; // Amount|Note (Note is p2 here from text parser)
    }

    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, payload);
        if (res.data.includes("Success")) {
            let header = (type === 'lakum') ? "📥 *سند استلام مبلغ*" : "📱 *إشعار إنجاز عملية*";
            let body = (type === 'lakum') ? 
                `💵 *المبلغ:* ${p3}\n📝 *البيان:* ${p2}` : 
                `📱 *الموديل:* ${p1}\n🛠 *العملية:* ${p2}\n💸 *السعر:* ${p3}`;

            let waMsg = `${header}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🏢 *المحل:* ${shop}\n${body}\n📅 *التاريخ:* ${new Date().toLocaleDateString('en-GB')}\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🤖 *هذا الإشعار صدر آلياً*\n✅ *تم التوثيق بنجاح*\n🌹 *شكراً لتعاملكم معنا*`;
            
            const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodeURIComponent(waMsg)}`;
            bot.sendMessage(chatId, `✅ تم الحفظ:\n\n\`${waMsg}\``, { 
                parse_mode: 'Markdown', 
                reply_markup: { inline_keyboard: [[{ text: '📲 واتساب', url: waLink }]] } 
            });
        }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ سيرفر."); }
}

async function handleBalanceQuery(chatId, shop) {
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, `BALANCE_CHECK:${shop}`);
        if (res.data.includes("BAL_DATA")) {
            const p = res.data.split('|');
            const ali = Number(p[1]).toLocaleString();
            const lak = Number(p[2]).toLocaleString();
            const bal = Number(p[3]).toLocaleString();
            
            bot.sendMessage(chatId, `🧾 *كشف حساب: ${shop}*\n🔴 عليكم: ${ali}\n🟢 واصل: ${lak}\n💰 *الصافي:* ${bal}`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [[{ text: '📄 كشف PDF', callback_data: `pdf_${shop}` }]] }
            });
        } else { bot.sendMessage(chatId, "⚠️ خطأ في قراءة البيانات"); }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

async function handleTodayReport(chatId) {
    bot.sendMessage(chatId, "⏳ جاري جلب التقرير...");
    try {
        const res = await axios.post(GOOGLE_SCRIPT_URL, "GET_TODAY_REPORT");
        if (res.data.includes("TODAY_DATA")) {
            const p = res.data.split('|');
            bot.sendMessage(chatId, `📊 *تقرير اليوم:*\n💰 الإجمالي: ${Number(p[1]).toLocaleString()}\n✅ العمليات: ${p[2]}\n\n*التفاصيل:*\n${p[3] || "لا يوجد عمليات"}`, { parse_mode: 'Markdown' });
        } else { bot.sendMessage(chatId, "⚠️ التقرير فارغ أو به خطأ."); }
    } catch (e) { bot.sendMessage(chatId, "❌ خطأ."); }
}

setInterval(() => { axios.get(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`).catch(() => {}); }, 4 * 60 * 1000);