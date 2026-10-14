/* Shared by the isolated content-script world and Node's test runner. */
(() => {
  const providers = [
    ["ChatGPT / OpenAI", /(?:^|[^a-z0-9])(?:chatgpt|chat-gpt|openai)(?=$|[^a-z0-9])/i],
    ["Claude / Anthropic", /(?:^|[^a-z0-9])(?:claude|anthropic)(?=$|[^a-z0-9])/i],
    ["Perplexity", /(?:^|[^a-z0-9])(?:perplexity|pplx)(?=$|[^a-z0-9])/i],
    ["Gemini / Bard", /(?:^|[^a-z0-9])(?:gemini|bard)(?=$|[^a-z0-9])/i],
    ["Microsoft Copilot", /(?:^|[^a-z0-9])(?:copilot|bingchat|bing-chat)(?=$|[^a-z0-9])/i],
    ["Grok", /(?:^|[^a-z0-9])grok(?=$|[^a-z0-9])/i],
    ["DeepSeek", /(?:^|[^a-z0-9])deepseek(?=$|[^a-z0-9])/i],
    ["Mistral / Le Chat", /(?:^|[^a-z0-9])(?:mistral|lechat|le-chat)(?=$|[^a-z0-9])/i],
    ["Meta AI", /(?:^|[^a-z0-9])meta[. _-]?ai(?=$|[^a-z0-9])/i],
    ["You.com", /(?:^|[^a-z0-9])you\.com(?=$|[^a-z0-9])/i]
  ];
  function detect(raw, base = "https://canvas.asu.edu/") {
    const hits = [];
    const visited = new Set();
    function inspect(value, depth) {
      if (depth > 3 || visited.has(value)) return;
      visited.add(value);
      let url;
      try { url = new URL(value.replace(/&amp;/gi, "&"), base); } catch { return; }
      if (!/^https?:$/.test(url.protocol)) return;
      for (const [key, val] of url.searchParams) {
        if (/^utm_[a-z0-9_]+$/i.test(key)) {
          for (const [provider, pattern] of providers) {
            if (pattern.test(val)) hits.push({ provider, key, value: val, url: url.href, nested: depth > 0 });
          }
        }
        // Inspect explicit wrapped destinations without visiting them.
        if (/^(?:url|u|q|target|dest|destination|redirect|redirect_url|redirect_uri|link)$/i.test(key) && /^https?:\/\//i.test(val)) {
          inspect(val, depth + 1);
        }
      }
    }
    if (typeof raw === "string") inspect(raw, 0);
    return hits;
  }
  const api = { detect };
  globalThis.LLMUTMDetector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
