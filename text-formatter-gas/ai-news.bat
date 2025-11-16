@echo off
chcp 65001 >nul
echo ========================================
echo 最新AI記事スクレイパー
echo ========================================
echo.

if not exist node_modules (
    echo 📦 依存関係をインストール中...
    call npm install
    echo.
)

echo 🔍 AI記事を収集中...
echo.

node ai-news-scraper.js

echo.
echo ✅ 完了！AI-NEWS-SUMMARY.md を確認してください
echo.
pause
