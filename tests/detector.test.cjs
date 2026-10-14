const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detect } = require('../extension/detector.js');

test('identifies provider markers in any UTM parameter, case insensitively', () => {
  for (const value of ['chatgpt.com', 'OpenAI', 'claude.ai', 'anthropic', 'perplexity.ai', 'pplx', 'gemini', 'bard', 'copilot', 'grok', 'deepseek', 'mistral', 'meta.ai', 'you.com']) {
    assert.ok(detect(`https://example.com/?UTM_SOURCE=${value}`).length, value);
  }
  assert.equal(detect('https://example.com/?utm_campaign=from_chatgpt_search')[0].provider, 'ChatGPT / OpenAI');
});
test('does not mistake a provider domain or ordinary query parameter for UTM evidence', () => {
  for (const url of ['https://chatgpt.com/', 'https://example.com/?source=chatgpt', 'https://example.com/?utm_source=newsletter', 'https://example.com/?utm_source=bardstown', 'https://example.com/?utm_campaign=discarded', 'javascript:alert(1)', 'mailto:a@b.com?utm_source=chatgpt']) assert.deepEqual(detect(url), []);
});
test('handles encoded values, HTML entities, duplicates, and relative links', () => {
  assert.equal(detect('/paper?a=1&amp;utm_source=chatgpt%2Ecom')[0].value, 'chatgpt.com');
  assert.equal(detect('https://example.com/?utm_source=chatgpt&utm_source=claude').length, 2);
  assert.equal(detect('/?utm_medium=perplexity')[0].key, 'utm_medium');
});
test('inspects wrapped destinations without marking arbitrary text queries', () => {
  const target = encodeURIComponent('https://example.com/?utm_source=chatgpt.com');
  assert.equal(detect(`https://redirect.test/?url=${target}`)[0].nested, true);
  assert.deepEqual(detect('https://example.com/?q=chatgpt'), []);
});
test('ignores malformed input and fragment text', () => {
  assert.deepEqual(detect(null), []);
  assert.deepEqual(detect('https://[invalid'), []);
  assert.deepEqual(detect('https://example.com/#utm_source=chatgpt'), []);
});
