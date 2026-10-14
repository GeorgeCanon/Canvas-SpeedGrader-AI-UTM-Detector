(() => {
  if (document.getElementById("speedgrader-llm-utm-panel")) return;
  const host = document.createElement("div");
  host.id = "speedgrader-llm-utm-panel";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; position: fixed; bottom: 16px; left: 16px; z-index: 2147483647; font: 13px/1.45 system-ui, sans-serif; color: #172c39; }
      details { width: 360px; max-width: calc(100vw - 32px); background: white; border: 1px solid #aebdc7; border-radius: 12px; box-shadow: 0 5px 28px #142f4030; overflow: hidden; }
      details:not([open]) { width: max-content; }
      summary { padding: 12px 16px; cursor: pointer; font-weight: 700; background: #eef5f8; }
      .body { padding: 0 16px 14px; max-height: 55vh; overflow: auto; }
      p { margin: 10px 0; } button { border: 1px solid #aebdc7; border-radius: 6px; padding: 6px 10px; background: #fff; color: #172c39; cursor: pointer; }
      .note { color: #526572; font-size: 12px; } .warning { color: #805000; } ul { padding: 0; list-style: none; }
      li { border-top: 1px solid #dbe3e8; padding: 10px 0; overflow-wrap: anywhere; } code { font-size: 12px; } strong { display: block; }
    </style>
    <details><summary>LLM link check · scanning…</summary><div class="body">
      <p id="status" role="status" aria-live="polite">Checking displayed links…</p>
      <button type="button">Rescan</button>
      <p class="note">UTM tags are referral metadata, not proof of AI authorship.</p>
      <p id="coverage" class="warning"></p><ul></ul>
      <p class="note">Scans the loaded page and accessible frames, including comments and Canvas navigation. Documents rendered as images or PDF pages may hide links.</p>
    </div></details>`;
  document.documentElement.appendChild(host);
  const summary = shadow.querySelector("summary");
  const status = shadow.querySelector("#status");
  const coverage = shadow.querySelector("#coverage");
  const list = shadow.querySelector("ul");
  const details = shadow.querySelector("details");
  // Respect manual collapse until a new matching link or submission appears.
  const seenMatches = new Set();
  let busy = false;
  let lastUrl = location.href;
  let lastRendered = "";
  function clear() { list.replaceChildren(); lastRendered = ""; summary.textContent = "LLM link check · scanning…"; }
  async function scan() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      seenMatches.clear();
      details.open = false;
      clear();
      status.textContent = "Submission changed. Checking displayed links…";
    }
    if (busy || document.hidden) return;
    busy = true;
    const startedUrl = location.href;
    try {
      const response = await chrome.runtime.sendMessage({ type: "scan" });
      if (location.href !== startedUrl) { clear(); return; }
      if (response.error) throw new Error(response.error);
      const frames = response.results.filter(frame => !frame.unavailable);
      const missing = response.results.length - frames.length;
      const hits = frames.flatMap(frame => frame.matches.map(hit => ({ ...hit, frame: frame.frameId === 0 ? "SpeedGrader page" : (frame.title || "Embedded submission") })));
      const checked = frames.reduce((sum, frame) => sum + frame.linksChecked, 0);
      summary.textContent = `LLM link check · ${hits.length} ${hits.length === 1 ? "match" : "matches"}`;
      status.textContent = `${checked} link occurrences checked across ${frames.length} frames. ${hits.length ? "Matching links are outlined in amber." : "No matching UTM tags found in scanned content."}`;
      coverage.textContent = missing ? `${missing} frame(s) could not be scanned. Open the extension toolbar popup to allow access to embedded viewer sites.` : "";
      if (frames.some(frame => frame.embeddedDocuments)) coverage.textContent += " A document/canvas viewer is present; its rendered content may not expose all links.";
      const signature = JSON.stringify(hits);
      if (signature !== lastRendered) {
        list.replaceChildren();
        for (const hit of hits.slice(0, 100)) {
          const row = document.createElement("li");
          const title = document.createElement("strong");
          title.textContent = hit.label || hit.url;
          const source = document.createElement("p");
          source.className = "note";
          source.textContent = `${hit.kind} · ${hit.frame}`;
          const url = document.createElement("p");
          url.textContent = hit.url;
          row.append(title, source, url);
          for (const evidence of hit.evidence) {
            const line = document.createElement("p");
            line.textContent = `${evidence.provider}: ${evidence.key}=${evidence.value}${evidence.nested ? " (wrapped destination)" : ""}`;
            row.appendChild(line);
          }
          list.appendChild(row);
        }
        if (hits.length > 100) { const extra = document.createElement("li"); extra.textContent = "Showing the first 100 matches."; list.appendChild(extra); }
        lastRendered = signature;
      }
      for (const hit of hits) {
        const evidence = hit.evidence.map(item => [item.provider, item.key, item.value, item.url]).sort();
        const key = JSON.stringify([hit.url, evidence]);
        if (!seenMatches.has(key)) {
          seenMatches.add(key);
          details.open = true;
        }
      }
    } catch (error) {
      clear(); summary.textContent = "LLM link check · unavailable";
      status.textContent = `${error.message} Reload this page if the extension was updated.`;
      coverage.textContent = "";
    } finally { busy = false; }
  }
  shadow.querySelector("button").addEventListener("click", scan);
  window.addEventListener("hashchange", () => { clear(); scan(); });
  document.addEventListener("visibilitychange", scan);
  setInterval(scan, 4000);
  scan();
})();
