# AI筋トレRPG BGM機能追加・UI改善
**日付**: 2025年1月11日

## 実施内容

### 1. BGM機能の実装

#### BGM追加手順
1. 音源ファイルを `C:\my-website\text-formatter-gas\sounds\` に配置
2. GitHubにアップロード
3. `script.html`の`bgmUrls`に追加：
```javascript
const bgmUrls={
  'pumpkin':'https://raw.githubusercontent.com/mameogalaxy/mameofactory/master/text-formatter-gas/sounds/pumpkin-knight.mp3',
  '新しいBGM名':'https://raw.githubusercontent.com/mameogalaxy/mameofactory/master/text-formatter-gas/sounds/ファイル名.mp3'
};
```

4. `body.html`にボタン追加：
```html
<button onclick="selectBGM('新しいBGM名')" style="...">BGM名</button>
```

#### BGM設定
- **ループ再生**: `bgmAudio.loop=true;` で自動ループ
- **初期BGM**: パンプキンナイト

### 2. ステージ5の敵変更

#### 変更内容
- **変更前**: ステージ5 = スケルトン
- **変更後**: ステージ5 = パンプキンナイト

#### 修正ファイル
- `script.html` - `enemyNames`配列のインデックス4を変更

### 3. BGMボタンのUI改善

#### スタイル統一
- **カメラボタンと同じデザイン**:
  - 青のグラデーション: `linear-gradient(135deg,#1e3a8a,#06b6d4)`
  - サイズ統一: `padding:10px 15px; font-size:0.9rem`

#### 視覚的フィードバック追加
**問題**: BGM選択時に押したかどうかわからない

**解決策**:
1. **選択中のボタンの色変更**:
   - 通常: 青のグラデーション
   - 選択中: 緑のグラデーション + "ON"表示
   
2. **実装方法**:
```javascript
function selectBGM(bgmName){
  // 全ボタンのスタイルをリセット
  document.querySelectorAll('.bgm-button').forEach(btn=>{
    btn.style.background='linear-gradient(135deg,#1e3a8a,#06b6d4)';
    btn.textContent=btn.textContent.replace(' ON','');
  });
  
  // 選択されたボタンを強調
  event.target.style.background='linear-gradient(135deg,#059669,#10b981)';
  event.target.textContent+=' ON';
  
  // BGM再生
  playBGM(bgmName);
}
```

### 4. スマホ対応の改善

#### 問題
- スマホでBGMが自動再生されない
- ブラウザの自動再生ポリシーによる制限

#### 解決策
1. **ユーザー操作後に再生**:
   - 画面タップ時に再生を試行
   - ボタンクリック時に確実に再生

2. **実装**:
```javascript
// 初回タップ時にBGM再生を許可
document.addEventListener('touchstart',function initAudio(){
  if(bgmAudio.paused&&currentBGM){
    bgmAudio.play().catch(e=>console.log('Auto-play prevented'));
  }
  document.removeEventListener('touchstart',initAudio);
},{once:true});
```

3. **BGM選択ボタンに明示的な再生処理**:
```javascript
function selectBGM(bgmName){
  currentBGM=bgmName;
  bgmAudio.src=bgmUrls[bgmName];
  bgmAudio.play().catch(e=>{
    showMessage('BGMを再生するには画面をタップしてください');
  });
}
```

## 修正ファイル一覧
- `script.html` - BGM機能、スマホ対応、ボタンフィードバック
- `body.html` - BGMボタンスタイル統一

## デプロイ
```bash
cd c:\my-website\text-formatter-gas
clasp push
clasp deploy -i AKfycbxdoZQLIAYodBf3tLnIkD9yR-I1eAhBlj33zK9Oe7EV6uk3OYeAs4HOyFIidWhOtsHd -d "Add BGM feature with mobile support"
```

## 今後のBGM追加方法

### 簡単3ステップ
1. **音源準備**: MP3ファイルを `sounds\` フォルダに配置
2. **コード追加**: `bgmUrls`とボタンを追加
3. **デプロイ**: `clasp push` → `clasp deploy`

### 推奨音源形式
- **フォーマット**: MP3（互換性が高い）
- **ビットレート**: 128kbps（ファイルサイズと音質のバランス）
- **ループ対応**: シームレスにループする音源を推奨

## トラブルシューティング

**問題1: スマホでBGMが鳴らない**
- 原因: ブラウザの自動再生ポリシー
- 解決: 画面タップ後に再生開始

**問題2: BGM選択時に反応がわからない**
- 原因: 視覚的フィードバックがない
- 解決: ボタンの色変更 + "ON"表示

**問題3: BGMがループしない**
- 原因: `loop`属性が設定されていない
- 解決: `bgmAudio.loop=true;` で自動ループ

## プロジェクト情報
- **GASプロジェクトID**: `1SFbDg5JMmeMVFUFQW7t63EfHwRLugCcR_uokqYNQ2DpVspbQE6QGneji`
- **デプロイID**: `AKfycbxdoZQLIAYodBf3tLnIkD9yR-I1eAhBlj33zK9Oe7EV6uk3OYeAs4HOyFIidWhOtsHd`
- **エンドポイント**: `https://script.google.com/macros/s/AKfycbxdoZQLIAYodBf3tLnIkD9yR-I1eAhBlj33zK9Oe7EV6uk3OYeAs4HOyFIidWhOtsHd/exec`
- **場所**: `c:\my-website\text-formatter-gas\`

---

**最終更新**: 2025年1月11日
**プロジェクト**: AI筋トレRPG - BGM機能追加・スマホ対応
