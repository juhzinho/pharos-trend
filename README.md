# Pharos Trend

Live page: https://pharos-trend.vercel.app

Reads the FaroSwap 0.01% WPROS/USDC pool on Pacific and stores each check. The rule is the direction, at least 3 checks in a row, and a minimum number of minutes the run must cover. One move does not confirm it. The history and the confirmation stay in the browser after a reload, and the same block is not stored twice.

```bash
npm test
npm run web
```

Open http://localhost:3050. The example buttons fill the direction, the number of checks and the minutes. Check runs only from the Check button.
