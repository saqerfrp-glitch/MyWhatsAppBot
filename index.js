const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Running 🚀'));
app.listen(process.env.PORT || 10000);

const TELEGRAM_TOKEN = '8012907736:AAE2ebdQb7qKgDcAhToNU3xFqgO9vizr52E';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbHmQP8g0rjxYSkkQJPEqkMN2cruAlQk_BN6y-rkb_Yi-Xr39RZw_XtVSg5fbEeEN89A/exec';

const MY_WHATSAPP_NUMBER = "967775787199"; 

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// تحديث قائمة الأوامر
bot.setMyCommands([
    { command: 'start', description: 'النماذج والتعليمات' },
    { command: 'aliakum', description: 'القمة: نموذج عليكم' },
    { command: 'zain', description: 'زين فون: نموذج عليكم' },
    { command: 'adnan', description: 'عدنان بايزيد: نموذج عليكم' },
    { command: 'mohandes', description: 'المهندس: نموذج عليكم' }
]);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text.startsWith('/')) {
        handleCommands(chatId, text);
        return;
    }

    if (text.includes('-')) {
        let parts = text.split('-');
        let shop = parts[0].trim();
        let p2 = parts[1] ? parts[1].trim() : "";
        let p3 = parts[2] ? parts[2].trim() : "";
        let p4 = parts[3] ? parts[3].trim() : "";

        let waMsg = "";
        let googleData = "";

        if (p2 === "لكم") {
            googleData = `${shop}\nلكم عملية == ${p4}\nالسعر == ${p3}`;
            waMsg = `✅ *تمت عملية الإيداع بنجاح*\n\n🏢 المحل: ${shop}\n💵 المبلغ: ${p3}\n📝 البيان: ${p4}\n\nشكراً لتعاملكم معنا 🌹`;
        } else {
            googleData = `${shop}\nالموديل = ${p2}\nالعملية = ${p3}\nعليكم = ${p4}`;
            waMsg = `✅ *تمت العملية بنجاح*\n\n🏢 المحل: ${shop}\n📱 الموديل: ${p2}\n🛠 العملية: ${p3}\n💸 السعر: ${p4}\n\nشكراً لتعاملكم معنا 🌹`;
        }

        try {
            const response = await axios.post(GOOGLE_SCRIPT_URL, googleData);
            if (response.data.includes("Success")) {
                const encodedMsg = encodeURIComponent(waMsg);
                const waLink = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodedMsg}`;

                const responseMsg = `✅ **سُجلت في الشيت لـ ${shop}**\n\n` +
                                    `📄 **النص المنسق (اضغط للنسخ):**\n` +
                                    `\`${waMsg}\``;

                const opts = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '📲 فتح واتساب الأعمال الآن', url: waLink }]]
                    }
                };
                bot.sendMessage(chatId, responseMsg, opts);
            }
        } catch (e) {
            bot.sendMessage(chatId, "❌ فشل الاتصال بجوجل.");
        }
    }
});

function handleCommands(chatId, text) {
    if (text === '/start') {
        bot.sendMessage(chatId, "📊 **النماذج الجاهزة (اضغط للنسخ):**\n\n🏢 القمة: `/aliakum`\n🏢 زين: `/zain`\n🏢 عدنان: `/adnan`\n🏢 المهندس: `/mohandes`", { parse_mode: 'Markdown' });
    } else if (text === '/aliakum') {
        bot.sendMessage(chatId, "`القمة للجوال-الموديل-العملية-السعر`", { parse_mode: 'Markdown' });
    } else if (text === '/zain') {
        bot.sendMessage(chatId, "`زين فون-الموديل-العملية-السعر`", { parse_mode: 'Markdown' });
    } else if (text === '/adnan') {
        bot.sendMessage(chatId, "`عدنان بايزيد-الموديل-العملية-السعر`", { parse_mode: 'Markdown' });
    } else if (text === '/mohandes') {
        bot.sendMessage(chatId, "`المهندس-الموديل-العملية-السعر`", { parse_mode: 'Markdown' });
    }
}

setInterval(() => { axios.get("https://mywhatsappbot-7jf2.onrender.com").catch(()=>{}); }, 5 * 60 * 1000);