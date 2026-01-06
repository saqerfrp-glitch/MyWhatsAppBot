const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// --- إعداد سيرفر الويب لمنع التوقف ---
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('البوت مستيقظ وجاهز للعمل! 🚀'));
app.listen(port, () => console.log(`سيرفر الويب يعمل على المنفذ ${port}`));

// 1. رابط جوجل سكربت الخاص بك
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxc6igVkJQBVocNljKrSLQuUERsl42yPegIeBvqkg_pzThii8Bt49lyHCng8bPzhIzKRQ/exec";

// 2. إعداد العميل مع جلسة محلية
const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 60000,
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

// إظهار كود QR ورابط خارجي في حال التشويه
client.on('qr', (qr) => {
    console.log('--- كود QR جديد ---');
    qrcode.generate(qr, { small: true });
    console.log('إذا ظهر الكود مشوهاً، افتح هذا الرابط في متصفحك وامسحه:');
    console.log(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
});

// عند الاتصال بنجاح
client.on('ready', () => {
    console.log('✅ تم الربط بنجاح! البوت جاهز لاستقبال الرسائل.');
});

// معالجة الرسائل بنموذج: القمه للجوال-1000-frp-sama60
client.on('message_create', async (msg) => {
    
    // طباعة أي رسالة تصل في الـ Logs للتأكد من عمل البوت
    console.log(`📩 رسالة مستلمة: ${msg.body}`);

    // فحص الرسائل التي تحتوي على شرطة "-"
    if (msg.body.includes('-')) {
        let parts = msg.body.split('-');
        
        // التأكد أن الرسالة مطابقة للنموذج (على الأقل 3 أجزاء)
        if (parts.length >= 3) {
            let rawDataText = msg.body; // إرسال النص كما هو: القمه للجوال-1000-frp-sama60

            console.log(`📡 جاري إرسال البيانات لجوجل: [${rawDataText}]`);

            try {
                const response = await axios.post(GOOGLE_SCRIPT_URL, rawDataText, {
                    headers: { 'Content-Type': 'text/plain' }
                });
                
                console.log('🚀 رد جوجل النهائي:', response.data);
                
                // تأكيد في واتساب (اختياري)
                if (response.data.includes("success")) {
                    console.log("✅ تم التسجيل بنجاح في الشيت.");
                }
            } catch (err) {
                console.error('❌ فشل الإرسال، السبب:', err.response ? err.response.data : err.message);
            }
        }
    }
});

client.initialize();