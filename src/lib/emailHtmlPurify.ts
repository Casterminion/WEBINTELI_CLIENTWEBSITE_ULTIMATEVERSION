import DOMPurify from "isomorphic-dompurify";

/**
 * Richer than default HTML profile so pasted client email (tables, inline styles) keeps layout.
 * Still XSS-safe — DOMPurify sanitizes `style` values.
 */
export function sanitizeEmailHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ADD_TAGS: [
      "table",
      "tbody",
      "thead",
      "tfoot",
      "tr",
      "th",
      "td",
      "caption",
      "colgroup",
      "col",
      "center",
      "font",
      "hr",
      "s",
      "strike",
    ],
    ADD_ATTR: [
      "style",
      "align",
      "valign",
      "border",
      "cellpadding",
      "cellspacing",
      "bgcolor",
      "width",
      "height",
      "colspan",
      "rowspan",
      "class",
    ],
  });
}
