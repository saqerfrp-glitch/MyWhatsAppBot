const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// --- إعداد سيرفر الويب لـ Render ---
const app = express();
const port = process.env.PORT || 10000; // Render يفضل المنفذ 10000
app.get('/', (req, res) => res.send('القرين يعمل في السحاب! 🚀'));
app.listen(port, () => console.log(`سيرفر الويب جاهز على منفذ ${port}`));

// 1. رابط جوجل سكربت الخاص بك (تم الحفاظ عليه كما هو)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxc6igVkJQBVocNljKrSLQuUERsl42yPegIeBvqkg_pzThii8Bt49lyHCng8bPzhIzKRQ/exec";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // تم تعديل هذا الجزء ليعمل على لينكس (Render) وويندوز تلقائياً
        executablePath: process.platform === 'win32' 
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
            : '/usr/bin/google-chrome-stable',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// إظهار الـ QR Code في الـ Logs
client.on('qr', (qr) => {
    console.log('--- امسح الكود التالي من سجلات السيرفر ---');
    qrcode.generate(qr, { small: true });
});

// عند الاتصال
client.on('ready', () => {
    console.log('✅ القرين متصل الآن وجاهز للاستخدام من السيرفر!');
});

// معالجة الرسائل وإرسالها لجوجل شيت
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

            console.log(`📡 التقطت رسالة: [${shopName}] | جاري الإرسال لـ Google Sheets...`);

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