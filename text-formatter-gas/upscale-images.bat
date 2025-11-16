@echo off
chcp 65001 >nul
echo 画像解像度アップツール
echo ========================
echo.

if not exist images mkdir images
if not exist images\original mkdir images\original
if not exist images\upscaled mkdir images\upscaled

echo 元画像をimages\originalフォルダに入れてください
echo.
pause

for %%f in (images\original\*.png images\original\*.jpg) do (
    echo 処理中: %%~nxf
    magick "%%f" -resize 400%% -filter Lanczos -unsharp 0x1 "images\upscaled\%%~nxf"
)

echo.
echo 完了！images\upscaledフォルダを確認してください
pause
