# SpeedGrader LLM Link Check

A local Chrome Manifest V3 extension for `https://canvas.asu.edu/courses/<course-id>/gradebook/speed_grader`. Any assignment/student query parameters are accepted.

## Install

Download and extract the repository using GitHub's **Code → Download ZIP**, or clone it with Git. Then:

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** at the top right.
3. Click **Load unpacked** and select the **extension** folder in this project (the folder containing `manifest.json`).
4. Open or reload ASU Canvas SpeedGrader. The **LLM link check** panel appears at the bottom left.
5. If a submission viewer is unscanned, click this extension in Chrome's Extensions menu. Click **Allow scanning on …** for the viewer site, then accept Chrome's permission prompt. Each site is optional and requested individually.

The panel starts compact, updates every four seconds while the tab is visible, and has a **Rescan** button when expanded. Click its heading to expand or collapse it. Reload the extension and SpeedGrader after updating the files.

## Automatic panel expansion

Version 1.2 opens the bottom-left panel automatically when a new matching link is scanned. It shows the service name, link label, URL, and matching UTM parameters. If you collapse it, repeated scans of the same matches leave it collapsed; a new link or changed matching evidence opens it again. Switching student/assignment URLs resets it to compact and allows matches in that submission to open it. Link highlighting remains enabled.

Desktop notifications and the notification permission have been removed. To update, click **Reload** for the extension in `chrome://extensions`, then reload SpeedGrader.

## Detection and scope

- Examines HTTP(S) link destinations and plain-text URLs in the loaded page and accessible frames, including open shadow roots. Links with matches get an amber outline. Text URL matches appear in the panel.
- Checks all `utm_*` query parameters, not just `utm_source`. Shows exact matching values and service names.
- Recognizes ChatGPT/OpenAI, Claude/Anthropic, Perplexity, Gemini/Bard, Copilot, Grok, DeepSeek, Mistral/Le Chat, Meta AI, and You.com markers. This is a maintained heuristic list in `extension/detector.js`, not an authoritative or exhaustive registry.
- Handles URL-encoded parameter values and common wrapped destination parameters such as `url=` and `redirect_uri=` (up to three nested destinations).
- Scans the full loaded SpeedGrader page, so instructor comments and Canvas UI links may also appear. Results identify the page or embedded frame. It does not attribute a link to a particular author.
- Scans the currently displayed submission, not every student or assignment. Switching students triggers fresh scans; results reflect the DOM Canvas has loaded at scan time, which can temporarily contain the prior submission while Canvas loads the next one.
- UTM tags are editable referral metadata. Their presence is **not proof of AI authorship**; absence does not establish that AI was not used.

## Coverage limits

An extension cannot guarantee every link inside every uploaded file is available in the browser DOM. Canvas DocViewer, browser PDF viewers, images, canvas-rendered pages, closed shadow roots, unloaded/virtualized document pages, and sandboxed frames can hide links. Missing frame access is reported; embedded document/canvas elements produce an additional coverage notice. These notices are conservative and do not guarantee complete coverage when absent. Scroll long submissions to load additional pages and rescan. This version does not download or parse PDF/DOCX attachments, OCR images, follow redirects over the network, or call Canvas APIs. A zero-match result refers only to scanned content.

## Privacy and permissions

There are no dependencies, external services, telemetry, saved findings, or network requests. Findings exist in memory and the on-page panel. The extension does not change grades or submission content; it adds temporary link styling and its own panel.

`scripting` runs the scanner in frames. `webNavigation` enumerates frames to report coverage. Host access initially covers only ASU Canvas. Optional HTTPS host access allows individual embedded viewer sites to be approved via the popup; it does not grant all sites at installation. Scans are gated to ASU SpeedGrader tabs. Revoke site access through Chrome's extension details.

## Development and verification

Run `node --test tests/*.test.cjs` (or `npm test`) with Node.js 18+; no install step is required. Tests cover detection, DOM scan integration with a test double, background routing, and frame failures. For a real browser smoke test after installation:

1. Use a test submission containing `https://example.com/?utm_source=chatgpt.com`, a Claude-tagged link, and an ordinary newsletter UTM link.
2. Verify two matching destinations and amber outlines, with no newsletter match.
3. Switch students and submissions; confirm findings refresh after the new content loads.
4. Test an embedded viewer before/after granting its host access; confirm inaccessible frames remain reported.
5. Check a PDF/DOCX submission and remember that only links exposed by the viewer are scanned.
6. Open a regular Canvas page and another website; neither should show the panel.

Chrome APIs follow the official [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting), and [optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions) documentation.

## Repository layout

- `extension/`: the unpacked Chrome extension, including its manifest.
- `tests/`: automated tests using Node's built-in test runner.
- `.github/workflows/test.yml`: runs tests on pushes and pull requests with Node.js 22 and 24.

Generated ZIP archives are excluded from Git. Install from the `extension/` folder in the source checkout to use the current version.

## Contributing

Run the automated tests before submitting changes. For scanner, permission, or panel changes, also complete the browser smoke test above. Use synthetic examples in issues, tests, and screenshots; remove student names, submission content, and private Canvas URLs.

## License

No license has been selected yet. This repository does not currently grant a license to reuse, modify, or redistribute its code.
