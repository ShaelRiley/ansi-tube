# Chrome Web Store Release Checklist

## Package — completed

- Manifest V3
- Narrow single purpose
- Runtime code bundled locally; no remote code
- Permissions reduced to `storage` and exact `https://www.youtube.com/*` host access
- Required 128×128 padded PNG extension icon plus 16/32/48px variants
- Accurate manifest summary within 132 characters
- Public homepage configured
- Automated syntax, core, audio, integration, manifest, permission, and package checks
- Root-level Store upload ZIP with `manifest.json` at its root

## Developer Dashboard — manual before submission

- Register and verify the Chrome Web Store developer account
- Enable two-factor authentication, preferably with a security key
- Publish the privacy policy at a stable public HTTPS URL
- Paste the prepared listing, single-purpose statement, permission justifications, remote-code declaration, and reviewer instructions
- Upload `store-assets/promo-small-440x280.png`
- Capture and upload at least one actual 1280×800, square-corner, full-bleed product screenshot; three to five are preferable
- Use accurate screenshots showing the current release UI—do not use mockups as product screenshots
- Confirm distribution is free, choose countries/visibility, and disclose no in-app purchases
- Supply a monitored support URL and current developer contact email
- Test the final Store ZIP in current Chrome Stable on ordinary video, Shorts, fullscreen, theater mode, and keyboard-only navigation
- Submit with deferred publishing for a final post-review check

## Recommended screenshot set

1. Balanced ANSI conversion with the expanded accessible controls
2. Video 64 or Vector Lines with a vivid Burst palette
3. Side-by-side examples of 4:3 and 1:1 framing
4. Reactive aura/phosphor effect at a restrained intensity
5. Shorts playback with the minimized, non-overlapping control bar

## Official references

- https://developer.chrome.com/docs/webstore/program-policies
- https://developer.chrome.com/docs/webstore/best-practices
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/publish
