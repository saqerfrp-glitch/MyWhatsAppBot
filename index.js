const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';
const URL_MY_APP = "https://mywhatsappbot-7jf2.onrender.com";

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || !text.includes('-')) return;

    let parts = text.split('-');
    let shop = parts[0] ? parts[0].trim() : "";
    let p2 = parts[1] ? parts[1].trim() : "";
    let p3 = parts[2] ? parts[2].trim() : "";
    let p4 = parts[3] ? parts[3].trim() : "";

    let formattedText = "";

    // --- النوع الأول: تسجيل رصيد للعميل (لكم) ---
    // النموذج: القمة للجوال-لكم-1000-دفعة
    if (p2 === "لكم") {
        formattedText = `${shop}\n`;
        formattedText += `لكم عملية == ${p4}\n`; // البيان في خانة العملية
        formattedText += `السعر == ${p3}`;       // المبلغ في خانة "لكم"
    } 
    // --- النوع الثاني: تسجيل عملية على العميل (عليكم) ---
    // النموذج: القمة للجوال-A10-تخطي-500
    else {
        formattedText = `${shop}\n`;
        formattedText += `الموديل = ${p2}\n`;    // الموديل (A10)
        formattedText += `العملية = ${p3}\n`;   // العملية (تخطي)
        formattedText += `عليكم = ${p4}`;         // المبلغ في خانة "عليكم"
    }

    if (formattedText !== "") {
        try {
            const response = await axios.post(GOOGLE_SCRIPT_URL, formattedText, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });

            if (response.data.includes("Success")) {
                bot.sendMessage(chatId, `✅ تم التسجيل بنجاح في شيت ${shop}`);
            } else {
                bot.sendMessage(chatId, "⚠️ رد جوجل: " + response.data);
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ خطأ في الاتصال.");
        }
    }
});

// نبض القلب لمنع النوم
setInterval(() => {
    axios.get(URL_MY_APP).catch(() => {});
}, 10 * 60 * 1000);