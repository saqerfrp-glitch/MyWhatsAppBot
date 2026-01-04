const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// --- إعداد سيرفر الويب لـ Render ---
const app = express();
const port = process.env.PORT || 10000; 
app.get('/', (req, res) => res.send('البوت مستيقظ وجاهز للعمل! 🚀'));
app.listen(port, () => console.log(`سيرفر الويب يعمل على المنفذ ${port}`));

// 1. رابط جوجل سكربت الخاص بك
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxc6igVkJQBVocNljKrSLQuUERsl42yPegIeBvqkg_pzThii8Bt49lyHCng8bPzhIzKRQ/exec";

// 2. إعداد العميل مع زيادة وقت الانتظار لمنع التحديث السريع
const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 60000, // زيادة وقت الانتظار لـ 60 ثانية لمنع فشل الربط
    puppeteer: {
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
        ],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

// متغير لمراقبة عدد مرات ظهور الكود
let qrCount = 0;

client.on('qr', (qr) => {
    qrCount++;
    // إذا تكرر الكود بسرعة، نظهر فقط الأكواد الأولى لإعطاء فرصة للمعالجة
    if (qrCount % 2 === 0) { 
        console.log(`--- امسح الكود الآن (محاولة رقم ${qrCount}) ---`);
        qrcode.generate(qr, { small: true });
    }
});

// عند الاتصال بنجاح
client.on('ready', () => {
    console.log('✅ ممتاز يا حب! تم الربط بنجاح والبوت متصل الآن.');
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

            console.log(`📡 جاري إرسال بيانات [${shopName}] إلى جوجل شيت...`);

            try {
                const response = await axios.post(GOOGLE_SCRIPT_URL, rawDataText, {
                    headers: { 'Content-Type': 'text/plain' }
                });
                console.log('🚀 تم التسجيل في جوجل:', response.data);
            } catch (err) {
                console.error('❌ خطأ في الإرسال:', err.message);
            }
        }
    }
});

client.initialize();