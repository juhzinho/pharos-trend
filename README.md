# Pharos Trend

Live page: https://pharos-trend.vercel.app

Reads the FaroSwap 0.01% WPROS/USDC pool on Pacific and stores each check. The trend is confirmed only after the chosen number of checks in a row, and that number is at least 3. One move does not confirm it. The history stays in the browser after a reload, and the same block is not stored twice.

```bash
npm test
npm run web
```

Open http://localhost:3050. The example buttons fill the direction and the number of checks. Check runs only from the Check button.
