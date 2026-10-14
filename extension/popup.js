const status = document.getElementById("status");
const permissions = document.getElementById("permissions");
async function refresh() {
  permissions.replaceChildren();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.runtime.sendMessage({ type: "scan", tabId: tab?.id });
    if (response.error) { status.textContent = response.error; return; }
    const missing = response.results.filter(frame => frame.unavailable);
    status.textContent = missing.length ? `${missing.length} embedded frame(s) could not be scanned.` : "Scanning is active. See the panel on the page.";
    const origins = [...new Set(missing.map(frame => frame.origin).filter(Boolean))];
    for (const origin of origins) {
      if (await chrome.permissions.contains({ origins: [origin] })) continue;
      const button = document.createElement("button");
      button.textContent = `Allow scanning on ${new URL(origin).hostname}`;
      button.addEventListener("click", async () => {
        try {
          const granted = await chrome.permissions.request({ origins: [origin] });
          if (granted) await refresh();
          else status.textContent = "Access was not granted. That viewer remains unscanned.";
        } catch (error) { status.textContent = error.message; }
      });
      permissions.appendChild(button);
    }
    if (missing.length) {
      const note = document.createElement("p");
      note.textContent = "Some sandboxed or browser document viewers remain inaccessible even with permission. Only links exposed in the loaded page can be checked.";
      permissions.appendChild(note);
    }
  } catch (error) { status.textContent = error.message; }
}
refresh();
