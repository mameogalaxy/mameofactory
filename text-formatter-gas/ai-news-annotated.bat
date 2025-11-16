@echo off
chcp 65001 >nul
echo ========================================
echo AI記事スクレイパー（注釈付き）
echo ========================================
echo.

if not exist node_modules\playwright (
    echo 📦 Playwrightをインストール中...
    call npm install
    call npx playwright install chromium
    echo.
)

echo 🔍 AI記事を収集中（赤線囲い・注釈付き）...
echo.

node ai-news-annotated.js

echo.
echo ✅ 完了！AI-NEWS-SUMMARY.md を確認
echo.
pause
