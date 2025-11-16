# AI記事スクレイパー

最新のAI関連記事を自動収集してスクショ付きでまとめます。

## 使い方

### 初回のみ
```bash
cd c:\my-website\text-formatter-gas
npm install
```

### 記事を収集
```bash
ai-news.bat
```
または
```bash
npm run ai-news
```

## 収集元

1. **TechCrunch AI** - AI業界の最新ニュース
2. **The Verge AI** - テクノロジーとAIの動向
3. **MIT Technology Review** - 学術的なAI研究
4. **VentureBeat AI** - AIビジネスとスタートアップ
5. **OpenAI Blog** - OpenAIの公式ブログ

## 出力

### AI-NEWS-SUMMARY.md
- 各サイトの最新記事トップ3
- 記事タイトルとリンク
- スクリーンショット付き

### ai-news-screenshots/
- 各サイトのスクリーンショット（PNG形式）

## カスタマイズ

### 収集元を追加
`ai-news-scraper.js` の `NEWS_SOURCES` 配列に追加：

```javascript
{ name: 'サイト名', url: 'https://example.com/ai' }
```

### 記事数を変更
`.slice(0, 5)` の数字を変更（デフォルト: 3記事）

### スクショサイズを変更
`setViewport` のwidth/heightを変更

## トラブルシューティング

### タイムアウトエラー
- ネットワーク接続を確認
- `timeout: 30000` の値を増やす

### 記事が取得できない
- サイトの構造が変わった可能性
- セレクタを調整する必要あり

### スクショが真っ白
- `waitUntil: 'networkidle2'` を `'load'` に変更
