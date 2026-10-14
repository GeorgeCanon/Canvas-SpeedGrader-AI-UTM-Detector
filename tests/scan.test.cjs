const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { detect } = require('../extension/detector.js');
const code = fs.readFileSync(require.resolve('../extension/scan.js'), 'utf8');

test('scans links and plain text, deduplicates findings, and clears stale highlights', () => {
  const link = href => ({ href, textContent: 'Reference', attributes: new Map(),
    getAttribute() { return null; }, setAttribute(key, value) { this.attributes.set(key, value); }, removeAttribute(key) { this.attributes.delete(key); } });
  const tagged = link('https://example.com/?utm_source=chatgpt.com');
  const stale = link('https://example.org/?utm_source=newsletter');
  stale.setAttribute('data-speedgrader-llm-utm', '');
  const document = {
    title: 'Test submission', baseURI: 'https://canvas.asu.edu/', head: { appendChild() {} },
    createElement: () => ({ setAttribute() {} }),
    querySelector: () => true,
    querySelectorAll(selector) {
      if (selector === 'a[href], area[href]') return [tagged, tagged, stale];
      if (selector === '[data-speedgrader-llm-utm]') return [stale];
      return [];
    },
    createTreeWalker() {
      let scanned = false;
      return { currentNode: { textContent: 'Read https://example.net/paper?utm_source=claude.ai.' }, nextNode() { if (scanned) return false; scanned = true; return true; } };
    }
  };
  const result = vm.runInNewContext(code, { document, location: { href: document.baseURI }, NodeFilter: { SHOW_TEXT: 4 }, LLMUTMDetector: { detect } });
  assert.equal(result.linksChecked, 4);
  assert.equal(result.matches.length, 2);
  assert.equal(result.matches[1].kind, 'Text URL');
  assert.equal(result.matches[1].evidence[0].value, 'claude.ai');
  assert.ok(tagged.attributes.has('data-speedgrader-llm-utm'));
  assert.ok(!stale.attributes.has('data-speedgrader-llm-utm'));
});
