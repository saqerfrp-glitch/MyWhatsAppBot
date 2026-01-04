const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// --- إعداد سيرفر الويب لـ Render ---
const app = express();
const port = process.env.PORT || 10000; 
app.get('/', (req, res) => res.send('البوت يعمل بنجاح وهو الآن متصل بالسحاب! 🚀'));
app.listen(port, () => console.log(`سيرفر الويب جاهز على منفذ ${port}`));

// 1. رابط جوجل سكربت الخاص بك
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxc6igVkJQBVocNljKrSLQuUERsl42yPegIeBvqkg_pzThii8Bt49lyHCng8bPzhIzKRQ/exec";

// 2. إعداد العميل مع إعدادات المتصفح الوهمي (User Agent)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ],
        // هذا السطر مهم جداً ليوهم واتساب بأنه متصفح حقيقي وليس بوت
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
    }
});

// إظهار الـ QR Code في الـ Logs
client.on('qr', (qr) => {
    console.log('--- امسح الكود التالي عبر واتساب (تأكد من تحديث الصفحة إذا لم يعمل) ---');
    qrcode.generate(qr, { small: true });
});

// عند الاتصال بنجاح
client.on('ready', () => {
    console.log('✅ تم الاتصال بنجاح! البوت الآن جاهز للعمل 24/7.');
});

// معالجة الرسائل
client.on('message_create', async (msg) => {
    
    // ميزة القالب
    if (msg.body === 'قالب' || msg.body === 'القالب') {
        msg.reply('القمة للجوال-المبلغ-العملية-الموديل');
        return;
    }

    // فحص الرسائل التي تحتوي على شرطة "-"
    if (msg.body.includes('-')) {
        let parts = msg.body.split('-');
        
        if (parts.length >= 3) {
            let shopName = parts[0].trim();
            let priceValue = parts[1].trim();
            let actionValue = parts[2].trim();
            let modelValue = parts[3] ? parts[3].trim() : ""; 
            
            let rawDataText = "";

            if (actionValue.includes("لكم")) {
                rawDataText = `${shopName} \n لكم عملية == ${actionValue} \n السعر == ${priceValue}`;
            } 
            else {
                rawDataText = `${shopName} \n عليكم = ${priceValue} \n العملية = ${actionValue} \n الموديل = ${modelValue}`;
            }

            console.log(`📡 التقطت رسالة: [${shopName}] | جاري الإرسال لجوجل شيت...`);

            try {
                const response = await axios.post(GOOGLE_SCRIPT_URL, rawDataText, {
                    headers: { 'Content-Type': 'text/plain' }
                });
                console.log('🚀 رد جوجل:', response.data);
            } catch (err) {
                console.error('❌ خطأ في الإرسال لجوجل:', err.message);
            }
        }
    }
});

client.initialize();