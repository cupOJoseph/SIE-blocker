# SIE Study Blocker

Chrome extension that blocks distracting websites and replaces them with random SIE (Securities Industry Essentials) exam study questions. Get 5 right and the blocked sites open for 30 minutes. Get distracted, get educated.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![License: MIT](https://img.shields.io/badge/License-MIT-green)

If you find any mistakes in the questions, please [open an issue](https://github.com/cupOJoseph/SIE-blocker/issues). The bank contains 490 original questions grounded in the official FINRA SIE content outline and primary sources (FINRA, SEC, and IRS materials). There could still be mistakes, and we waive all liability related to accuracy — use at your own risk, and verify current figures against official sources before your exam date. I'm pretty certain they are all correct though.

## How it works

1. You navigate to x.com, twitter.com, or any site on your blocklist.
2. The extension intercepts the navigation and shows a random flashcard — multiple choice or type-in — with the answer and an explanation once you check it.
3. Hit **Next card** (or press Enter/Space) for another one. Answer order is shuffled every time.
4. Get **5 correct** and the blocked sites unlock for **30 minutes**. Hit **Go to x.com** to head back where you were going.
5. When the 30 minutes are up, any open blocked tab returns to the study page and the count starts over.

**No storage of your info.** Score and streak exist only while the study tab is open. The unlock timer is held in memory (`chrome.storage.session`) and is gone when Chrome closes. The only thing saved to disk is your blocklist.

## Install (load unpacked)

1. Clone or download this repo.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** and select this folder.
5. Try visiting x.com.

## Settings

Right-click the extension icon → **Options** (or click "Settings" on the block page):

- **Blocked sites** — add more domains to the blocklist (subdomains are covered automatically). **Add-only by design:** there is no remove button, so Future You can't negotiate their way back to the feed. Removing a site requires reinstalling the extension.

## The question bank

`questions.json` contains **490 original questions** covering all four sections of the FINRA SIE content outline, weighted roughly to the real exam:

| Section | Exam weight | Questions here |
|---|---|---|
| Knowledge of Capital Markets | 16% | 70 |
| Understanding Products and Their Risks | 44% | 242 |
| Trading, Customer Accounts & Prohibited Activities | 31% | 130 |
| Overview of the Regulatory Framework | 9% | 48 |

**Accuracy & provenance:** All questions were written from scratch (original wording — no copied content from commercial prep providers) and grounded in:

- The official [FINRA SIE content outline](https://www.finra.org/enroll-exam/sie) (75 scored questions + 5 unscored pretest, 1 hr 45 min, passing score 70).
- Primary sources for numeric facts, verified July 2026 — including 2026 IRS limits (IRA contribution $7,500; annual gift-tax exclusion $19,000) and current regulatory thresholds (Reg T 50%, SIPC $500k/$250k cash, FDIC $250k, accredited investor tests, etc.).

Tax-law numbers change annually; questions that depend on them say "2026" explicitly so future maintainers know what to update.

### Question schema

```json
{
  "id": 42,
  "section": "Understanding Products and Their Risks",
  "topic": "Municipal bonds",
  "type": "multiple_choice",
  "question": "…",
  "choices": ["…", "…", "…", "…"],
  "answer": 2,
  "explanation": "…"
}
```

Type-in questions use `"type": "type_in"`, a string `answer`, and an `accepted` array of tolerated variants (grading normalizes case, `$`, `%`, and commas).

## Project structure

```
manifest.json    Manifest V3 config (webNavigation, storage, alarms permissions)
background.js    Service worker: blocks sites, holds the 30-minute unlock in memory
blocked.html/css/js   The flashcard page and unlock meter
options.html/js  Settings page
questions.json   The 490-question bank
data/            The bank split by section (source of truth for edits)
scripts/         merge-questions.js rebuilds questions.json from data/
icons/           Extension icons
```

## Contributing

PRs welcome — especially new questions. Add them to the right file in `data/`, keep wording original, cite a primary source in your PR description, and rebuild the merged bank with:

```
node scripts/merge-questions.js
```

## Privacy

SIE Study Blocker collects and stores no information about you. The only thing saved is your block list, in your browser on your machine — full details in [PRIVACY.md](PRIVACY.md). No remote code, no analytics, no tracking.

## Disclaimer

This is a study aid, not exam prep advice, and it is not affiliated with or endorsed by FINRA. Verify current figures against official sources before your exam date.

## License

MIT — see [LICENSE](LICENSE).
