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
    let part2 = parts[1] ? parts[1].trim() : "";
    let part3 = parts[2] ? parts[2].trim() : "";
    let part4 = parts[3] ? parts[3].trim() : "";

    let formattedText = "";

    // --- الحالة الأولى: التسجيل لصالح العميل (لكم) ---
    // النموذج المطلوب: القمة للجوال-لكم-المبلغ-العملية
    if (part2 === "لكم") {
        let price = part3;
        let actionNote = part4;
        
        formattedText = `${shop}\n`;
        formattedText += `لكم عملية == ${actionNote}\n`; // تذهب لخانة العملية (E)
        formattedText += `السعر == ${price}`;           // تذهب لخانة لكم (C)
        
        console.log("💰 إرسال (لكم) إلى جوجل...");
    } 
    // --- الحالة الثانية: العملية العادية (عليكم) ---
    // النموذج المطلوب: القمة للجوال-الموديل-العملية-السعر
    else {
        let model = part2;
        let process = part3;
        let price = part4;

        formattedText = `${shop}\n`;
        formattedText += `الموديل = ${model}\n`;    // تذهب لخانة الموديل (F)
        formattedText += `العملية = ${process}\n`; // تذهب لخانة العملية (E)
        formattedText += `عليكم = ${price}`;       // تذهب لخانة عليكم (D)
        
        console.log("🛠 إرسال عملية عادية إلى جوجل...");
    }

    if (formattedText !== "") {
        try {
            const response = await axios.post(GOOGLE_SCRIPT_URL, formattedText, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });

            if (response.data.includes("Success")) {
                bot.sendMessage(chatId, `✅ تم التسجيل بنجاح في ${shop}`);
            } else {
                bot.sendMessage(chatId, "⚠️ رد جوجل: " + response.data);
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ فشل الاتصال بجوجل.");
        }
    }
});

// نبض القلب لمنع النوم
setInterval(() => {
    axios.get(URL_MY_APP).catch(() => {});
}, 10 * 60 * 1000);