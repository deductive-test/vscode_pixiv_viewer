// @ts-check
// Webview パネルの生成・更新・破棄を担うモジュール。
// パーサの内部実装には依存せず、parse() の結果（HTML 文字列）を描画するだけに保つ。

"use strict";

const vscode = require("vscode");
const { parse, escapeHtml } = require("../parser");

/**
 * document の URI からファイル名（basename）を取得する。
 * Uri.path は OS に依らず "/" 区切りのため、node の path モジュールは使わない。
 * @param {vscode.TextDocument} document
 * @returns {string}
 */
function basenameOf(document) {
  const segments = document.uri.path.split("/");
  return segments[segments.length - 1] || document.uri.path;
}

/**
 * txt プレビュー用の Webview パネルを管理するクラス。
 * 1 つのプレビューパネルを使い回し、対象ドキュメントの変更に追従する。
 */
class PreviewPanel {
  /**
   * @param {vscode.Uri} extensionUri
   * @param {vscode.TextDocument} document
   */
  constructor(extensionUri, document) {
    /** @type {vscode.Uri} */
    this.extensionUri = extensionUri;
    /** @type {vscode.Uri} */
    this.targetUri = document.uri;
    /** @type {vscode.Disposable[]} */
    this.disposables = [];
    /** @type {(() => void) | undefined} */
    this.onDisposeCallback = undefined;

    this.panel = vscode.window.createWebviewPanel(
      "txtTagPreview",
      this.buildTitle(document),
      vscode.ViewColumn.Beside,
      {
        enableScripts: false,
        // media/ 配下のみリソース読み込みを許可する
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
        retainContextWhenHidden: true,
      }
    );

    // パネルが閉じられたら後始末する
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.render(document);
  }

  /**
   * このパネルが対象としているドキュメントの URI。
   * @returns {vscode.Uri}
   */
  get documentUri() {
    return this.targetUri;
  }

  /**
   * 破棄時に呼ばれるコールバックを登録する。
   * @param {() => void} callback
   */
  onDidDispose(callback) {
    this.onDisposeCallback = callback;
  }

  /** パネルを最前面に表示する。 */
  reveal() {
    this.panel.reveal(vscode.ViewColumn.Beside, true);
  }

  /**
   * 表示対象を別のドキュメントへ切り替える。
   * @param {vscode.TextDocument} document
   */
  switchTo(document) {
    this.targetUri = document.uri;
    this.panel.title = this.buildTitle(document);
    this.render(document);
  }

  /**
   * ドキュメント内容を解釈して Webview に再描画する。
   * @param {vscode.TextDocument} document
   */
  render(document) {
    const bodyHtml = parse(document.getText());
    this.panel.webview.html = this.buildHtml(bodyHtml, document);
  }

  /** パネルとリソースを破棄する。 */
  dispose() {
    if (this.onDisposeCallback) {
      this.onDisposeCallback();
    }
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  /**
   * @param {vscode.TextDocument} document
   * @returns {string}
   */
  buildTitle(document) {
    return `プレビュー: ${basenameOf(document)}`;
  }

  /**
   * Webview に流し込む完全な HTML を組み立てる。CSP と asWebviewUri を設定する。
   * @param {string} bodyHtml
   * @param {vscode.TextDocument} document
   * @returns {string}
   */
  buildHtml(bodyHtml, document) {
    const webview = this.panel.webview;
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "preview.css")
    );

    // CSP: スクリプトは使わず、スタイルのみ許可（傍点でインライン style 属性を使うため 'unsafe-inline'）
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `img-src ${webview.cspSource} https: data:`,
      `font-src ${webview.cspSource}`,
    ].join("; ");

    const title = escapeHtml(basenameOf(document));

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${cssUri}">
  <title>${title}</title>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  }
}

module.exports = { PreviewPanel };
