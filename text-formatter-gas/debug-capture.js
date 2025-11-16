const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  // コンソールログをキャプチャ
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // エラーをキャプチャ
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // デプロイされたURLにアクセス
  const url = 'https://script.google.com/macros/s/AKfycbxdoZQLIAYodBf3tLnIkD9yR-I1eAhBlj33zK9Oe7EV6uk3OYeAs4HOyFIidWhOtsHd/exec';
  
  console.log('アクセス中:', url);
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  console.log('ブラウザを開いたままにします。終了するにはCtrl+Cを押してください。');
  
  // ブラウザを開いたままにする
  await new Promise(() => {});
})();
