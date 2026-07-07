// @ts-check
// パーサのエントリ。公開インターフェースは parse(rawText): string。
// ブロック要素（章・改ページ・段落・空行）を解釈し、行内はインラインパーサに委譲する。
//
// ブロック仕様:
//   [chapter:タイトル]   単独行 → 段落を閉じて <h2>タイトル</h2>
//   [newpage]            単独行 → 段落を閉じて <hr>[newpage]<hr>
//   空行                 段落（<p>）の区切り。2 行以上連続した場合は、
//                        2 行目以降の各空行を空段落 <p><br></p> として出力する
//                        （例: 改行 3 連続 = 空行 2 行 → <p><br></p> 1 個）
//   その他の非空行       段落内の 1 行。<span>…</span> として出力し、同一段落内は <br> で連結
//
// スクロール同期用: 各ブロック要素に data-line 属性（元テキストの 0 始まり行番号）を付与する。
// Webview 側はこの属性を手がかりに、エディタの先頭表示行へプレビューを追従させる。

"use strict";

const { parseInline, escapeHtml } = require("./inline");

const CHAPTER_RE = /^\[chapter:([\s\S]*)\]$/;

/**
 * 独自タグ仕様の生テキストを HTML 文字列へ変換する。
 * @param {string} rawText
 * @returns {string}
 */
function parse(rawText) {
  // 改行コードの差異（CRLF / CR / LF）を吸収する
  const lines = rawText.replace(/\r\n?/g, "\n").split("\n");

  /** @type {string[]} */
  const out = [];
  /** @type {string[]} 現在組み立て中の段落の各行 HTML */
  let paragraph = [];
  /** 現在組み立て中の段落の先頭行の元行番号（0 始まり） */
  let paragraphStartLine = 0;
  /** 連続している空行の数 */
  let blankRun = 0;
  /** 連続空行の先頭の元行番号（0 始まり） */
  let blankRunStartLine = 0;

  // 空行の連続が終わったタイミングで、2 行目以降の空行を空段落として出力する
  const flushBlankRun = () => {
    for (let i = 1; i < blankRun; i++) {
      // i 番目の空段落は、連続空行の (i) 行目（0 始まりで blankRunStartLine + i）に対応する
      out.push(`<p data-line="${blankRunStartLine + i}"><br></p>`);
    }
    blankRun = 0;
  };

  // 段落を閉じて出力へ流し込む
  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    // 行間のみ <br> で連結し、段落末尾には付けない
    out.push(`<p data-line="${paragraphStartLine}">${paragraph.join("<br>")}</p>`);
    paragraph = [];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // 空行 → 段落区切り（連続数を数えておく）
    if (line.trim() === "") {
      flushParagraph();
      if (blankRun === 0) {
        blankRunStartLine = idx;
      }
      blankRun++;
      continue;
    }

    flushBlankRun();

    // [chapter:...]（単独行）
    const chapter = line.match(CHAPTER_RE);
    if (chapter) {
      flushParagraph();
      out.push(`<h2 data-line="${idx}">${parseInline(chapter[1])}</h2>`);
      continue;
    }

    // [newpage]（単独行）
    if (line.trim() === "[newpage]") {
      flushParagraph();
      out.push(`<hr data-line="${idx}">[newpage]<hr>`);
      continue;
    }

    // 通常の本文行（段落の先頭行なら開始行番号を記録する）
    if (paragraph.length === 0) {
      paragraphStartLine = idx;
    }
    paragraph.push(`<span>${parseInline(line)}</span>`);
  }

  flushBlankRun();
  flushParagraph();

  return out.join("\n");
}

// 補助関数も再公開しておく（パネル側でタイトル等のエスケープに使えるよう）
module.exports = { parse, escapeHtml };
