import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { JSDOM } from "jsdom";

const input = resolve(process.argv[2] || "_site/index.html");
const siteDirectory = dirname(input);
const html = readFileSync(input, "utf8");
const initial = new JSDOM(html);
const cssHref = initial.window.document.querySelector('link[rel="stylesheet"]').getAttribute("href");
const basePath = cssHref.replace(/assets\/css\/aonanj-style\.css$/, "");
const url = `https://preview.example${basePath}`;
const dom = new JSDOM(html, { url, runScripts: "outside-only" });
const { document } = dom.window;
const originalBodyText = document.querySelector("[data-readme]").textContent.replace(/\s+/g, " ").trim();
dom.window.eval(readFileSync(join(siteDirectory, "assets/js/aonanj-style.js"), "utf8"));

assert.equal(document.querySelectorAll(".site-shell > .card").length, 3);
const toc = document.querySelector(".header-card [data-readme-toc]");
assert.equal(toc.hidden, false, "This README's TOC should move into the header");
const tocLinks = [...toc.querySelectorAll("a[href]")];
assert.ok(tocLinks.length > 0);
for (const link of tocLinks) {
  const id = decodeURIComponent(link.hash.slice(1));
  assert.ok(document.getElementById(id) || document.getElementsByName(id).length, `Missing TOC target: ${link.hash}`);
}
assert.equal(document.querySelectorAll(".body-card #table-of-contents").length, 0);
const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
assert.equal(new Set(ids).size, ids.length, "Generated HTML should not contain duplicate IDs");
// Ignore enhancement-only markers and normalize whitespace when comparing text.
const textOf = (element) => {
  const copy = element.cloneNode(true);
  copy.querySelectorAll(".external-link-icon").forEach((icon) => icon.remove());
  return copy.textContent.replace(/\s+/g, " ").trim();
};
const movedText = textOf(toc);
const bodyText = textOf(document.querySelector("[data-readme]"));
assert.equal(originalBodyText.replace(movedText, "").replace(/\s+/g, " ").trim(), bodyText, "Only TOC text may leave the README body");

let externalCount = 0;
for (const link of document.querySelectorAll("a[href]")) {
  const target = new URL(link.getAttribute("href"), url);
  const external = /^https?:$/.test(target.protocol) && target.origin !== new URL(url).origin;
  const marked = link.textContent.trimEnd().endsWith("🔗");
  assert.equal(marked, external, `Incorrect external-link marker: ${target.href}`);
  if (external) externalCount += 1;
}
for (const asset of document.querySelectorAll('link[rel="stylesheet"], script[src], .repo-icon, link[rel="icon"], .license-link')) {
  const target = new URL(asset.getAttribute("src") || asset.getAttribute("href"), url);
  if (target.origin !== new URL(url).origin) continue;
  const relative = target.pathname.slice(basePath.length);
  assert.ok(existsSync(join(siteDirectory, relative)), `Missing site file: ${relative}`);
}
const tables = document.querySelectorAll(".body-card table");
for (const table of tables) {
  assert.ok(table.parentElement.matches('.table-scroll[tabindex="0"][role="region"]'));
}

const css = readFileSync(join(siteDirectory, "assets/css/aonanj-style.css"), "utf8");
const style = document.createElement("style");
style.textContent = css;
document.head.append(style);
assert.ok(style.sheet.cssRules.length > 0, "The stylesheet must parse");
const color = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))[1];
const luminance = (hex) => {
  const rgb = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
for (const foreground of ["text", "brand", "tertiary-button"]) {
  const values = [luminance(color(foreground)), luminance(color("card-background"))].sort((a, b) => b - a);
  assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${foreground} must have readable contrast`);
}
console.log(`Rendered site passed: 3 cards, ${tocLinks.length} working TOC links, ${externalCount} external links, ${tables.length} accessible tables; local assets and text contrast checked.`);
