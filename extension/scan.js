(() => {
  const matches = new Map();
  let linksChecked = 0;
  let embeddedDocuments = 0;
  const marker = "data-speedgrader-llm-utm";
  const roots = [document];
  for (let i = 0; i < roots.length; i++) {
    for (const node of roots[i].querySelectorAll("*")) {
      if (node.shadowRoot && node.id !== "speedgrader-llm-utm-panel") roots.push(node.shadowRoot);
    }
  }
  function check(raw, label, kind) {
    linksChecked++;
    const evidence = globalThis.LLMUTMDetector.detect(raw, document.baseURI);
    if (!evidence.length) return false;
    const id = JSON.stringify([raw, kind]);
    if (!matches.has(id)) matches.set(id, { url: raw, label: label.trim().slice(0, 180), kind, evidence });
    return true;
  }
  for (const root of roots) {
    root.querySelectorAll(`[${marker}]`).forEach(node => node.removeAttribute(marker));
    if (!root.querySelector("style[data-llm-utm-style]")) {
      const style = document.createElement("style");
      style.setAttribute("data-llm-utm-style", "");
      style.textContent = `[${marker}] { outline: 2px solid #c06b00 !important; outline-offset: 2px !important; background-color: #fff0c2 !important; color: #432600 !important; }`;
      (root.head || root).appendChild(style);
    }
    root.querySelectorAll("a[href], area[href]").forEach(link => {
      if (check(link.href, link.textContent || link.getAttribute("alt") || link.href, "Link")) link.setAttribute(marker, "");
    });
    const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement?.closest("a, script, style, noscript, textarea, input, [contenteditable='true']")
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) {
      for (const found of walker.currentNode.textContent.matchAll(/https?:\/\/[^\s<>"\u201c\u201d]+/gi)) {
        const raw = found[0].replace(/[.,;!?)\]}]+$/, "");
        check(raw, raw, "Text URL");
      }
    }
    embeddedDocuments += root.querySelectorAll("embed, object, canvas").length;
  }
  return { matches: [...matches.values()], linksChecked, embeddedDocuments, title: document.title, frameUrl: location.href };
})();
