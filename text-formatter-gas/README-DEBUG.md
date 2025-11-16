# AI筋トレRPG デバッグツール

## 使い方

### 1. 初回セットアップ
```bash
cd c:\my-website\text-formatter-gas
npm install
```

### 2. デバッグ開始
```bash
debug.bat
```
または
```bash
npm run debug
```

## 機能

- ブラウザを表示したまま実行
- DevToolsを自動で開く
- コンソールログをターミナルに表示
- エラーメッセージをキャプチャ
- ネットワークリクエストを監視

## 確認できること

1. **ページの読み込み**
   - HTMLが正しく表示されるか
   - CSSが適用されているか
   - JavaScriptが実行されているか

2. **コンソールログ**
   - エラーメッセージ
   - デバッグ情報
   - 警告

3. **ネットワーク**
   - APIリクエスト
   - 画像の読み込み
   - レスポンスの内容

4. **動作確認**
   - ボタンのクリック
   - ゲームの進行
   - データの保存

## トラブルシューティング

### Puppeteerがインストールできない
```bash
npm install puppeteer --legacy-peer-deps
```

### ブラウザが起動しない
- Node.jsがインストールされているか確認
- `node --version` でバージョン確認

### エラーが表示される
- ターミナルに表示されるエラーメッセージを確認
- DevToolsのConsoleタブを確認
