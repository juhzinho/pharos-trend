# Pharos Trend

Live page: https://pharos-trend.vercel.app

Reads the FaroSwap 0.01% WPROS/USDC pool on Pacific and stores each check. The history names every check: open, step, flat, or spike. The trend locks once, on the check that finishes the rule. A spike stays stored and does not lock. The history and the lock stay in the browser after a reload, and the same block is not stored twice.

```bash
npm test
npm run web
```

Open http://localhost:3050. The example buttons fill the direction, the number of checks and the minutes. Check runs only from the Check button.
