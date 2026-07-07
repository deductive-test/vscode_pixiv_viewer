// @ts-check
// Webview パネルの生成・更新・破棄を担うモジュール。
// パーサの内部実装には依存せず、parse() の結果（HTML 文字列）を描画するだけに保つ。

"use strict";

const vscode = require("vscode");
const crypto = require("crypto");
const { parse, escapeHtml } = require("../parser");

/**
 * CSP 用の一度きりのランダム nonce を生成する。
 * @returns {string}
 */
function makeNonce() {
  return crypto.randomBytes(16).toString("base64");
}

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
      "pixivTextPreview",
      this.buildTitle(document),
      vscode.ViewColumn.Beside,
      {
        // スクロール同期用に最小限のスクリプトを動かすため有効化する
        enableScripts: true,
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
   * プレビューを指定した元テキスト行が先頭に来るようスクロールさせる（片方向同期）。
   * @param {number} line エディタの先頭表示行（0 始まり）
   */
  revealLine(line) {
    // 破棄後の post を避ける。失敗しても致命的ではないので握りつぶす。
    void this.panel.webview.postMessage({ type: "scrollToLine", line });
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
    const nonce = makeNonce();

    // CSP: スクロール同期用スクリプトのみ nonce で許可し、スタイルは従来どおり
    //（傍点でインライン style 属性を使うため 'unsafe-inline'）
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `img-src ${webview.cspSource} https: data:`,
      `font-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
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
${this.buildSyncScript(nonce)}
</body>
</html>`;
  }

  /**
   * エディタ → プレビューのスクロール同期を行うスクリプトを組み立てる。
   * data-line 属性を持つブロック要素の位置を手がかりに、
   * 指定行が先頭に来るようスクロール位置を線形補間して求める。
   * @param {string} nonce
   * @returns {string}
   */
  buildSyncScript(nonce) {
    return `<script nonce="${nonce}">
(function () {
  "use strict";

  // data-line を持つ要素を { line, el } の配列にして行番号順に返す
  function collectAnchors() {
    var nodes = document.querySelectorAll("[data-line]");
    var anchors = [];
    for (var i = 0; i < nodes.length; i++) {
      var line = parseInt(nodes[i].getAttribute("data-line"), 10);
      if (!isNaN(line)) {
        anchors.push({ line: line, el: nodes[i] });
      }
    }
    anchors.sort(function (a, b) { return a.line - b.line; });
    return anchors;
  }

  // 要素のドキュメント先頭からの縦位置
  function topOf(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  // targetLine が先頭に来るようスクロールする（前後アンカー間を線形補間）
  function scrollToLine(targetLine) {
    var anchors = collectAnchors();
    if (anchors.length === 0) {
      return;
    }

    var prev = anchors[0];
    var next = null;
    for (var i = 0; i < anchors.length; i++) {
      if (anchors[i].line <= targetLine) {
        prev = anchors[i];
        next = anchors[i + 1] || null;
      } else {
        next = anchors[i];
        break;
      }
    }

    var y = topOf(prev.el);
    if (next && next.line > prev.line) {
      var ratio = (targetLine - prev.line) / (next.line - prev.line);
      if (ratio < 0) { ratio = 0; }
      if (ratio > 1) { ratio = 1; }
      y += (topOf(next.el) - y) * ratio;
    }

    window.scrollTo(0, y);
  }

  window.addEventListener("message", function (event) {
    var msg = event.data;
    if (msg && msg.type === "scrollToLine") {
      scrollToLine(msg.line);
    }
  });
}());
</script>`;
  }
}

module.exports = { PreviewPanel };
