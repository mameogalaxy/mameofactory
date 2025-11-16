@echo off
chcp 65001 >nul
echo AI超解像度ツール (waifu2x-ncnn)
echo ================================
echo.

if not exist waifu2x-ncnn-vulkan (
    echo waifu2x-ncnn-vulkanをダウンロードしています...
    echo https://github.com/nihui/waifu2x-ncnn-vulkan/releases
    echo.
    echo 上記URLから最新版をダウンロードして解凍してください
    pause
    exit /b
)

if not exist images\original mkdir images\original
if not exist images\ai-upscaled mkdir images\ai-upscaled

echo 元画像をimages\originalフォルダに入れてください
pause

for %%f in (images\original\*.png images\original\*.jpg) do (
    echo AI処理中: %%~nxf
    waifu2x-ncnn-vulkan\waifu2x-ncnn-vulkan.exe -i "%%f" -o "images\ai-upscaled\%%~nxf" -n 2 -s 4
)

echo.
echo 完了！images\ai-upscaledフォルダを確認してください
pause
