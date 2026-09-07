# Taiwan Weather reference audit — 2026-09-06

## Evidence and limits

The requested App Store item is an iOS application, not an Android APK. No APK
or iOS executable was downloaded or reverse engineered during this revision.
The browser's automatic review blocked the App Store handoff. The previously
documented /Applications/天氣預報.app/Wrapper/WeatherApp.app is not present in
this environment. Earlier claims about static inspection are inherited project
history, not independently verified evidence for this revision.

This revision inspects the existing Site, its source and data files, the public
App Store/developer pages, and available screen images. An accessible iOS build
or a complete screen recording is still needed to inventory every native flow
and compare identical screen states. Full feature parity and pixel perfection
are **not verified**.

## Reference sources

- [App Store listing](https://apps.apple.com/tw/app/id6762736722)
- [Developer site](https://taiwanweather.app/)
- [Developer home reference](https://taiwanweather.app/landing-page-1.webp)
- [Developer AQI reference](https://taiwanweather.app/landing-page-2.webp)
- [Additional published screen captures](https://cjay.cc/2026/07/taiwanweather-app/)
- [CWA radar product documentation](https://opendata.cwa.gov.tw/opendatadoc/MSC/A0058.pdf)
- [Leaflet image overlay documentation](https://leafletjs.com/reference.html#imageoverlay)

The existing source includes six weather animation assets, 151 mountain
locations, and 368 districts. These assets were retained; no new extraction
from an app binary occurred. The three existing root tabs were preserved.

## Screen and feature coverage

| Screen or feature | Current web behavior | Reference/verification limits |
| --- | --- | --- |
| Forecast home | Live conditions, UV, rain probability, feels-like, AQI, hourly preview, seven-day rows, observations, sunrise/sunset | Public composition reviewed; live data and animation state differ |
| Saved locations | Add, select, remove, reorder, persistence, home pager and swipe | Existing flow retained; search now exposes all 368 districts and 151 mountains |
| Seven-day detail | Daily/weekly modes; home date opens matching date | Date selection checked; full native state inventory unavailable |
| 72-hour detail | Real temperature, feels-like, wind and humidity curves; synchronized rain/time selection; keyboard/touch controls | Compared to public captures; charts, fonts and data are not identical |
| AQI detail | Six pollutant cards, observation time, station map | Public screenshot comparison; OpenStreetMap differs from native Apple Maps |
| Rainfall | Hourly and 30-day records, selectable bars, station context | Both modes checked against live responses and public composition |
| Radar | Map pan/zoom with coupled radar overlay, timestamp windows, playback, latest frame | Uses CWA nearby-Taiwan bounds for the derivative product; exact derivative georeferencing remains an assumption |
| Rainfall radar | Station selection and playback using the complete published raster | Separate station rasters include their own geography and legend |
| Temperature/ranking | Existing temperature layer and ranking modes retained | No complete native interaction reference available |
| Advisories | Live active advisories, scope controls, explicit empty/error states | Empty state checked; did not fabricate an active alert |
| Appearance | System/light/dark preference persisted across reload | Browser verified; exact native settings appearance unavailable |
| Home section order | Reorder, hide/show, reset; persisted across reload | Browser verified; exact native settings appearance unavailable |
| Forecast digest/advisory notifications | Permission-based browser notifications while the page is open, persistent preferences and deduplication | OS permission and delivery were not exercised; background/closed-page delivery is not implemented |
| iOS widgets, Watch, complications, Live Activities | Settings explain the native requirement and link to the original app | Native-only surfaces are not implemented in this Site |
| Subscription, VIP, ads | Not implemented | Purchase/account/backend contracts and full native flows unavailable |

## Data behavior

The Site continues using the public HTTPS API at
https://api.taiwanweather.app/v1. Forecast is required; missing optional
observations, AQI, or rainfall no longer blank the entire forecast. Missing
measurements are rendered as --, not zero or a negative sentinel. UV and AQI
categories now follow measured values. Requests time out after 20 seconds.

Radar time windows are selected by frame timestamps instead of assuming every
feed uses a ten-minute interval. National radar and map now share one geographic
transform; station rainfall products retain their complete source image.

## Completion status

The web improvements passed the checks in design-qa.md and are ready for the
user's requested deployment. Complete native parity remains blocked on a usable
native build or comprehensive screen recording. This revision should not be
described as a complete binary reverse engineering or pixel-perfect replica.
