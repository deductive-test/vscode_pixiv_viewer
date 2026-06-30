# TXT Tag Preview

独自タグ仕様で書いた `.txt` ファイルを、VS Code で**プレビュー表示**するローカル専用の拡張機能です。
Markdown プレビューの「横にプレビューを開く」と同じ感覚で使えます。

- **npm 不要・コンパイル不要**：素の JavaScript で動くため、`npm install` も `F5`（デバッグ実行）も必要ありません。
- **インストールは一度だけ**：VSIX を作って一度インストールすれば、以後 VS Code を開くだけでいつでもプレビューを使えます。

---

## インストール手順

> 現在の VS Code は、拡張を「フォルダにコピーするだけ」では読み込みません
> （台帳 `extensions.json` に登録された拡張のみ有効になり、手置きフォルダは起動時に除外されます）。
> そのため **VSIX を作って `code --install-extension` で正規インストール**します。
> VSIX の中身は ZIP を固めるだけなので、**npm も vsce も不要**です。

### 1. このリポジトリをダウンロードする

ZIP でダウンロードして展開するか、`git clone` で取得します。`package.json` がある階層がルートです。

### 2. VSIX を作る

リポジトリのルートで付属スクリプトを実行します（`zip`〈macOS/Linux〉または Windows 同梱の `tar.exe` を自動で使います）。

```bash
bash build-vsix.sh
```

ルートに `pixiv_text_preview-<バージョン>.vsix` が生成されます（スクリプトが実際のパスを表示します）。

### 3. インストールする

`code` コマンド（VS Code の CLI）でインストールします（`<バージョン>` は生成されたファイル名に合わせる）。

```bash
code --install-extension pixiv_text_preview-<バージョン>.vsix --force
```

- **Windows**: `code` は VS Code に同梱され、通常はそのまま使えます。
- **macOS**: `code` が無い場合はコマンドパレットで «Shell Command: Install 'code' command in PATH» を一度実行してください。

### 4. ウィンドウを再読み込みする

コマンドパレットで «Developer: Reload Window»（または VS Code を再起動）すると有効になります。以後この操作は不要です。

> 正規インストールされると、拡張は `~/.vscode/extensions/local.pixiv_text_preview-<バージョン>` に展開されます
> （`local.` は publisher 名で、VS Code の仕様により付きます）。
>
> 同じバージョンを上書きすると VS Code が変更を認識しないことがあるため、**コードを変えたら `package.json` の `version` を上げてから**作り直すと確実です。

### コードを更新したときは

ソースを変更したら、再度 `bash build-vsix.sh` → `code --install-extension … --force` を実行して上書きインストールしてください。

---

## 使い方

1. 任意の `.txt` ファイルを VS Code で開きます。
2. 次のいずれかでプレビューを開きます。
   - エディタ右上の **「PV」** ボタン（`.txt` を開くと表示されます）をクリック
   - **コマンドパレット**（`Ctrl+Shift+P` / macOS は `Cmd+Shift+P`）で
     **「pixiv text preview」** を実行
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

`code` コマンドでアンインストールし、ウィンドウを再読み込みするだけです。

```bash
code --uninstall-extension local.pixiv_text_preview
```

---

## 補足

- この拡張は**実行時に外部パッケージを一切使いません**（VS Code 標準の API のみ）。`node_modules` が無くても動作します。
- `types/`・`jsconfig.json` は開発時の型チェック用です。利用するだけなら無くても動きますが、コピーしたまま残しても問題ありません。
- Windows / macOS で同一ソースのまま動作します。
