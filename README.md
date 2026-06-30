# pixiv text preview

独自タグ仕様で書いた `.txt` ファイルを、VS Code の横に**プレビュー表示**するローカル専用の拡張機能です。
Markdown プレビューの「横にプレビューを開く」と同じ感覚で使えます。

- **npm 不要・コンパイル不要**：素の JavaScript で動くため、`npm install` も `F5`（デバッグ実行）も必要ありません。
- **外部通信なし**：VS Code 標準の API だけで動作し、`node_modules` も不要です。
- **Windows / macOS 共通**：同一ソースのまま動作します。

---

## 動作要件

- VS Code 1.85 以降（動作確認は 1.115）。
- VSIX（=ZIP）を作るためのコマンド。**追加インストールは不要**です。
  - macOS / Linux: `zip`（標準で同梱）
  - Windows: 同梱の `tar.exe`（`C:\Windows\System32\tar.exe`）

---

## インストール手順

> 現在の VS Code は、拡張を「フォルダにコピーするだけ」では読み込みません
> （台帳 `extensions.json` に登録された拡張のみ有効になり、手置きフォルダは起動時に除外されます）。
> そのため **VSIX を作って `code --install-extension` で正規インストール**します。
> VSIX の中身は ZIP を固めるだけなので、**npm も vsce も不要**です。

### 1. このリポジトリを取得する

ZIP でダウンロードして展開するか、`git clone` で取得します。`package.json` がある階層がルートです。

### 2. VSIX を作る

リポジトリのルートで付属スクリプトを実行します（OS に応じて `zip` か `tar.exe` を自動で使います）。

```bash
bash build-vsix.sh
```

ルートに `pixiv_text_preview-<バージョン>.vsix` が生成されます（実際のファイル名はスクリプトが表示します）。

### 3. インストールする

`code` コマンド（VS Code の CLI）でインストールします（`<バージョン>` は生成されたファイル名に合わせる）。

```bash
code --install-extension pixiv_text_preview-<バージョン>.vsix --force
```

- **Windows**: `code` は VS Code に同梱され、通常はそのまま使えます。
- **macOS**: `code` が無い場合はVSCodeのCmd+Shift+Pでコマンドパレットを開き «Shell Command: Install 'code' command in PATH» を一度実行してください。

### 4. 反映する

コマンドパレット（`Ctrl+Shift+P` / macOS は `Cmd+Shift+P`）で «Developer: Reload Window» を実行します。
**新規インストールはこれで有効**になります。以後は VS Code を開くだけで使えます。

> 展開先は `~/.vscode/extensions/local.pixiv_text_preview-<バージョン>` です
> （`local.` は publisher 名で、VS Code の仕様により付きます）。

---

## 使い方

1. 任意の `.txt` ファイルを VS Code で開きます。
2. 次のいずれかでプレビューを開きます。
   - エディタ右上の **「PV」** ボタン（`.txt` を開くと表示されます。マウスを乗せると「pixiv text preview を開く」と出ます）をクリック
   - **コマンドパレット**（`Ctrl+Shift+P` / macOS は `Cmd+Shift+P`）で **「pixiv text preview」** を実行
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

## 更新（コードを変えたとき）

**同じバージョンのまま上書きすると、VS Code が変更を認識しない**ことがあります（コマンド名・ボタン名などの変更が反映されない）。
確実に反映するには、次の順で行ってください。

1. `package.json` の `version` を上げる（例: `0.0.2` → `0.0.3`）。
2. `bash build-vsix.sh` で VSIX を作り直す。
3. `code --install-extension pixiv_text_preview-<新バージョン>.vsix --force` でインストール。
4. **VS Code を完全に終了して再起動する**。
   - コマンド名・ボタン・メニューなどの「貢献情報」の変更は «Developer: Reload Window» では反映されず、
     完全再起動での再スキャンが必要です（コードの中身だけの変更なら Reload Window でも反映されます）。

---

## アンインストール

`code` コマンドでアンインストールし、ウィンドウを再読み込み（または再起動）します。

```bash
code --uninstall-extension local.pixiv_text_preview
```

---

## 補足

- この拡張は**実行時に外部パッケージを一切使いません**（VS Code 標準の API のみ）。`node_modules` が無くても動作します。
- `types/`・`jsconfig.json` は開発時の型チェック用です。利用するだけなら無くても動きます。
- Windows / macOS で同一ソースのまま動作します。
