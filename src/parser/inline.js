// @ts-check
// 行内（インライン）タグの変換を担うモジュール。
// 対応タグ:
//   [[rb:漢字>ふりがな]]            ルビ
//   [[emphasismark:本文>﹅]]        傍点
//   [b:太字]                        太字
//   [i:斜体]                        斜体
// それ以外の素テキストは HTML エスケープする。未知タグは変換せずエスケープして残す。

"use strict";

/**
 * HTML の特殊文字をエスケープする。
 * Webview への描画前にユーザー入力をそのまま埋め込まないための基本対策。
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 1 行分の文字列を解釈し、インラインタグを HTML へ変換した文字列を返す。
 * タグの中身（本文）は再帰的に解釈するため、[b:[i:...]] のような入れ子も扱える。
 * @param {string} line
 * @returns {string}
 */
function parseInline(line) {
  let result = "";
  let i = 0;

  while (i < line.length) {
    // 二重括弧タグ [[...]] を優先的に判定する
    if (line.startsWith("[[", i)) {
      const consumed = tryParseDoubleTag(line, i);
      if (consumed) {
        result += consumed.html;
        i = consumed.next;
        continue;
      }
    }

    // 単一括弧タグ [name:...]
    if (line[i] === "[") {
      const consumed = tryParseSingleTag(line, i);
      if (consumed) {
        result += consumed.html;
        i = consumed.next;
        continue;
      }
    }

    // タグでない 1 文字はエスケープして出力
    result += escapeHtml(line[i]);
    i++;
  }

  return result;
}

/**
 * @typedef {{ html: string, next: number }} Consumed
 * html = 生成 HTML、next = 消費後の次インデックス。
 */

/**
 * [[rb:...>...]] / [[emphasismark:...>...]] を解析する。
 * 対応しない、または閉じられていない場合は null を返す（呼び出し側でリテラル扱い）。
 * @param {string} line
 * @param {number} start
 * @returns {Consumed | null}
 */
function tryParseDoubleTag(line, start) {
  const close = findMatching(line, start + 2, "[[", "]]");
  if (close === -1) {
    return null;
  }
  const inner = line.slice(start + 2, close); // 例: "rb:漢字>ふりがな"
  const next = close + 2;

  const colon = inner.indexOf(":");
  if (colon === -1) {
    return null;
  }
  const name = inner.slice(0, colon);
  const body = inner.slice(colon + 1);

  if (name === "rb") {
    const gt = body.indexOf(">");
    if (gt === -1) {
      return null;
    }
    const base = parseInline(body.slice(0, gt));
    const ruby = escapeHtml(body.slice(gt + 1));
    return { html: `<ruby><span>${base}</span><rt>${ruby}</rt></ruby>`, next };
  }

  if (name === "emphasismark") {
    const gt = body.indexOf(">");
    if (gt === -1) {
      return null;
    }
    const text = parseInline(body.slice(0, gt));
    const mark = escapeHtml(body.slice(gt + 1));
    return {
      html: `<span style="text-emphasis-style: '${mark}'; text-emphasis-position: over right;">${text}</span>`,
      next,
    };
  }

  // 未知の二重括弧タグはリテラル扱い
  return null;
}

/**
 * [b:...] / [i:...] を解析する。
 * 対応しない、または閉じられていない場合は null を返す。
 * @param {string} line
 * @param {number} start
 * @returns {Consumed | null}
 */
function tryParseSingleTag(line, start) {
  const close = findMatching(line, start + 1, "[", "]");
  if (close === -1) {
    return null;
  }
  const inner = line.slice(start + 1, close); // 例: "b:太字"
  const next = close + 1;

  const colon = inner.indexOf(":");
  if (colon === -1) {
    return null;
  }
  const name = inner.slice(0, colon);
  const body = parseInline(inner.slice(colon + 1));

  if (name === "b") {
    return { html: `<b>${body}</b>`, next };
  }
  if (name === "i") {
    return { html: `<i>${body}</i>`, next };
  }

  // 未知の単一括弧タグはリテラル扱い
  return null;
}

/**
 * open で始まったタグに対応する close の開始位置を返す。入れ子に対応する。
 * 見つからなければ -1。
 * @param {string} line
 * @param {number} contentStart open 直後（中身の先頭）のインデックス
 * @param {string} open
 * @param {string} close
 * @returns {number}
 */
function findMatching(line, contentStart, open, close) {
  let depth = 1;
  let i = contentStart;
  while (i < line.length) {
    if (line.startsWith(open, i)) {
      depth++;
      i += open.length;
    } else if (line.startsWith(close, i)) {
      depth--;
      if (depth === 0) {
        return i;
      }
      i += close.length;
    } else {
      i++;
    }
  }
  return -1;
}

module.exports = { parseInline, escapeHtml };
