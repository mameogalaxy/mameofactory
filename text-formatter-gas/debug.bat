@echo off
echo AI筋トレRPG デバッグツール
echo ============================
echo.

if not exist node_modules (
    echo Puppeteerをインストール中...
    call npm install
    echo.
)

echo ブラウザを起動してデバッグを開始します...
echo 終了するにはCtrl+Cを押してください
echo.

node debug-capture.js

pause
