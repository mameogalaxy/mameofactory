const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const NEWS_SOURCES = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/' }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const outputDir = path.join(__dirname, 'ai-news-screenshots');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  let markdown = `# 最新AI記事まとめ\n**取得日時**: ${new Date().toLocaleString('ja-JP')}\n\n`;

  for (const source of NEWS_SOURCES) {
    console.log(`\n📰 ${source.name} をスクレイピング中...`);
    
    try {
      const page = await browser.newPage();
      await page.addStyleTag({
        content: `
          .highlight-box { position: absolute; border: 3px solid red; background: rgba(255,0,0,0.1); z-index: 9999; }
          .annotation { position: absolute; background: yellow; padding: 5px; font-weight: bold; z-index: 9999; border: 2px solid orange; }
        `
      });
      await page.setViewport({ width: 1280, height: 720 });
      
      await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const screenshotPath = path.join(outputDir, `${source.name.replace(/\s+/g, '_')}.png`);
      // 重要な要素にハイライトを追加
      await page.evaluate(() => {
        const articles = document.querySelectorAll('article, .post, .story, h2, h3');
        articles.forEach((el, i) => {
          if (i < 3) {
            const rect = el.getBoundingClientRect();
            const highlight = document.createElement('div');
            highlight.className = 'highlight-box';
            highlight.style.cssText = `
              position: absolute;
              left: ${rect.left + window.scrollX}px;
              top: ${rect.top + window.scrollY}px;
              width: ${rect.width}px;
              height: ${rect.height}px;
              border: 3px solid red;
              background: rgba(255,0,0,0.1);
              z-index: 9999;
              pointer-events: none;
            `;
            document.body.appendChild(highlight);
          }
        });
      });
      
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      const articles = await page.evaluate(() => {
        const results = [];
        const links = Array.from(document.querySelectorAll('a'));
        
        for (const link of links.slice(0, 5)) {
          const title = link.textContent.trim();
          const url = link.href;
          
          if (title && url && title.length > 20 && title.length < 200) {
            results.push({ title, url });
          }
          
          if (results.length >= 3) break;
        }
        
        return results;
      });
      
      markdown += `## ${source.name}\n`;
      markdown += `![${source.name}](./ai-news-screenshots/${path.basename(screenshotPath)})\n\n`;
      
      if (articles.length > 0) {
        articles.forEach((article, i) => {
          markdown += `${i + 1}. [${article.title}](${article.url})\n`;
        });
      } else {
        markdown += `記事を取得できませんでした\n`;
      }
      
      markdown += `\n---\n\n`;
      
      await page.close();
      console.log(`✅ ${source.name} 完了`);
      
    } catch (error) {
      console.error(`❌ ${source.name} エラー:`, error.message);
      markdown += `## ${source.name}\n取得エラー: ${error.message}\n\n---\n\n`;
    }
  }

  const outputPath = path.join(__dirname, 'AI-NEWS-SUMMARY.md');
  fs.writeFileSync(outputPath, markdown);
  
  console.log(`\n✨ 完了！`);
  console.log(`📄 レポート: ${outputPath}`);
  console.log(`📸 スクショ: ${outputDir}`);

  await browser.close();
})();
