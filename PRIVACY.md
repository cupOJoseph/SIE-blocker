# Privacy Policy — SIE Study Blocker

**Effective date:** July 20, 2026

SIE Study Blocker ("the extension") is built to respect your privacy. It does **not** collect, store on any server, transmit, sell, or share any personal information. There is no account, no login, and no sync.

## What the extension stores

The extension saves a small amount of information **locally on your device only**, using the browser's `chrome.storage.local` API:

- **Your block list** — the websites you have chosen to block.
- **Your study stats** — how many questions you have answered, how many you got right, your current streak, and the IDs of the most recently shown cards (so questions don't repeat back-to-back).

This information never leaves your computer. It is not sent to the developer, to any server, or to any third party.

## What the extension does NOT do

- It does **not** collect personally identifiable information (name, email, address, etc.).
- It does **not** collect or store your browsing history. It only checks, on your device and in the moment, whether the page you are opening matches your block list — it does not record or transmit the sites you visit.
- It does **not** use analytics, tracking, advertising, or fingerprinting.
- It does **not** contain or load any remote code. All code and all question content is bundled inside the extension package.
- It does **not** sell or share data — because it has none to sell or share.

## Permissions

- **storage** — to save your block list and study stats locally on your device.
- **webNavigation** — to detect when you navigate to a site so the extension can check it against your block list. This check happens locally and is never logged or transmitted.

## Data retention and deletion

All data lives in your browser's local storage, under your control. You can clear it at any time:

- Use **Reset all-time stats** on the extension's options page to clear your study stats, or
- Remove the extension from `chrome://extensions`, which deletes all of its local data.

## Contact

Questions or concerns? Open an issue at <https://github.com/cupOJoseph/SIE-blocker/issues>.

## Changes to this policy

If this policy changes, the updated version will be posted in this repository with a new effective date.
