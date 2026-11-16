# Privacy Policy — SIE Study Blocker

**Effective date:** November 12, 2026

SIE Study Blocker ("the extension") is built to respect your privacy. It does **not** collect, store on any server, transmit, sell, or share any personal information. There is no account, no login, and no sync.

## What the extension stores

The extension does not store any information about you.

- **Your block list** — the only thing saved, using the browser's `chrome.storage.local` API on your device. It is the list of websites you chose to block: a setting, not personal information.
- **Study stats are not saved.** Your score, streak and the cards you have seen exist only while the study page is open and are gone when you close the tab.
- **The unlock timer is not saved to disk.** When you answer 5 questions correctly, the extension remembers when your 30-minute unlock ends using `chrome.storage.session`, which Chrome keeps in memory only. It is erased when the browser closes.

Nothing leaves your computer. Nothing is sent to the developer, to any server, or to any third party.

## What the extension does NOT do

- It does **not** collect personally identifiable information (name, email, address, etc.).
- It does **not** collect or store your browsing history. It only checks, on your device and in the moment, whether the page you are opening matches your block list — it does not record or transmit the sites you visit.
- It does **not** use analytics, tracking, advertising, or fingerprinting.
- It does **not** contain or load any remote code. All code and all question content is bundled inside the extension package.
- It does **not** sell or share data — because it has none to sell or share.

## Permissions

- **storage** — to save your block list on your device, and to hold the unlock timer in memory.
- **webNavigation** — to detect when you navigate to a site so the extension can check it against your block list. This check happens locally and is never logged or transmitted.
- **alarms** — to end the 30-minute unlock on time and return any open blocked tab to the study page.

## Data retention and deletion

The only saved data is your block list, kept in your browser under your control. Removing the extension from `chrome://extensions` deletes it. Versions before 1.3.0 saved study stats locally; version 1.3.0 deletes those saved stats automatically when it installs or updates.

## Contact

Questions or concerns? Open an issue at <https://github.com/cupOJoseph/SIE-blocker/issues>.

## Changes to this policy

If this policy changes, the updated version will be posted in this repository with a new effective date.
