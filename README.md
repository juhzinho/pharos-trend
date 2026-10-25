# Pharos Trend

Live page: https://pharos-trend.vercel.app

Reads the FaroSwap 0.01% WPROS/USDC pool on Pacific and stores each check. When the rule is met, that run freezes: the first check, each step, and the lock, with the minutes between them. A later check stays outside the window. A run that breaks is kept, with the block where it stopped. The history, the window, and the broken run stay in the browser after a reload, and the same block is not stored twice.

```bash
npm test
npm run web
```

Open http://localhost:3050. The example buttons fill the direction, the number of checks and the minutes. Check runs only from the Check button.
