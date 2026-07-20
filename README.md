# SIE Study Blocker

Chrome extension that blocks distracting websites and replaces them with random SIE (Securities Industry Essentials) exam study questions. Answer correctly and you earn a timed browsing pass. Get distracted, get educated.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![License: MIT](https://img.shields.io/badge/License-MIT-green)

If you find any mistakes in the questions, please [open an issue](https://github.com/cupOJoseph/SIE-blocker/issues). The bank contains 180 original questions grounded in the official FINRA SIE content outline and primary sources (FINRA, SEC, and IRS materials). There could still be mistakes, and we waive all liability related to accuracy — use at your own risk, and verify current figures against official sources before your exam date. I'm pretty certain they are all correct though.

## How it works

1. You navigate to x.com, twitter.com, or any site on your blocklist.
2. The extension intercepts the navigation and shows a random flashcard — multiple choice or type-in.
3. Answer correctly (configurable: 1–5 correct required) and you get a browsing pass (default 10 minutes, configurable 1–120).
4. When the pass expires, the next visit shows a new card.

Session stats, all-time accuracy, and answer streaks are tracked locally via `chrome.storage.local`. Nothing leaves your machine.

## Install (load unpacked)

1. Clone or download this repo.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** and select this folder.
5. Try visiting x.com.

## Settings

Right-click the extension icon → **Options** (or click "Settings" on the block page):

- **Pass duration** — minutes of browsing earned per unlock (1–120, default 10).
- **Correct answers required** — cards you must get right per unlock (1–5, default 1).
- **Blocked sites** — add more domains to the blocklist (subdomains are covered automatically). **Add-only by design:** there is no remove button, so Future You can't negotiate their way back to the feed. Removing a site requires reinstalling the extension.
- **Reset all-time stats** — clears accuracy and streak counters.

## The question bank

`questions.json` contains **180 original questions** covering all four sections of the FINRA SIE content outline, weighted roughly to the real exam:

| Section | Exam weight | Questions here |
|---|---|---|
| Knowledge of Capital Markets | 16% | 30 |
| Understanding Products and Their Risks | 44% | 82 |
| Trading, Customer Accounts & Prohibited Activities | 31% | 50 |
| Overview of the Regulatory Framework | 9% | 18 |

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
manifest.json    Manifest V3 config (webNavigation + storage permissions)
background.js    Service worker: intercepts navigation to blocked sites
blocked.html/css/js   The flashcard gate page
options.html/js  Settings page
questions.json   The 180-question bank
data/            The bank split by section (source of truth for edits)
scripts/         merge-questions.js rebuilds questions.json from data/
icons/           Extension icons
```

## Contributing

PRs welcome — especially new questions. Add them to the right file in `data/`, keep wording original, cite a primary source in your PR description, and rebuild the merged bank with:

```
node scripts/merge-questions.js
```

## Disclaimer

This is a study aid, not exam prep advice, and it is not affiliated with or endorsed by FINRA. Verify current figures against official sources before your exam date.

## License

MIT — see [LICENSE](LICENSE).
