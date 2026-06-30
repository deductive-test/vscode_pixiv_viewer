# CLAUDE.md

このリポジトリで作業する際は、本ファイルの内容を最優先の制約として扱うこと。

---

## 0. 対話ルール

- このプロジェクトでのやり取りはすべて**日本語**で行う。
- 各ステップ完了時に `完了: <何をしたか>` を一行で報告する。
- 不明点や判断が割れる箇所は、推測で進めず **質問する**。

---

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| 何を作るか | VS Code 拡張機能。`.txt` ファイルを**独自タグ仕様に沿って**プレビュー表示する（Markdown プレビュー相当の体験） |
| 用途 | **完全に個人用**。Marketplace には公開しない |
| 対応環境 | **Windows / macOS で同一ソースが無改変で動作すること**（Linux も壊さない範囲で考慮） |
| 言語 | **素の JavaScript（CommonJS）**。npm サプライチェーン汚染を避けるため、ビルド工程を持たない方針に変更（旧: TypeScript）。型安全性は各ファイル冒頭の `// @ts-check` ＋ JSDoc ＋ `jsconfig.json` で担保する |

プレビューは「現在の txt を読む → 独自パーサでタグを解釈 → HTML を生成 → Webview に描画」という流れで実現する。Markdown プレビューの「横にプレビューを開く」と同じ体験を目指す。

---

## 2. アーキテクチャ（確定事項・変更時は要相談）

- **Webview パネル方式**を採用する（`vscode.window.createWebviewPanel`）。
	- `CustomTextEditorProvider` は使わない。通常の txt 編集と競合させたくないため。
- **パーサはコア機能から完全に分離した独立モジュール**にする。タグ仕様に依存しないインターフェースを切り、本体（コマンド登録・Webview 管理）はパーサの内部実装を知らない状態に保つ。
- ライブ更新は `vscode.workspace.onDidChangeTextDocument` を購読して行う（編集中に再描画）。

### ディレクトリ構成（この形を維持する）

```
src/
	extension.ts				# activate / コマンド登録 / ライフサイクルのみ
	preview/
		panel.ts					# Webview パネルの生成・更新・破棄、CSP、asWebviewUri
	parser/
		index.ts					# パーサのエントリ。公開 IF: parse(text: string): string (HTML)
		...							 # タグごとの変換ロジックはこの配下に閉じる
```

- パーサの公開インターフェースは `parse(rawText: string): string`（HTML 文字列を返す）を起点とする。シグネチャを変える場合は事前に相談すること。

---

## 3. タグ仕様 ⚠️ 未確定 — ここを最初に確定させる

記入予定の項目:

- タグの記法（例: `[tag]` / `<tag>` / 行頭記号 など）  
	tags.tsv を参照。
- 対応タグの一覧と、それぞれの HTML への変換結果  
	tags.tsv を参照。
- 入れ子の可否、未知タグの扱い、エスケープ規則  
	tags.tsv を参照。
- プレビュー側の見た目（CSS の方針）
	- preview_sample.txt - プレビュー元のtxt例
	- preview_sample.html - プレビューのイメージ

---

## 4. クロスプラットフォーム制約（厳守）

- **ネイティブモジュール（プラットフォーム別バイナリ）を一切導入しない。** これがクロスプラットフォーム性を壊す唯一の現実的要因。
- ファイルパスを扱う箇所では**区切り文字をハードコードしない**。必ず `path` モジュールを使う。
- **OS 固有のシェルコマンドや絶対パスをコードに書かない。**
- 改行コード差異は `.gitattributes`（`* text=auto eol=lf`）で吸収する前提とする。

---

## 5. 依存・ビルド・パッケージング

> **方針変更（npm 不使用）**: サプライチェーン汚染を避けるため、npm（`npm install` / `npx`）に依存しない構成とする。
> この拡張は**実行時に npm パッケージを一切必要としない**（`vscode` API は VS Code 本体が提供）。

