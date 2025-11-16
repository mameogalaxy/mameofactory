# AI筋トレRPG - 開発ドキュメント

## プロジェクト概要
カメラでスクワット動作を検知し、敵を倒していくRPGゲーム

## 開発履歴

### 2025-11-09
- ステージ表示の色を紫から金色に変更
- 敵モンスターを10体から50体に拡張（ステージ1-50対応）
- 敵の出現順序をランダムから順番に変更
- 初期表示バグを修正（ステージ1で必ずスライムが表示されるように）
- トララレロ（レアモンスター）を追加
  - 画像解像度4倍アップ処理
  - GitHubへのアップロード
  - ガチャ排出率調整（レア15%、ノーマル25%、はずれ60%）

## モンスター追加手順

### 1. 画像の準備
1. モンスター画像を `C:\my-website\text-formatter-gas\images\original\` に保存
   - ファイル名: `モンスターID.png`（例: `tororarero.png`）
   - スペースを含まないファイル名にする

### 2. 解像度アップ
```bash
cd C:\my-website\text-formatter-gas\images
powershell -Command "Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile((Resolve-Path 'original\モンスターID.png').Path); $newWidth = $img.Width * 4; $newHeight = $img.Height * 4; $newImg = New-Object System.Drawing.Bitmap($newWidth, $newHeight); $graphics = [System.Drawing.Graphics]::FromImage($newImg); $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.DrawImage($img, 0, 0, $newWidth, $newHeight); $newImg.Save((Resolve-Path 'upscaled').Path + '\モンスターID.png', [System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $newImg.Dispose(); $img.Dispose(); Write-Host 'Complete'"
```

### 3. GitHubにアップロード
```bash
cd C:\my-website\text-formatter-gas
git add images/upscaled/モンスターID.png
git commit -m "Add モンスター名 monster image"
git push origin master
```

### 4. コードに追加
`script.html` の `monsterTypes` 配列に追加：
```javascript
{id:'モンスターID',name:'モンスター名',color:'#カラーコード',rarity:'rare',image:'https://raw.githubusercontent.com/mameogalaxy/mameofactory/master/text-formatter-gas/images/upscaled/モンスターID.png'}
```

### 5. 描画関数を追加（画像がある場合）
`drawMonster` 関数内に追加：
```javascript
}else if(monsterId==='モンスターID'&&imageCache['モンスターID']){
  const imgSize=size*3;
  ctx.drawImage(imageCache['モンスターID'],-imgSize/2,-imgSize/2,imgSize,imgSize);
```

### 6. デプロイ
```bash
clasp push
clasp deploy -i AKfycbxdoZQLIAYodBf3tLnIkD9yR-I1eAhBlj33zK9Oe7EV6uk3OYeAs4HOyFIidWhOtsHd -d "Add モンスター名"
```

## 現在のモンスター一覧
- スライム (normal) - https://raw.githubusercontent.com/mameogalaxy/mameofactory/master/text-formatter-gas/images/upscaled/slime.png
- ゴブリン (normal) - Canvas描画
- パンプキング (normal) - https://raw.githubusercontent.com/mameogalaxy/mameofactory/master/text-formatter-gas/images/upscaled/panking.png
- ウルフ (normal) - Canvas描画
- トララレロ (rare) - https://raw.githubusercontent.com/mameogalaxy/mameofactory/master/text-formatter-gas/images/upscaled/tororarero.png
- ドラゴン (rare) - Canvas描画
- フェニックス (rare) - Canvas描画

## ガチャ排出率
- レアモンスター: 15%
- ノーマルモンスター: 25%
- はずれ: 60%

## デプロイURL
https://script.google.com/macros/s/AKfycbxdoZQLIAYodBf3tLnIkD9yR-I1eAhBlj33zK9Oe7EV6uk3OYeAs4HOyFIidWhOtsHd/exec
