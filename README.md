# TXT Tag Preview

独自タグ仕様で書いた `.txt` ファイルを、VS Code で**プレビュー表示**するローカル専用の拡張機能です。
Markdown プレビューの「横にプレビューを開く」と同じ感覚で使えます。

- **npm 不要・ビルド不要**：素の JavaScript で動くため、`npm install` も `F5`（デバッグ実行）も必要ありません。
- **インストールは一度だけ**：拡張フォルダへ置けば、以後 VS Code を開くだけでいつでもプレビューを使えます。

---

## インストール手順（これだけ）

VS Code には「拡張フォルダに置いたものを起動時に読み込む」仕組みがあります。
このリポジトリ一式を、その拡張フォルダへ **`local.txt-tag-preview-0.0.1` という名前でコピー**するだけです。

### 1. このリポジトリをダウンロードする

ZIP でダウンロードして展開するか、`git clone` で取得します。展開後のフォルダ（`package.json` がある階層）が対象です。

### 2. 拡張フォルダへコピーする

拡張フォルダの場所は OS で異なります。

| OS | 拡張フォルダ |
|----|--------------|
| Windows | `%USERPROFILE%\.vscode\extensions\` |
| macOS / Linux | `~/.vscode/extensions/` |

コピー先のフォルダ名は **`local.txt-tag-preview-0.0.1`** にしてください（`publisher.name-version` の規約）。

**Windows（PowerShell）**　`<このリポジトリのパス>` は展開先に置き換えてください。

```powershell
$src  = "<このリポジトリのパス>"
$dest = "$env:USERPROFILE\.vscode\extensions\local.txt-tag-preview-0.0.1"
Copy-Item -Recurse -Force $src $dest
```

**macOS / Linux（ターミナル）**

```bash
cp -R "<このリポジトリのパス>" ~/.vscode/extensions/local.txt-tag-preview-0.0.1
```

> 手動でコピーしても構いません。要は「拡張フォルダの中に `local.txt-tag-preview-0.0.1` フォルダがあり、その直下に `package.json` がある」状態にできれば OK です。

### 3. VS Code を再起動する

一度すべてのウィンドウを閉じて開き直すと、拡張が読み込まれます。以後はこの操作は不要です。

---

## 使い方

1. 任意の `.txt` ファイルを VS Code で開きます。
2. 次のいずれかでプレビューを開きます。
   - **エディタ右上のアイコン**（`.txt` を開くと表示されます）をクリック
   - **コマンドパレット**（`Ctrl+Shift+P` / macOS は `Cmd+Shift+P`）で
     **「TXT Tag Preview: プレビューを横に開く」** を実行
3. エディタの**横にプレビュー**が開きます。
4. テキストを編集すると、**保存しなくてもリアルタイムでプレビューが更新**されます。

---

## 対応タグ

| 記法 | 意味 |
|------|------|
| `[chapter:章タイトル]`（単独行） | 章見出し |
| `[newpage]`（単独行） | ページ区切り（区切り線で表示） |
| 空行 | 段落の区切り |
| `[[rb:漢字>ふりがな]]` | ルビ |
| `[b:太字]` | 太字 |
| `[i:斜体]` | 斜体 |
| `[[emphasismark:本文>﹅]]` | 傍点（指定した記号が付く） |

記法の詳細は [tags.tsv](tags.tsv)、入力と表示の対応例は [preview_sample.txt](preview_sample.txt) / [preview_sample.html](preview_sample.html) を参照してください。

---

## アンインストール

拡張フォルダから `local.txt-tag-preview-0.0.1` フォルダを削除し、VS Code を再起動するだけです。

```powershell
# Windows
Remove-Item -Recurse -Force "$env:USERPROFILE\.vscode\extensions\local.txt-tag-preview-0.0.1"
```

```bash
# macOS / Linux
rm -rf ~/.vscode/extensions/local.txt-tag-preview-0.0.1
```

---

## 補足

- この拡張は**実行時に外部パッケージを一切使いません**（VS Code 標準の API のみ）。`node_modules` が無くても動作します。
- `types/`・`jsconfig.json` は開発時の型チェック用です。利用するだけなら無くても動きますが、コピーしたまま残しても問題ありません。
- Windows / macOS で同一ソースのまま動作します。
