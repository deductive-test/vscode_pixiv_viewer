# npm / vsce を使わずに VSIX（拡張パッケージ）を生成する Windows 用スクリプト。
# build-vsix.sh の PowerShell 移植版。VSIX の実体は ZIP。
# Windows 同梱の tar.exe（bsdtar）で --format zip を指定して固める。
#
# 使い方:  powershell -ExecutionPolicy Bypass -File .\build-vsix.ps1
# 出力:    リポジトリ直下に <name>-<version>.vsix を生成する。
# 生成後:  code --install-extension <name>-<version>.vsix --force でインストール。

$ErrorActionPreference = 'Stop'

# スクリプトのある場所＝リポジトリルート
$Root = $PSScriptRoot
Set-Location $Root

# package.json から name / version / displayName / engine を取り出す（publisher は固定 local）
$pkg = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $Root 'package.json') | ConvertFrom-Json
$Name      = $pkg.name
$Version   = $pkg.version
$Publisher = 'local'
$Engine    = $pkg.engines.vscode
$Display   = $pkg.displayName

$Vsix = Join-Path $Root "$Name-$Version.vsix"
Write-Host "パッケージ: $Publisher.$Name v$Version  (engine $Engine)"

# 一時ステージング
$Stage = Join-Path $env:TEMP ("vsix_" + [guid]::NewGuid())
$ExtDir = Join-Path $Stage 'extension'
New-Item -ItemType Directory -Path $ExtDir -Force | Out-Null

try {
    # 実行に必要なファイルだけを extension/ にコピー
    Copy-Item -Path (Join-Path $Root 'package.json') -Destination $ExtDir
    Copy-Item -Path (Join-Path $Root 'src')   -Destination $ExtDir -Recurse
    Copy-Item -Path (Join-Path $Root 'media') -Destination $ExtDir -Recurse
    $Readme = Join-Path $Root 'README.md'
    if (Test-Path $Readme) { Copy-Item -Path $Readme -Destination $ExtDir }

    # VSIX マニフェスト
    $Manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$Name" Version="$Version" Publisher="$Publisher" />
    <DisplayName>$Display</DisplayName>
    <Description xml:space="preserve">Pixivの特殊タグをプレビューする</Description>
    <Tags></Tags>
    <Categories>Other</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="$Engine" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
  </Assets>
</PackageManifest>
"@

    # [Content_Types].xml
    $ContentTypes = @"
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="css" ContentType="text/css" />
  <Default Extension="md" ContentType="text/plain" />
  <Default Extension="txt" ContentType="text/plain" />
  <Default Extension="tsv" ContentType="text/plain" />
  <Default Extension="html" ContentType="text/html" />
  <Default Extension="vsixmanifest" ContentType="text/xml" />
</Types>
"@

    # BOM 無し UTF-8 で書き出す
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path $Stage 'extension.vsixmanifest'), $Manifest, $Utf8NoBom)
    [System.IO.File]::WriteAllText((Join-Path $Stage '[Content_Types].xml'), $ContentTypes, $Utf8NoBom)

    # 既存 VSIX を消してから生成
    if (Test-Path $Vsix) { Remove-Item -Force $Vsix }

    # ZIP（=VSIX）を作る。エントリは ZIP ルート直下に置く必要がある。
    # Windows 同梱 bsdtar（libarchive）。拡張子 .vsix では zip と判定されないため --format zip を明示。
    $Tar = Join-Path $env:WINDIR 'System32\tar.exe'
    if (-not (Test-Path $Tar)) {
        Write-Error "ZIP を作成できる tar.exe が見つかりません: $Tar"
        exit 1
    }
    & $Tar --format zip -c -f $Vsix -C $Stage 'extension.vsixmanifest' '[Content_Types].xml' 'extension'
    if ($LASTEXITCODE -ne 0) {
        Write-Error "tar.exe による VSIX 生成に失敗しました (exit $LASTEXITCODE)"
        exit 1
    }

    Write-Host "生成しました: $Vsix"
    # 素の code は GUI 本体(Code.exe)に化けて無反応のことがあるため、CLI 本体の code.cmd を案内する
    Write-Host "インストール: code.cmd --install-extension `"$Vsix`" --force"
}
finally {
    # ステージングを削除
    if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
}
