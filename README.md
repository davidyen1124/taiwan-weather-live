# 台灣即時天氣 🌦️

> 「比內建準很多！」 — the original app, about itself, very humbly

A web rebuild of the iOS app **天氣預報 – 台灣即時天氣預報**, recreated screen by screen
until our WebKit screenshots and the app's own screenshots stopped arguing with each other.
It is a plain Vite + React site with no server, no database, no login, and absolutely no
opinion about whether you should bring an umbrella. (Bring an umbrella. It's Taiwan.)

**Live:** https://davidyen1124.github.io/taiwan-weather-live/

![Light and dark screens](docs/screens.webp)

## What's inside

| Screen | What it does |
| --- | --- |
| 預報 | Swipeable pages per saved location, collapsing Lottie hero, 近一小時降雨 / 紫外線 / 體感溫度, AQI with advice, hourly strip, 生活建議 cards, 7-day list, rain/wind/pressure, sunrise–sunset arc |
| 7日預報 | 每日預報 (day/night) and 一週概況 (drag the chart, it's fun) |
| 72 小時預報 | 實際氣溫 / 體感溫度 / 蒲福風級 / 濕度 charts plus 降雨機率 |
| 圖資 | 雷達回波 playback on a map, 降雨雷達 (樹林 / 南屯 / 林園), 溫度分布圖 + 有多熱全國排行 |
| 警特報 | Active CWA advisories with an in-app web view |
| Drawer & 設定 | Add 368 districts or 151 mountains, reorder or delete them, pick light/dark, reorder or hide home sections |

Things deliberately left out: ads, the VIP paywall (every "VIP" feature here is free —
you're welcome), push notifications, widgets, Live Activities and the Apple Watch.
A website on your wrist is a cry for help.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173/taiwan-weather-live/. `npm run build` produces a static
`dist/` that any static host can serve; pushes to `main` deploy to GitHub Pages via
`.github/workflows/deploy.yml`.

## How "pixel parity" was measured (a.k.a. how many screenshots is too many)

1. The iPhone app was installed on an Apple Silicon Mac and every screen was captured in
   light and dark mode (58 captures).
2. Exact colors were read straight out of the app's `WeatherUIKit.ColorPalette`
   (including the AQI, UV and feels-like temperature scales), so `#F7F7F7` is not a guess.
3. A Playwright/WebKit harness renders the site at the same 393-pt width and scale, then
   diffs it against each capture. Fonts, offsets and chart geometry were nudged until the
   red pixels mostly went home. The remaining differences are the live weather itself,
   which refuses to hold still for screenshots.

## Data & credits

- Weather data: the `api.taiwanweather.app` API used by the original app, which aggregates
  中央氣象署 (CWA) and 環境部 open data.
- Map tiles: [OpenFreeMap](https://openfreemap.org) / © OpenMapTiles © OpenStreetMap contributors.
- Hero animations, weather icons, onboarding art and the app icon come from the original
  天氣預報 app by Shuttle Network Limited. They are theirs, not ours; this project is an
  unofficial fan rebuild and is not affiliated with them. If you're the developer and want
  something changed, open an issue and it will be changed faster than a 午後雷陣雨.

## FAQ

**Is it accurate?** It is exactly as accurate as the sky allows.

**Why is it called live?** Because 35° in September is, technically, still alive.

**Can I use it on desktop?** Yes. It politely pretends to be a phone.