- 依存は **vscode API と Node 標準モジュールのみ**とする。`node_modules` は作らない。
- **ビルド工程を持たない**。素の JavaScript を VS Code が直接実行する（`main` は `./src/extension.js`）。`tsc` / esbuild 等は使わない。
- 型定義 `@types/vscode` は npm から取得せず、**VS Code 本体同梱の `vscode.d.ts` を `types/` にコピー（vendoring）**して使う（出所: `<VS Code>/resources/app/out/vscode-dts/vscode.d.ts`、MIT）。`jsconfig.json` で型解決する。
- 型チェックは VS Code の組み込み TypeScript サービス（`// @ts-check` ＋ `jsconfig.json`）で行う。CI 的な一括チェックが要る場合のみ、VS Code 同梱のコンパイラ API（`typescript.js`）を使う（npm 非経由）。
- **ローカルインストールは `.vsix`（vsce）を使わず**、拡張フォルダ一式を `~/.vscode/extensions/<publisher>.<name>-<version>/` へコピーして行う。
- `package.json` の `publisher` はローカル用途のため任意文字列（例: `local`）で良い。アカウント登録は不要。

想定操作:

| 目的 | 手段 |
|------|------|
| 動作確認 | F5（Extension Development Host） |
| 型チェック | VS Code 上で `// @ts-check` ＋ `jsconfig.json`（「問題」パネルで確認） |
| 常用インストール | 拡張フォルダを `~/.vscode/extensions/` へコピーして VS Code 再起動 |

---

## 6. プライバシー / Git（個人情報を GitHub に上げない）

`.gitignore` だけでは防げない経路があるため、以下をルール化する。

- **コード・ログ・コミット内容に、OS アカウント名 / PC 名 / ローカル絶対パスを残さない。**
- ビルド成果物（`out/` `dist/` `*.tsbuildinfo` `*.vsix`）と各種ログ（`*.log` 等）、`node_modules/`、`.vscode-test/`、`.DS_Store` / `Thumbs.db`、`.npmrc` / `.env*` は `.gitignore` で除外する（絶対パスやトークンの主な漏洩経路のため）。
- `package-lock.json` は**コミットする**（中身はレジストリ URL と整合性ハッシュのみ。再現性のため残す）。
- `package.json` の `author` / `repository.url` / `publisher` に実名・個人パスが入らないよう、コミット前に確認する。
- **最初のコミット前に** リポジトリ単位で Git の作成者情報を上書きする（履歴に実名・実メールを焼き込まない）:
	```
	git config user.name	"<表示名>"
	git config user.email "<GitHubのnoreplyアドレス>"
	```

### Stop & Ask（Git 関連で必ず人間に確認する操作）
- `git push`、`git config --global` の変更、`.gitignore` / `.gitattributes` の削除や大幅変更。

---

## 7. Claude Code への作業ルール（最重要）

- **依頼されたことだけを行う。** 余計なファイル・抽象化・機能・リファクタを追加しない。
- 変更スコープは原則 **`src/` 配下**に限定する。設定ファイルやプロジェクト構成を触る場合は事前に相談。
- 一度に作り込まない。下記「開発フロー」に従い、**1 段階ずつ**進めて都度報告する。

### Stop & Ask（実行前に必ず確認を取る操作）
以下は黙って実行せず、必ず一度立ち止まって確認する:
- npm / pip などでの**依存パッケージの追加**
- **ファイルの削除**
- `package.json` の構造変更、`tsconfig` / `.vscode/*` の変更
- `git push` その他リモートへ影響する操作

---

## 8. 開発フロー（この順で進める）

1. `yo code`（または手動）で TypeScript 拡張の雛形を作成し、F5 で空の拡張が起動することを確認する。
2. パーサの公開インターフェース `parse(text): string` を定義し、仮の 1 タグだけ変換できる最小実装を置く。
3. プレビュー用コマンドを登録し、Webview パネルを横に開いて `parse()` の結果を描画する（CSP・`asWebviewUri` を適切に設定）。
4. `onDidChangeTextDocument` を購読し、編集中のライブ更新を有効にする。
5. **正式なタグ仕様（第 3 節）が確定したら**、パーサ本体を実装する。
6. `.gitignore` / `.gitattributes` / Git 作成者情報・`package.json` のプライバシー確認を済ませてから初回コミットする。
7. `npx @vscode/vsce package` で `.vsix` を生成し、ローカルインストールで最終動作を確認する。

各段階の完了時に `完了: <内容>` を報告し、次へ進む前に簡単な動作確認結果を添えること。
