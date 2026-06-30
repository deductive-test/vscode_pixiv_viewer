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
  // 「プレビューを横に開く」コマンド
  const openCommand = vscode.commands.registerCommand("txtTagPreview.openPreview", () => {
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
  });

  // 編集中のライブ更新: 対象ドキュメントが変わったら再描画する
  const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (!currentPanel) {
      return;
    }
    if (event.document.uri.toString() === currentPanel.documentUri.toString()) {
      currentPanel.render(event.document);
    }
  });

  context.subscriptions.push(openCommand, changeSubscription);
}

function deactivate() {
  if (currentPanel) {
    currentPanel.dispose();
    currentPanel = undefined;
  }
}

module.exports = { activate, deactivate };
