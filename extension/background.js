function isSpeedGrader(raw) {
  try {
    const url = new URL(raw);
    return url.origin === "https://canvas.asu.edu" && /^\/courses\/\d+\/gradebook\/speed_grader\/?$/.test(url.pathname);
  } catch { return false; }
}

async function scanTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!isSpeedGrader(tab.url)) return { error: "Open ASU Canvas SpeedGrader to scan links." };
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  const results = await Promise.all((frames || []).map(async frame => {
    try {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frame.frameId] },
        files: ["detector.js", "scan.js"]
      });
      if (!injection?.result) throw new Error("No result");
      return { frameId: frame.frameId, ...injection.result };
    } catch {
      let origin = null;
      try { const url = new URL(frame.url); if (url.protocol === "https:") origin = `${url.origin}/*`; } catch { /* opaque frame */ }
      return { frameId: frame.frameId, unavailable: true, origin };
    }
  }));
  const current = await chrome.tabs.get(tabId);
  if (current.url !== tab.url) return { error: "Submission changed. Scanning again…" };
  return { results, scannedAt: Date.now() };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {

  if (message?.type !== "scan") return;
  // Content scripts can only scan their own SpeedGrader tab. The popup may select a tab.
  const tabId = sender.tab?.id ?? message.tabId;
  if (!Number.isInteger(tabId) || (sender.tab && (sender.frameId !== 0 || !isSpeedGrader(sender.url)))) {
    respond({ error: "Open ASU Canvas SpeedGrader to scan links." });
    return;
  }
  scanTab(tabId).then(respond, error => respond({ error: error.message || "Unable to scan this tab. Refresh SpeedGrader." }));
  return true;
});

