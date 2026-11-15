/* Progressive enhancements; the complete README remains available without JS. */
(() => {
  "use strict";

  const readme = document.querySelector("[data-readme]");
  const toc = document.querySelector("[data-readme-toc]");
  const isTocLabel = (text) => /^(table\s+of\s+contents|contents|toc)\s*:?$/i.test(text.trim());
  const isList = (element) => element && /^(UL|OL)$/.test(element.tagName);
  const isPageFragment = (link) => {
    try {
      const target = new URL(link.getAttribute("href"), document.baseURI);
      const pagePath = (path) => path.replace(/\/index\.html$/, "/");
      return Boolean(target.hash) && target.origin === window.location.origin &&
        pagePath(target.pathname) === pagePath(window.location.pathname) && target.search === window.location.search;
    } catch { return false; }
  };
  const hasLocalLinks = (element) => {
    const links = [...element.querySelectorAll("a[href]")];
    return links.some(isPageFragment);
  };

  function moveTableOfContents() {
    if (!readme || !toc) return;

    let nodes = [];
    const explicit = readme.querySelector('[data-toc], #markdown-toc, nav[aria-label="Table of contents"]');
    const disclosure = [...readme.querySelectorAll("details")].find((item) =>
      isTocLabel(item.querySelector("summary")?.textContent || "")
    );

    if (explicit) {
      const previous = explicit.previousElementSibling;
      if (previous && /^(H[1-6]|P)$/.test(previous.tagName) && isTocLabel(previous.textContent)) nodes.push(previous);
      nodes.push(explicit);
    } else if (disclosure) {
      nodes.push(disclosure);
    } else {
      const heading = [...readme.querySelectorAll("h1, h2, h3, h4, h5, h6, p")].find((item) =>
        !item.closest("pre, blockquote, li, details") && isTocLabel(item.textContent) &&
        isList(item.nextElementSibling) && hasLocalLinks(item.nextElementSibling)
      );
      if (heading) {
        nodes.push(heading);
        let list = heading.nextElementSibling;
        while (isList(list) && hasLocalLinks(list)) {
          nodes.push(list);
          list = list.nextElementSibling;
        }
      }
    }

    if (!nodes.length) return;
    const hasHeading = nodes.some((item) => /^(H[1-6]|P|DETAILS)$/.test(item.tagName) || item.querySelector("h1, h2, h3, h4, h5, h6"));
    if (!hasHeading) {
      const label = document.createElement("h2");
      label.className = "toc-heading";
      label.textContent = "Contents";
      toc.append(label);
    }
    nodes.forEach((node) => {
      if (/^(H[1-6]|P)$/.test(node.tagName)) node.classList.add("toc-heading");
      node.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => heading.classList.add("toc-heading"));
      toc.append(node);
    });
    toc.hidden = false;
    repairTocFragments();
  }

  function repairTocFragments() {
    // Kramdown prefixes some GitHub-style IDs (for example, headings beginning
    // with a number). Resolve these without changing IDs or rewriting good links.
    toc.querySelectorAll('a[href]').forEach((link) => {
      if (!isPageFragment(link)) return;
      let fragment;
      try { fragment = decodeURIComponent(link.hash.slice(1)); } catch { return; }
      if (!fragment || document.getElementById(fragment) || document.getElementsByName(fragment).length) return;
      const prefixed = document.getElementById(`section-${fragment}`);
      const label = link.textContent.trim().replace(/\s+/g, " ");
      const matches = [...readme.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")]
        .filter((heading) => heading.textContent.trim().replace(/\s+/g, " ") === label);
      const target = prefixed || (matches.length === 1 ? matches[0] : null);
      if (target) link.hash = target.id;
    });
  }

  function wrapTables() {
    readme?.querySelectorAll("table").forEach((table, index) => {
      if (table.parentElement.classList.contains("table-scroll")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-scroll";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", table.caption?.textContent.trim() || `Table ${index + 1}; scroll horizontally if needed`);
      table.before(wrapper);
      wrapper.append(table);
    });
  }

  function markExternalLinks() {
    document.querySelectorAll("a[href]").forEach((link) => {
      let target;
      try { target = new URL(link.getAttribute("href"), document.baseURI); } catch { return; }
      const external = /^https?:$/.test(target.protocol) && target.origin !== window.location.origin;
      const existing = link.querySelector(".external-link-icon");
      if (!external) {
        existing?.remove();
        return;
      }
      if (existing || link.textContent.trimEnd().endsWith("🔗")) return;
      const icon = document.createElement("span");
      icon.className = "external-link-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = " 🔗";
      link.append(icon);
    });
  }

  moveTableOfContents();
  wrapTables();
  markExternalLinks();
})();
