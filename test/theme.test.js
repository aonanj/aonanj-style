import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const script = readFileSync(new URL("../assets/js/aonanj-style.js", import.meta.url), "utf8");
function render(content, options = {}) {
  const dom = new JSDOM(`<!doctype html><nav data-readme-toc hidden></nav><article data-readme>${content}</article>`, {
    url: "https://example.test/project/", runScripts: "outside-only", ...options,
  });
  dom.window.eval(script);
  return dom;
}

test("moves a nested TOC, preserves IDs, and keeps surrounding README content", () => {
  const { document } = render(`
    <h1>Project</h1><p>Introduction.</p>
    <h2 id="table-of-contents">Table of contents</h2>
    <ul><li><a href="#install">Install</a><ul><li><a href="#linux">Linux</a></li></ul></li></ul>
    <p id="after">Important paragraph after the TOC.</p>
    <h2 id="install">Install</h2><h3 id="linux">Linux</h3>
  `).window;
  assert.equal(document.querySelector("[data-readme-toc]").hidden, false);
  assert.equal(document.querySelectorAll("[data-readme-toc] li").length, 2);
  assert.equal(document.querySelectorAll("#table-of-contents").length, 1);
  assert.equal(document.querySelector("[data-readme] #table-of-contents"), null);
  assert.ok(document.querySelector("[data-readme] #after"));
  assert.equal(document.querySelector("a[href='#linux']").getAttribute("href"), "#linux");
  assert.equal(document.querySelectorAll(".external-link-icon").length, 0);
});

test("recognizes a bold paragraph label, ordered lists, and same-page absolute paths", () => {
  const { document } = render('<p><strong>Contents:</strong></p><ol><li><a href="/project/#usage">Usage</a></li></ol><h2 id="usage">Usage</h2>').window;
  assert.ok(document.querySelector("[data-readme-toc] ol"));
  assert.equal(document.querySelector("[data-readme-toc]").hidden, false);
});

test("preserves mixed TOCs that also link to other documentation", () => {
  const { document } = render('<h2>Table of contents</h2><ul><li><a href="#usage">Usage</a></li><li><a href="guide.html">Guide</a></li></ul><h2 id="usage">Usage</h2>').window;
  assert.equal(document.querySelectorAll("[data-readme-toc] li").length, 2);
  assert.equal(document.querySelector('[data-readme-toc] a[href="guide.html"]').textContent, "Guide");
});

test("moves a details TOC intact and leaves ordinary disclosures alone", () => {
  const { document } = render('<details id="contents"><summary>Table of Contents</summary><ul><li><a href="#usage">Usage</a></li></ul></details><h2 id="usage">Usage</h2><details id="ordinary"><summary>Help</summary>Keep me.</details>').window;
  assert.ok(document.querySelector("[data-readme-toc] #contents summary"));
  assert.ok(document.querySelector("[data-readme] #ordinary"));
});

test("recognizes Kramdown and explicit custom TOC wrappers", () => {
  for (const toc of [
    '<ul id="markdown-toc"><li><a href="#usage">Usage</a></li></ul>',
    '<div data-toc><ul><li><a href="#usage">Usage</a></li></ul></div>',
    '<nav aria-label="Table of contents"><ul><li><a href="#usage">Usage</a></li></ul></nav>',
  ]) {
    const { document } = render(`${toc}<h2 id="usage">Usage</h2>`).window;
    assert.equal(document.querySelector("[data-readme-toc]").hidden, false);
    assert.ok(document.querySelector("[data-readme-toc] a[href='#usage']"));
    assert.equal(document.querySelectorAll("[data-readme] ul").length, 0);
  }
});

test("does not mistake prose, example code, or outbound link lists for a TOC", () => {
  for (const content of [
    "<h2>Contents</h2><p>A discussion of file contents.</p>",
    '<pre><code>&lt;h2&gt;Table of contents&lt;/h2&gt;</code></pre>',
    '<h2>Contents</h2><ul><li><a href="https://example.org">External</a></li></ul>',
  ]) {
    const { document } = render(content).window;
    assert.equal(document.querySelector("[data-readme-toc]").hidden, true);
    assert.ok(document.querySelector("[data-readme]").textContent.trim());
  }
});

