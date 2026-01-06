const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('البوت مستيقظ وجاهز!'));
app.listen(port, () => console.log(`سيرفر الويب يعمل على المنفذ ${port}`));

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxc6igVkJQBVocNljKrSLQuUERsl42yPegIeBvqkg_pzThii8Bt49lyHCng8bPzhIzKRQ/exec";

const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 60000,
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

client.on('qr', (qr) => {
    console.log('--- كود QR جديد ---');
    // 1. عرض الكود بحجم أصغر جداً (Small)
    qrcode.generate(qr, { small: true });
    
    // 2. إرسال رابط بديل يمكنك نسخه وفتحه في المتصفح إذا ظهر الكود مشوهاً
    console.log('إذا ظهر الكود مشوهاً، انسخ هذا الرابط وافتحه في المتصفح ثم امسحه:');
    console.log(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
});

client.on('ready', () => {
    console.log('✅ تم الربط بنجاح والبوت متصل الآن!');
});

client.on('message_create', async (msg) => {
    if (msg.body.includes('-')) {
        let parts = msg.body.split('-');
        if (parts.length >= 3) {
            let rawDataText = msg.body;
            console.log(`📡 جاري إرسال: [${rawDataText}]`);
            try {
                const response = await axios.post(GOOGLE_SCRIPT_URL, rawDataText, {
                    headers: { 'Content-Type': 'text/plain' }
                });
                console.log('🚀 رد جوجل:', response.data);
            } catch (err) {
                console.error('❌ خطأ في الإرسال:', err.message);
            }
        }
    }
});

client.initialize();