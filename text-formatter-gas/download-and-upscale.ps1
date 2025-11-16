[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$urls = @{
    "slime.png" = "https://raw.githubusercontent.com/mameogalaxy/sukuwatto/main/Generated%20Image%20November%2008,%202025%20-%205_49PM.png"
    "panking.png" = "https://raw.githubusercontent.com/mameogalaxy/sukuwatto/main/Generated%20Image%20November%2008%2C%202025%20-%206_23PM.png"
}

$originalPath = "images\original"
$outputPath = "images\upscaled"

if (-not (Test-Path $originalPath)) { New-Item -ItemType Directory -Path $originalPath | Out-Null }
if (-not (Test-Path $outputPath)) { New-Item -ItemType Directory -Path $outputPath | Out-Null }

Write-Host "Download and Upscale Images"
Write-Host "==========================="
Write-Host ""

foreach ($file in $urls.Keys) {
    $url = $urls[$file]
    $downloadPath = Join-Path $originalPath $file
    
    Write-Host "Downloading: $file"
    try {
        Invoke-WebRequest -Uri $url -OutFile $downloadPath -UseBasicParsing
        Write-Host "OK Downloaded" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
        continue
    }
    
    Write-Host "Upscaling: $file (4x)"
    try {
        $bitmap = [System.Drawing.Bitmap]::FromFile($downloadPath)
        $originalSize = "$($bitmap.Width)x$($bitmap.Height)"
        
        $newWidth = $bitmap.Width * 4
        $newHeight = $bitmap.Height * 4
        
        $newBitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
        $graphics = [System.Drawing.Graphics]::FromImage($newBitmap)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($bitmap, 0, 0, $newWidth, $newHeight)
        
        $outputFile = Join-Path $outputPath $file
        $newBitmap.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $graphics.Dispose()
        $newBitmap.Dispose()
        $bitmap.Dispose()
        
        Write-Host "OK: $originalSize -> ${newWidth}x${newHeight}" -ForegroundColor Green
        Write-Host "Saved: $outputFile"
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "==========================="
Write-Host "Complete! Check images\upscaled folder"
Write-Host "==========================="
pause
