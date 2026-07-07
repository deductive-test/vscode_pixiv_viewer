// @ts-check
// 拡張機能のエントリポイント。activate / コマンド登録 / ライフサイクル管理のみを担う。
// プレビューの中身（パーサ・Webview 描画）は preview/parser 配下に委譲する。

"use strict";

const vscode = require("vscode");
const { PreviewPanel } = require("./preview/panel");

/** @type {PreviewPanel | undefined} 現在開いているプレビューパネル（単一管理） */
let currentPanel;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // プレビューを横に開く処理。コマンドパレット用とボタン用の 2 コマンドから共通で呼ぶ。
  const openPreview = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("プレビュー対象の .txt を開いてください。");
      return;
    }

    const document = editor.document;

    if (currentPanel) {
      // 既存パネルがあれば対象を切り替えて再利用する
      currentPanel.switchTo(document);
      currentPanel.reveal();
      return;
    }

    const panel = new PreviewPanel(context.extensionUri, document);
    panel.onDidDispose(() => {
      currentPanel = undefined;
    });
    currentPanel = panel;
  };

  // コマンドパレット用（title: "pixiv text preview"）とエディタ右上ボタン用（shortTitle: "PV"）。
  // 表示名だけ異なる 2 コマンドが同じ処理を呼ぶ。
  const openCommand = vscode.commands.registerCommand("pixivTextPreview.openPreview", openPreview);
  const openFromTitleCommand = vscode.commands.registerCommand(
    "pixivTextPreview.openPreviewFromTitle",
    openPreview
  );

  // 編集中のライブ更新: 対象ドキュメントが変わったら再描画する
  const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (!currentPanel) {
      return;
    }
    if (event.document.uri.toString() === currentPanel.documentUri.toString()) {
      currentPanel.render(event.document);
    }
  });

  // スクロール同期（片方向: エディタ → プレビュー）。
  // 対象ドキュメントを表示中のエディタがスクロールしたら、先頭表示行をプレビューへ伝える。
  const scrollSubscription = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
    if (!currentPanel) {
      return;
    }
    if (event.textEditor.document.uri.toString() !== currentPanel.documentUri.toString()) {
      return;
    }
    const ranges = event.visibleRanges;
    if (ranges.length === 0) {
      return;
    }
    currentPanel.revealLine(ranges[0].start.line);
  });

  context.subscriptions.push(
    openCommand,
    openFromTitleCommand,
    changeSubscription,
    scrollSubscription
  );
}

function deactivate() {
  if (currentPanel) {
    currentPanel.dispose();
    currentPanel = undefined;
  }
}

module.exports = { activate, deactivate };
