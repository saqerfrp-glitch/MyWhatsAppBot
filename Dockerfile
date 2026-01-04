FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# تثبيت git للتأكد من تحميل المكتبات بشكل صحيح
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# تنظيف الكاش وتثبيت المكتبات
RUN npm cache clean --force && npm install

COPY . .

EXPOSE 10000

CMD ["node", "index.js"]