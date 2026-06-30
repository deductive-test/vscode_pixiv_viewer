#!/usr/bin/env bash
# npm / vsce を使わずに VSIX（拡張パッケージ）を生成するスクリプト。
# VSIX の実体は ZIP。zip コマンド（macOS/Linux）または Windows 同梱 tar.exe（bsdtar）で固める。
#
# 使い方:  bash build-vsix.sh
# 出力:    リポジトリ直下に <name>-<version>.vsix を生成する。
# 生成後:  code --install-extension <name>-<version>.vsix --force でインストール。

set -euo pipefail

# スクリプトのある場所＝リポジトリルート
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# package.json から publisher は固定 local、name と version を取り出す
NAME="$(grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]+"' package.json | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"
VERSION="$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' package.json | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"
PUBLISHER="local"
ENGINE="$(grep -oE '"vscode"[[:space:]]*:[[:space:]]*"[^"]+"' package.json | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"
DISPLAY="$(grep -oE '"displayName"[[:space:]]*:[[:space:]]*"[^"]+"' package.json | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"

VSIX="$ROOT/${NAME}-${VERSION}.vsix"
echo "パッケージ: ${PUBLISHER}.${NAME} v${VERSION}  (engine ${ENGINE})"

# 一時ステージング
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/extension"

# 実行に必要なファイルだけを extension/ にコピー
cp package.json "$STAGE/extension/"
cp -R src "$STAGE/extension/"
cp -R media "$STAGE/extension/"
[ -f README.md ] && cp README.md "$STAGE/extension/" || true

# VSIX マニフェスト
cat > "$STAGE/extension.vsixmanifest" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${NAME}" Version="${VERSION}" Publisher="${PUBLISHER}" />
    <DisplayName>${DISPLAY}</DisplayName>
    <Description xml:space="preserve">Pixivの特殊タグをプレビューする</Description>
    <Tags></Tags>
    <Categories>Other</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${ENGINE}" />
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
EOF

# [Content_Types].xml
cat > "$STAGE/[Content_Types].xml" <<'EOF'
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
EOF

# 既存 VSIX を消してから生成
rm -f "$VSIX"

# ZIP（=VSIX）を作る。エントリは ZIP ルート直下に置く必要がある。
if command -v zip >/dev/null 2>&1; then
  # macOS / Linux
  ( cd "$STAGE" && zip -r -q "$VSIX" extension.vsixmanifest "[Content_Types].xml" extension )
elif [ -x /c/Windows/System32/tar.exe ]; then
  # Windows 同梱 bsdtar（libarchive）。出力は .vsix だが拡張子では zip と判定されないため
  # --format zip を明示して ZIP 形式で固める。
  /c/Windows/System32/tar.exe --format zip -c -f "$VSIX" -C "$STAGE" extension.vsixmanifest "[Content_Types].xml" extension
else
  echo "ZIP を作成できる zip または bsdtar(tar.exe) が見つかりません。" >&2
  exit 1
fi

echo "生成しました: $VSIX"
echo "インストール: code --install-extension \"$VSIX\" --force"
