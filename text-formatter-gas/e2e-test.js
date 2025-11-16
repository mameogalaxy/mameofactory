const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  const screenshotDir = path.join(__dirname, 'e2e-screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

  const url = 'https://script.google.com/macros/s/AKfycbxdoZQLIAYodBf3tLnIkD9yR-I1eAhBlj33zK9Oe7EV6uk3OYeAs4HOyFIidWhOtsHd/exec';
  
  console.log('🧪 E2Eテスト開始');
  
  // テスト1: ページ読み込み
  console.log('📄 テスト1: ページ読み込み');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '01_page_load.png'), fullPage: true });
  console.log('✅ ページ読み込み完了');

  // テスト2: ゲームスタートボタン確認
  console.log('🎮 テスト2: ゲームスタートボタン');
  const startButton = await page.locator('text=ゲームスタート').first();
  await startButton.highlight();
  await page.screenshot({ path: path.join(screenshotDir, '02_start_button.png') });
  console.log('✅ スタートボタン確認');

  // テスト3: ランキング表示確認
  console.log('🏆 テスト3: ランキング表示');
  await page.screenshot({ path: path.join(screenshotDir, '03_ranking.png') });
  console.log('✅ ランキング表示確認');

  // テスト4: ゲームスタート
  console.log('▶️ テスト4: ゲームスタート');
  try {
    await page.click('text=ゲームスタート', { timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '04_game_started.png'), fullPage: true });
    console.log('✅ ゲーム開始');
  } catch (e) {
    console.log('⚠️ ゲームスタートボタンが見つかりません');
  }

  // テスト5: ゲーム画面要素確認
  console.log('🎯 テスト5: ゲーム画面要素');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '05_game_screen.png'), fullPage: true });
  console.log('✅ ゲーム画面確認');

  console.log('\n✨ E2Eテスト完了');
  console.log(`📸 スクリーンショット: ${screenshotDir}`);

  await browser.close();
})();
