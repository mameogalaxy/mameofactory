# 画像解像度アップスクリプト（ImageMagick不要）
Add-Type -AssemblyName System.Drawing

$originalPath = "images\original"
$outputPath = "images\upscaled"

if (-not (Test-Path $originalPath)) {
    New-Item -ItemType Directory -Path $originalPath | Out-Null
}
if (-not (Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath | Out-Null
}

Write-Host "画像解像度アップツール" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

$images = Get-ChildItem -Path $originalPath -Include *.png,*.jpg,*.jpeg -Recurse

if ($images.Count -eq 0) {
    Write-Host "images\originalフォルダに画像を入れてください" -ForegroundColor Yellow
    pause
    exit
}

foreach ($img in $images) {
    Write-Host "処理中: $($img.Name)" -ForegroundColor Green
    
    $bitmap = [System.Drawing.Bitmap]::FromFile($img.FullName)
    $newWidth = $bitmap.Width * 4
    $newHeight = $bitmap.Height * 4
    
    $newBitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($newBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($bitmap, 0, 0, $newWidth, $newHeight)
    
    $outputFile = Join-Path $outputPath $img.Name
    $newBitmap.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $newBitmap.Dispose()
    $bitmap.Dispose()
    
    Write-Host "完了: $outputFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "すべて完了！" -ForegroundColor Cyan
pause
