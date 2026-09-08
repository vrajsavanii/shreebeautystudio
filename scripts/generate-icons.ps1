Add-Type -AssemblyName System.Drawing

$srcFile = Resolve-Path "public\only-logo.jpg"
$src = [System.Drawing.Bitmap]::FromFile($srcFile)

function Resize-Bitmap($source, $width, $height, $destPath) {
    $dest = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($dest)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($source, 0, 0, $width, $height)
    $graphics.Dispose()
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
}

Resize-Bitmap $src 192 192 "public\icon-192.png"
Resize-Bitmap $src 512 512 "public\icon-512.png"
Resize-Bitmap $src 180 180 "public\apple-touch-icon.png"

$dirs = @(
    @{ Path = "android\app\src\main\res\mipmap-mdpi"; Size = 48 },
    @{ Path = "android\app\src\main\res\mipmap-hdpi"; Size = 72 },
    @{ Path = "android\app\src\main\res\mipmap-xhdpi"; Size = 96 },
    @{ Path = "android\app\src\main\res\mipmap-xxhdpi"; Size = 144 },
    @{ Path = "android\app\src\main\res\mipmap-xxxhdpi"; Size = 192 }
)

foreach ($item in $dirs) {
    $dir = $item.Path
    $s = $item.Size
    Resize-Bitmap $src $s $s "$dir\ic_launcher.png"
    Resize-Bitmap $src $s $s "$dir\ic_launcher_round.png"
    Resize-Bitmap $src $s $s "$dir\ic_launcher_foreground.png"
}

$src.Dispose()
Write-Host "Success: generated salon logo icons across public and android mipmaps"
