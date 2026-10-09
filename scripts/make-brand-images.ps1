# Builds the site logo and app icons from brand/keystone-logo.png (Windows PowerShell).
# Run from the project folder:  powershell -ExecutionPolicy Bypass -File scripts/make-brand-images.ps1
#
# Writes:
#   public/logo.jpg                 - full logo, cropped tight, 1000px wide
#   public/icons/icon-512.png       - keystone mark on tan (also used as the maskable icon)
#   public/icons/icon-192.png
#   public/icons/apple-touch-icon.png (180px)
#   public/icons/favicon-48.png

Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Bitmap]::new((Join-Path $root 'brand/keystone-logo.png'))

# Crop boxes in the source image (measured from brand/keystone-logo.png; update if the logo changes).
$logoBox = [System.Drawing.Rectangle]::new(258, 286, 1366, 264)   # whole logo plus a 20px margin
$markBox = [System.Drawing.Rectangle]::new(278, 306, 243, 225)    # keystone + book only
$tan = [System.Drawing.Color]::FromArgb(0xF5, 0xEF, 0xE4)

function Save-Resized($box, $width, $height, $path, $background, $scale) {
  $out = [System.Drawing.Bitmap]::new($width, $height)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear($background)
  # Fit the crop inside (width x height) * scale, centered.
  $fit = [Math]::Min($width * $scale / $box.Width, $height * $scale / $box.Height)
  $w = [int]($box.Width * $fit); $h = [int]($box.Height * $fit)
  $dest = [System.Drawing.Rectangle]::new([int](($width - $w) / 2), [int](($height - $h) / 2), $w, $h)
  $g.DrawImage($source, $dest, $box, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  if ($path.EndsWith('.jpg')) {
    # JPEG keeps the logo small; the background is solid tan, so no transparency is needed.
    $jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $params.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]90)
    $out.Save((Join-Path $root $path), $jpeg, $params)
  } else {
    $out.Save((Join-Path $root $path), [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $out.Dispose()
  Write-Host "Wrote $path"
}

$logoHeight = [int](1000 * $logoBox.Height / $logoBox.Width)
Save-Resized $logoBox 1000 $logoHeight 'public/logo.jpg' $tan 1.0

# Icons: mark fills 62% of the square, leaving room for rounded/masked icon shapes.
Save-Resized $markBox 512 512 'public/icons/icon-512.png' $tan 0.62
Save-Resized $markBox 192 192 'public/icons/icon-192.png' $tan 0.62
Save-Resized $markBox 180 180 'public/icons/apple-touch-icon.png' $tan 0.62
Save-Resized $markBox 48 48 'public/icons/favicon-48.png' $tan 0.80

$source.Dispose()
