const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const NEWS_SOURCES = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/' }
];

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  const outputDir = path.join(__dirname, 'ai-news-screenshots');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  let markdown = `# 最新AI記事まとめ（注釈付き）\n**取得日時**: ${new Date().toLocaleString('ja-JP')}\n\n`;

  for (const source of NEWS_SOURCES) {
    console.log(`\n📰 ${source.name} をスクレイピング中...`);
    
    try {
      await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // 重要な要素に注釈を追加
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
          .ai-highlight { outline: 3px solid red !important; position: relative; }
          .ai-annotation { 
            position: absolute; 
            background: yellow; 
            color: black; 
            padding: 5px 10px; 
            font-weight: bold; 
            font-size: 14px;
            border: 2px solid orange;
            z-index: 9999;
            top: -30px;
            left: 0;
          }
        `;
        document.head.appendChild(style);
        
        const articles = document.querySelectorAll('article, .post, h2 a, h3 a');
        articles.forEach((el, i) => {
          if (i < 3) {
            el.classList.add('ai-highlight');
            const annotation = document.createElement('div');
            annotation.className = 'ai-annotation';
            annotation.textContent = `記事${i + 1}`;
            el.style.position = 'relative';
            el.appendChild(annotation);
          }
        });
      });
      
      const screenshotPath = path.join(outputDir, `${source.name.replace(/\s+/g, '_')}_annotated.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      const articles = await page.evaluate(() => {
        const results = [];
        const links = Array.from(document.querySelectorAll('a'));
        for (const link of links) {
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
      }
      
      markdown += `\n---\n\n`;
      console.log(`✅ ${source.name} 完了`);
      
    } catch (error) {
      console.error(`❌ ${source.name} エラー:`, error.message);
      markdown += `## ${source.name}\n取得エラー\n\n---\n\n`;
    }
  }

  const outputPath = path.join(__dirname, 'AI-NEWS-SUMMARY.md');
  fs.writeFileSync(outputPath, markdown);
  
  console.log(`\n✨ 完了！`);
  console.log(`📄 ${outputPath}`);
  console.log(`📸 ${outputDir}`);

  await browser.close();
})();
