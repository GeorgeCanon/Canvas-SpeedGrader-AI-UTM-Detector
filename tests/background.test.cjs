const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require.resolve('../extension/background.js'), 'utf8');
const speedGrader = 'https://canvas.asu.edu/courses/1/gradebook/speed_grader?assignment_id=1&student_id=2';

function harness({ urls = [speedGrader], failedFrames = [], frames = [{ frameId: 0, url: speedGrader }] } = {}) {
  let listener;
  let tabReads = 0;
  const injected = [];

  const context = vm.createContext({ URL, chrome: {
    tabs: { get: async () => ({ url: urls[Math.min(tabReads++, urls.length - 1)] }) },
    webNavigation: { getAllFrames: async () => frames },
    scripting: { executeScript: async ({ target }) => {
      const id = target.frameIds[0]; injected.push(id);
      if (failedFrames.includes(id)) throw new Error('Host access denied');
      return [{ result: { matches: [], linksChecked: 2, embeddedDocuments: 0 } }];
    } },
    runtime: { onMessage: { addListener: fn => { listener = fn; } } }
  } });
  vm.runInContext(code, context);
  return { context, injected, request: (message, sender = {}) => new Promise(resolve => listener(message, sender, resolve)) };
}
test('only accepts exact ASU SpeedGrader routes independent of query parameters', () => {
  const { context } = harness();
  assert.equal(context.isSpeedGrader(speedGrader), true);
  for (const url of ['https://canvas.asu.edu/courses/1', 'https://canvas.asu.edu/courses/1/gradebook/speed_grader_fake', 'https://evil.test/courses/1/gradebook/speed_grader', 'http://canvas.asu.edu/courses/1/gradebook/speed_grader']) assert.equal(context.isSpeedGrader(url), false);
});
test('keeps successful frame results while explicitly reporting inaccessible frames', async () => {
  const h = harness({ frames: [{ frameId: 0, url: speedGrader }, { frameId: 4, url: 'https://viewer.example/doc' }, { frameId: 5, url: 'about:blank' }], failedFrames: [4, 5] });
  const response = await h.request({ type: 'scan', tabId: 1 });
  assert.equal(response.results[0].linksChecked, 2);
  assert.equal(response.results[1].unavailable, true);
  assert.equal(response.results[1].origin, 'https://viewer.example/*');
  assert.equal(response.results[2].origin, null);
});
test('rejects results when the selected student changes during a scan', async () => {
  const h = harness({ urls: [speedGrader, speedGrader.replace('student_id=2', 'student_id=3')] });
  assert.match((await h.request({ type: 'scan', tabId: 1 })).error, /Submission changed/);
});
test('refuses scans of other pages before injecting', async () => {
  const h = harness({ urls: ['https://example.com/'] });
  assert.ok((await h.request({ type: 'scan', tabId: 1 })).error);
  assert.equal(h.injected.length, 0);
});
test('only the top-level SpeedGrader content script can request a scan', async () => {
  const h = harness();
  const response = await h.request({ type: 'scan' }, { tab: { id: 1 }, frameId: 2, url: speedGrader });
  assert.ok(response.error);
  assert.equal(h.injected.length, 0);
});


