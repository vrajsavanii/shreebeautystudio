Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\only-logo.jpg"
$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $srcPath))
Write-Host "Source image dimensions: $($src.Width) x $($src.Height)"

# The circle in only-logo.jpg is centered horizontally
$cropDim = [Math]::Min($src.Width, $src.Height)
$cropX = [int](($src.Width - $cropDim) / 2)
$cropY = [int](($src.Height - $cropDim) / 2)

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropDim, $cropDim)
$squareSrc = $src.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

function Generate-Icon([System.Drawing.Bitmap]$source, [int]$size, [string]$destRelativePath) {
    $destPath = Join-Path $PSScriptRoot "..\$destRelativePath"
    $dest = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($dest)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    # Fill white circular base for great contrast in both dark/light browser tabs
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $graphics.FillEllipse($brush, 0, 0, $size, $size)
    $brush.Dispose()
    
    # Draw cropped square source directly into square
    $graphics.DrawImage($source, 0, 0, $size, $size)
    $graphics.Dispose()
    
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Host "Saved: $destRelativePath ($size x $size)"
}

Generate-Icon $squareSrc 16 "public\favicon-16x16.png"
Generate-Icon $squareSrc 32 "public\favicon-32x32.png"
Generate-Icon $squareSrc 48 "public\favicon-48x48.png"
Generate-Icon $squareSrc 180 "public\apple-touch-icon.png"
Generate-Icon $squareSrc 192 "public\icon-192.png"
Generate-Icon $squareSrc 512 "public\icon-512.png"
Generate-Icon $squareSrc 32 "public\favicon.png"
Generate-Icon $squareSrc 192 "app\icon.png"
Generate-Icon $squareSrc 180 "app\apple-icon.png"

# Generate .ico files
$bmp32Path = Join-Path $PSScriptRoot "..\public\favicon-32x32.png"
$bmp32 = [System.Drawing.Bitmap]::FromFile((Resolve-Path $bmp32Path))
$hIcon = $bmp32.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$icoPublic = Join-Path $PSScriptRoot "..\public\favicon.ico"
$fs1 = [System.IO.File]::Create($icoPublic)
$icon.Save($fs1)
$fs1.Close()

$icoApp = Join-Path $PSScriptRoot "..\app\favicon.ico"
$fs2 = [System.IO.File]::Create($icoApp)
$icon.Save($fs2)
$fs2.Close()

$bmp32.Dispose()
$squareSrc.Dispose()
$src.Dispose()
Write-Host "SUCCESS: Generated all favicon.ico, PNG icons, and app router icons perfectly circular!"
