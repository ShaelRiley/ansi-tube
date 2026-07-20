# ANSI Tube Privacy Policy

Last updated: July 20, 2026

ANSI Tube transforms YouTube playback into ANSI-inspired visual art and optional audio effects. Its processing happens locally in the user's browser.

## Data accessed

When the user activates ANSI Tube on YouTube, the extension temporarily accesses the active video's decoded frames so it can draw the requested visual conversion. If the user enables an audio effect, the extension also processes the active video's audio through the browser's local Web Audio API.

ANSI Tube does not collect, retain, transmit, sell, or share video frames, audio, page content, browsing history, personal information, authentication information, or user activity. It does not use analytics, advertising, tracking pixels, remote code, accounts, or external servers.

The MooBurst comedic-cow option uses only the same small, transient local frame proxy already used by reactive effects. Its realistic cow PNG is bundled with the extension and its soft moo is synthesized locally with the Web Audio API. It does not perform identity recognition, object recognition, or network analysis.

## Data stored locally

ANSI Tube uses Chrome's local extension storage only to remember user-selected rendering, framing, effects, audio, and control-panel preferences. These settings remain on the user's device and can be removed by uninstalling the extension or clearing the extension's stored data.

User-requested PNG and ANSI exports are saved only through the browser's normal download mechanism to the location chosen by the user.

## Permissions

- `storage` stores the user's local preferences.
- Access to `https://www.youtube.com/*` lets the extension find the active YouTube video and render the user-requested on-page transformation. The extension does not run on other sites.

## Limited Use

Information accessed by ANSI Tube is used only to provide or improve its user-facing playback-transformation features. ANSI Tube's use of information complies with the Chrome Web Store User Data Policy, including its Limited Use requirements.

## Changes and contact

Material changes to this policy will be disclosed with an extension update. Questions or privacy concerns may be submitted through the project's public issue tracker:

https://github.com/ShaelRiley/ansi-tube/issues
