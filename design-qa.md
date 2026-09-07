# Taiwan Weather web QA — 2026-09-06

## Result

Web build and checked browser flows: **passed**.
Full native feature and pixel parity: **not verified**.

The existing Site was compared with publicly available developer screenshots
and published app captures. The native app could not be acquired or launched.
An automatic browser review blocked the App Store handoff. Historical native
bundle assertions in the previous audit are not newly verified evidence.
See REVERSE_ENGINEERING.md.

## Automated checks

- npx tsc --noEmit: passed.
- npm run build: passed, including production Worker and browser bundles.
- node --experimental-strip-types --test tests/*.test.mjs: 5 tests passed.
- Tests cover Worker SSR, missing-reading/UV behavior, irregular radar frame
  intervals, preference repair/order boundaries, and partial API failure.
- git diff --check: passed.

## Browser checks

- 430 × 932 mobile, 320 × 740 narrow mobile, and 1280 × 720 desktop.
- Light/dark preferences survive reload.
- Home section move, hide, persistence, and reset verified.
- Saved-location search exposes 368 districts; mountain search filters the
  151-entry dataset (eight results for 玉山).
- A selected seven-day home row opens the same date in detail.
- Hourly chart selection updates temperature/wind, time, rain, and supporting
  conditions together. Arrow-key selection and Escape dismissal checked.
- Modal focus is isolated; background is inert and focus returns on close.
- AQI layout checked; missing PM10 displayed as --.
- Rainfall today and 30-day modes display their own observation stations.
- National radar playback, latest selection, duration and geographic zoom
  checked. Rainfall radar station changes checked for 樹林, 南屯 and 林園.
- Advisory empty state checked against the live response.
- Notification UI and digest preview checked. No OS permission was requested,
  and actual notification delivery is not claimed as tested.
- Development HMR produced temporary errors during editing; these were
  resolved before final checks. No new runtime errors were observed in the
  checked flows after the completed source loaded.

## Visual iterations

1. Replaced the home weekly strip with source-aligned daily rows, observation
   cards and a sunrise/sunset chart. Added an actual saved-location pager.
2. Replaced decorative hourly bars with selectable data curves and synchronized
   rainfall. Compacted wind/humidity headers to follow the available captures.
3. Adjusted AQI heading, pollutant typography, card height, spacing and map size
   after side-by-side comparison.
4. Corrected the radar/map separation: one Leaflet map now transforms both
   geography and the radar overlay. Station rasters preserve their own aspect.
5. Fixed explicit dark appearance, dimmed inactive AQI segments, and checked
   small-screen control wrapping and desktop shell containment.

## Captured evidence

Local evidence directory:
/Users/david/Projects/.codex-tmp/weather-reference/

- Final hourly comparison: comparison-hourly-final.png
- Final AQI comparison: comparison-aqi-final.png
- Final individual views: after-hourly-final-light.png, after-aqi-final.png
- Other checked states: after-order-320.png, after-rainfall-radar.png,
  after-desktop.png

Public comparison captures were cropped to the relevant phone and resized to
430 px width; original aspect ratios were preserved. Extra canvas was padded.
Native and web captures use different dates and live values, so no numeric
pixel-difference score is meaningful.

Remaining differences include native map styling, typography metrics, chart
axes and drawing details, some toolbar placement, animation state, and screens
without a complete public reference. Widgets, Watch, Live Activities, native
background push, subscription and advertising flows remain outside the
implemented web feature set. Deployment updates the existing Site; it does not
certify that these gaps are closed.
