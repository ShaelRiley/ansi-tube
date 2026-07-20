# Chrome Web Store Reviewer Notes

## Permission justifications

### storage

Stores user-selected rendering, framing, reactive-effect, audio-effect, export, and collapsed-panel preferences locally. No account or server is used.

### Host access: https://www.youtube.com/*

ANSI Tube's single purpose requires a content script on YouTube to locate the user-selected HTML video element, sample decoded frames locally, draw the converted overlay, and optionally route that video's audio through local Web Audio effects. The extension does not run on other sites and does not transmit page, video, audio, or browsing data.

## Remote code declaration

Select: **No, I am not using remote code.**

All JavaScript, CSS, the audio worklet, icons, glyph definitions, palette data, and cow artwork are packaged in the extension. There are no network requests, remote scripts, remotely hosted WebAssembly modules, `eval`, or dynamic code generation.

## Data-use disclosure

ANSI Tube accesses the active YouTube video's decoded website content transiently and locally to provide its prominently disclosed rendering feature. It does not collect, retain, transmit, sell, or share that content or any personal data. User preferences are stored only in `chrome.storage.local`.

Use the Developer Dashboard's current wording to disclose local access conservatively, and keep every selection consistent with the public privacy policy. Certify all applicable Limited Use statements.

## Test instructions

No account or credentials are required beyond ordinary public YouTube access.

1. Open a public YouTube video.
2. Click the ANSI Tube toolbar icon or press Alt+Shift+A.
3. Confirm the converted canvas and controls appear over the video.
4. Collapse the controls; stop moving the pointer for 2.2 seconds and confirm the compact bar fades. Move the pointer over the player and confirm it returns.
5. Under Look & Glyphs, choose MooBurst🐄.
6. Choose MooBurst, then open Reactive Effects, enable effects, and enable Blond cow cameos + moo. The unlocked effect remains active when another palette is selected; turning it off outside MooBurst hides the secret control again. Use Test moo to verify synthesized audio immediately. The first bundled cow cameo appears within about 22 seconds and later recurs within a bounded 75–100-second window; its PNG, compositing, timing analysis, and synthesized audio are fully local.
7. Test 4:3 and 1:1 framing, PNG export, and Alt+Shift+A shutdown.

## Scope and independence

ANSI Tube is an independent artistic playback transformer. It does not claim affiliation with or endorsement by YouTube or Google, does not alter YouTube accounts or recommendations, and does not bypass protected media restrictions.
