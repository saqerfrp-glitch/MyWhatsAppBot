const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// --- إعداد سيرفر الويب لـ Render ---
const app = express();
const port = process.env.PORT || 10000; 
app.get('/', (req, res) => res.send('البوت مستيقظ وجاهز للعمل! 🚀'));
app.listen(port, () => console.log(`سيرفر الويب يعمل على المنفذ ${port}`));

// 1. رابط جوجل سكربت (تأكد من تحديثه إذا حصلت على رابط جديد بعد الـ Deploy)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxc6igVkJQBVocNljKrSLQuUERsl42yPegIeBvqkg_pzThii8Bt49lyHCng8bPzhIzKRQ/exec";

// 2. إعداد العميل
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

// إظهار الـ QR Code
client.on('qr', (qr) => {
    console.log('--- امسح الكود الجديد ---');
    qrcode.generate(qr, { small: true });
});

// عند الاتصال بنجاح
client.on('ready', () => {
    console.log('✅ م تم الربط بنجاح والبوت متصل الآن.');
});

// معالجة الرسائل وإرسالها لجوجل شيت (نفس نظام الكروم)
client.on('message_create', async (msg) => {
    
    // رد تلقائي للقالب
    if (msg.body === 'قالب' || msg.body === 'القالب') {
        msg.reply('القمة للجوال-المبلغ-العملية-الموديل');
        return;
    }

    // فحص الرسائل التي تحتوي على شرطة "-"
    if (msg.body.includes('-')) {
        let parts = msg.body.split('-');
        
        // التأكد أن الرسالة تحتوي على الأجزاء المطلوبة
        if (parts.length >= 3) {
            
            // إرسال الرسالة كاملة كما هي (مثل نظام الكروم)
            let rawDataText = msg.body; 

            console.log(`📡 جاري إرسال النص: [${rawDataText}] إلى جوجل شيت...`);

            try {
                const response = await axios.post(GOOGLE_SCRIPT_URL, rawDataText, {
                    headers: { 'Content-Type': 'text/plain' }
                });
                
                // طباعة رد جوجل لمعرفة النتيجة
                console.log('🚀 رد جوجل:', response.data);
                
                if (response.data.includes("success")) {
                    console.log("✅ تمت العملية بنجاح في الشيت.");
                }

            } catch (err) {
                // كشف سبب الفشل الحقيقي
                console.error('❌ خطأ في الإرسال:');
                if (err.response) {
                    console.error('كود الخطأ:', err.response.status);
                    console.error('تفاصيل:', err.response.data);
                } else {
                    console.error('الرسالة:', err.message);
                }
            }
        }
    }
});

client.initialize();