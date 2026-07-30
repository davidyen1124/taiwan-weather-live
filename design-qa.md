# Taiwan Weather visual QA

## Sources

- Official developer home screenshot:
  `/tmp/taiwan-weather-reference.8r6VAg/landing-page-1.webp`
- Official developer AQI screenshot:
  `/tmp/taiwan-weather-reference.8r6VAg/landing-page-2.webp`
- Official App Store promotional screenshots:
  `/tmp/taiwan-weather-reference.8r6VAg/01-home.jpg` through
  `/tmp/taiwan-weather-reference.8r6VAg/05-radar.jpg`
- Static native UI evidence from the installed 1.7.2 app bundle
- Rendered mobile captures:
  `/tmp/taiwan-weather-final-home-local.png`,
  `/tmp/taiwan-weather-final-aqi-local-3.png`,
  `/tmp/taiwan-weather-after-radar-dark.png`,
  `/tmp/taiwan-weather-after-advisory-dark.png`,
  `/tmp/taiwan-weather-after-rainfall-dark.png`, and
  `/tmp/taiwan-weather-after-ranking-dark.png`
- Side-by-side source comparisons:
  `/tmp/taiwan-weather-home-side-by-side.png` and
  `/tmp/taiwan-weather-aqi-side-by-side-3.png`

## Viewports and states checked

- Mobile: 430 × 932 and 320 × 740
- Desktop phone shell: 1280 × 720
- Light and dark system appearance
- Home with district and mountain data
- Drawer menu and notification settings
- Location list, search, mountain result, edit/reorder/remove states
- Three root tabs, including live high-temperature advisories
- Seven-day daily/weekly modes
- 72-hour date, metric, and chart states
- AQI detail
- Hourly/30-day rainfall modes
- High-temperature/feels-like ranking modes
- Radar, rainfall-radar, duration, station, slider, and playback controls

## Comparison findings

- Home hierarchy, typography, metric cards, AQI card, hourly/daily previews,
  floating navigation, and weather artwork follow the official layout. The hero
  uses the six animation JSON files bundled in the installed app.
- The compiled 1.7.2 storyboard confirms a three-tab root structure. The web
  layout now uses `預報`, `圖資`, and `警特報`; the bell opens notification
  settings as indicated by the native selector.
- AQI matches the official reference composition: leading close control,
  pollutant heading/date, 3 × 2 pollutant grid, station heading, and map card.
  The non-native score and station-picker blocks were removed.
- Radar matches the official full-map composition with an overlaid rounded
  playback card, four duration segments, time range, slider, play/pause,
  jump-to-now, and floating root navigation.
- The catch-all observation page was removed. Rainfall and temperature rankings
  now use the separate screen structures identified in native class metadata.
- Live city, forecast, AQI, and advisory values differ from marketing screenshots
  because the web app displays current API data.
- Native-only screens without public screenshots (saved locations, search,
  notification settings, daily/hourly detail, rainfall, ranking, advisories)
  follow the compiled controller, field, selector, and storyboard evidence.
  They were not pixel-compared by launching the app, per the no-run constraint.
- No actionable P0, P1, or P2 visual defects, clipped controls, broken grids,
  overflow failures, or browser console errors remained after the final pass.

## Interaction result

- Three-tab navigation: passed
- Notification toggles: passed
- Add mountain: passed
- Persist and select location: passed
- Reorder location: passed
- Remove and re-add current location: passed
- Load live advisories: passed
- Switch seven-day mode: passed
- Change 72-hour date and metric: passed
- Switch rainfall range and select a bar: passed
- Switch temperature-ranking mode: passed
- Switch radar layer/duration and play/pause: passed
- Mobile and desktop responsive layout: passed
- Light and dark appearance: passed

Final result: passed
