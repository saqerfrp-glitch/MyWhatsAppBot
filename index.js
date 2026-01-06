const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// --- 1. إعداد سيرفر الويب لمنع التوقف (Render) ---
const app = express();
app.get('/', (req, res) => res.send('Bot is Running and Healthy! 🚀'));
app.listen(process.env.PORT || 10000, () => {
    console.log('✅ سيرفر الويب جاهز على المنفذ 10000');
});

// --- 2. الإعدادات الخاصة بك ---
const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const URL_MY_APP = "https://mywhatsappbot-7jf2.onrender.com";

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('✅ بوت تليجرام مستعد لاستلام الرسائل بنموذج (المحل-لكم-السعر-البيان)...');

// --- 3. معالجة الرسائل ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // التأكد أن الرسالة تحتوي على شرطات
    if (!text || !text.includes('-')) return;

    let parts = text.split('-');
    
    // استخراج البيانات حسب الترتيب الجديد
    // النموذج: القمة للجوال-لكم-1000-دفعه حساب
    let shop = parts[0] ? parts[0].trim() : "";
    let type = parts[1] ? parts[1].trim() : "";
    let price = parts[2] ? parts[2].trim() : "";
    let note = parts[3] ? parts[3].trim() : "";

    let formattedText = "";

    // --- حالة "لكم" (لتسجيل مبلغ في خانة الدائن/العميل) ---
    if (type === "لكم") {
        formattedText = `${shop}\n`;
        formattedText += `لكم عملية == ${note}\n`;
        formattedText += `السعر == ${price}`;
        
        console.log("📡 إرسال دفعة (لكم) إلى جوجل...");
    } 
    // --- حالة "عليكم" أو العمليات العادية ---
    else if (parts.length >= 3) {
        formattedText = `${shop}\n`;
        formattedText += `العملية = ${note || type}\n`; // إذا لم يوجد بيان يستخدم الجزء الثاني
        formattedText += `عليكم = ${price}`;
        
        console.log("📡 إرسال عملية (عليكم) إلى جوجل...");
    }

    // إرسال البيانات إلى جوجل سكربت
    if (formattedText !== "" && price !== "") {
        try {
            const response = await axios.post(GOOGLE_SCRIPT_URL, formattedText, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });

            if (response.data.includes("Success")) {
                let successMsg = type === "لكم" 
                    ? `✅ تم تسجيل الدفعة بنجاح\n💰 المبلغ: ${price}\n📝 البيان: ${note}`
                    : `✅ تم تسجيل العملية بنجاح\n💰 السعر: ${price}\n🛠 النوع: ${note || type}`;
                
                bot.sendMessage(chatId, successMsg);
            } else {
                bot.sendMessage(chatId, `⚠️ رد جوجل: ${response.data}`);
            }
        } catch (e) {
            console.error("❌ خطأ في الإرسال:", e.message);
            bot.sendMessage(chatId, "❌ فشل الاتصال بسيرفر جوجل.");
        }
    }
});

// --- 4. كود نبض القلب (Keep-Alive) لمنع النوم ---
setInterval(() => {
    axios.get(URL_MY_APP)
        .then(() => console.log('--- نبض القلب: السيرفر مستيقظ ---'))
        .catch((err) => console.log('--- نبض القلب: تنبيه الاستيقاظ ---'));
}, 10 * 60 * 1000); // يعمل كل 10 دقائق