test("repairs numbered and punctuation-different anchors without guessing ambiguous headings", () => {
  const { document } = render(`
    <div data-toc><ul>
      <li><a id="number" href="#1-install">1. Install</a></li>
      <li><a id="punctuation" href="#api--reference">API &amp; reference</a></li>
      <li><a id="ambiguous" href="#missing">Repeated</a></li>
      <li><a id="named" href="#custom">Named anchor</a></li>
      <li><a id="invalid" href="#%zz">Invalid</a></li>
    </ul></div>
    <h2 id="section-1-install">1. Install</h2><h2 id="api-reference">API &amp; reference</h2>
    <h2 id="repeat">Repeated</h2><h2 id="repeat-1">Repeated</h2><a name="custom"></a>
  `).window;
  assert.equal(document.querySelector("#number").hash, "#section-1-install");
  assert.equal(document.querySelector("#punctuation").hash, "#api-reference");
  assert.equal(document.querySelector("#ambiguous").hash, "#missing");
  assert.equal(document.querySelector("#named").hash, "#custom");
  assert.equal(document.querySelector("#invalid").hash, "#%zz");
});

test("marks only cross-origin HTTP(S) links, once, including image links", () => {
  const dom = render(`
    <a id="external" href="https://github.com/example/repo">Repository</a>
    <a id="protocol" href="//other.example/path">Elsewhere</a>
    <a id="image" href="https://other.example"><img alt="Badge" src="badge.svg"></a>
    <a id="existing" href="https://other.example">Already 🔗</a>
    <a id="header" href="https://github.com/example/repo">Source<span class="external-link-icon"> 🔗</span></a>
    <a id="same" href="https://example.test/elsewhere">Same origin</a>
    <a id="relative" href="guide.html">Guide</a><a id="fragment" href="#usage">Usage</a>
    <a id="email" href="mailto:hello@example.test">Email</a><a id="phone" href="tel:1234">Call</a>
    <a id="nohref">Anchor</a>
  `);
  dom.window.eval(script);
  const { document } = dom.window;
  for (const id of ["external", "protocol", "image", "header"]) {
    assert.equal(document.querySelectorAll(`#${id} .external-link-icon`).length, 1);
  }
  for (const id of ["same", "relative", "fragment", "email", "phone", "existing", "nohref"]) {
    assert.equal(document.querySelectorAll(`#${id} .external-link-icon`).length, 0);
  }
  assert.equal(document.querySelector("#external .external-link-icon").getAttribute("aria-hidden"), "true");
});

test("removes a pre-rendered external marker if an override points to this origin", () => {
  const { document } = render('<a href="/project/source">Source<span class="external-link-icon"> 🔗</span></a>').window;
  assert.equal(document.querySelector(".external-link-icon"), null);
});

test("makes wide tables keyboard-scrollable without changing cell content", () => {
  const dom = render('<table><caption>Settings</caption><thead><tr><th>Key</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>');
  dom.window.eval(script);
  const { document } = dom.window;
  assert.equal(document.querySelectorAll(".table-scroll").length, 1);
  const wrapper = document.querySelector(".table-scroll");
  assert.equal(wrapper.tabIndex, 0);
  assert.equal(wrapper.getAttribute("role"), "region");
  assert.equal(wrapper.getAttribute("aria-label"), "Settings");
  assert.equal(wrapper.querySelector("td").textContent, "Value");
});

test("enhances external links on a page without a README container", () => {
  const dom = new JSDOM('<a href="https://other.test">External</a>', { url: "https://example.test/", runScripts: "outside-only" });
  assert.doesNotThrow(() => dom.window.eval(script));
  assert.ok(dom.window.document.querySelector(".external-link-icon"));
});
