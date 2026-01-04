FROM ghcr.io/puppeteer/puppeteer:latest

# تحديد المستخدم كجذر (Root) لتجنب مشاكل الصلاحيات في Render
USER root

# تحديد مجلد العمل
WORKDIR /app

# نسخ ملفات الإعدادات
COPY package*.json ./

# تثبيت المكتبات (نستخدم --no-package-lock لتسريع العملية)
RUN npm install

# نسخ بقية الملفات
COPY . .

# فتح المنفذ الذي يستخدمه Express
EXPOSE 10000

# تشغيل البوت
CMD ["node", "index.js"]