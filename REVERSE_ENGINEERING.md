# 天氣預報 1.7.2 static audit and web parity

## Scope and safety

The installed App Store application at
`/Applications/天氣預報.app/Wrapper/WeatherApp.app` was inspected statically.
Its executable was never launched. The audit used bundle metadata, linked
framework metadata, Objective-C/Swift symbols and strings, asset-catalog
metadata, bundled JSON, and the app's public App Store/developer pages.

Installed build:

- Bundle identifier: `project-fi.WeatherApp`
- Version: `1.7.2` (build `78`)
- App Store item: `6762736722`
- Developer: Shuttle Network Limited

## What the web project already covered

The existing site already implemented the app's primary forecast experience:

- Home/current conditions
- Seven-day forecast
- 72-hour charts
- AQI detail and station map
- Rainfall, heat, temperature ranking, and radar views

## Screens and behaviors that were missing

The most important 1.7.2 gap was the app's `我目前的位置` flow. Static class
metadata identifies `SavedLocationsViewController`,
`LocationsSearchViewController`, city/district selection, and mountain search.
The 1.7.2 release note explicitly adds remove, add, and reorder behavior.

The web project now includes:

- `我目前的位置` saved-location manager
- Add, remove, select, and reorder controls
- Browser-persisted location order and active selection
- Search across 368 districts and all 151 bundled mountain locations
- Mountain forecasts with a fallback for the API's unavailable heat-ranking card
- A native root-level `警特報` tab backed by `/v1/weather/advisories`
- The installed build's three-tab structure: `預報`, `圖資`, and `警特報`
- Home-screen forecast-digest/notification settings and tappable location title
- Drawer-style feature menu matching the native controller structure
- 72-hour day switching by tabs and horizontal swipe
- 1.7.2-style continuous feels-like color thresholds
- Separate native-style rainfall and temperature-ranking detail screens
- Native bundled hero animations for sun, cloud, rain, moon, and mixed states

The three tabs were recovered directly from the compiled storyboard. Their
unselected/selected SF Symbol names are `house`/`house.fill`, `map`/`map.fill`,
and `info.triangle`/`info.triangle.fill`. This also establishes that the home
bell is not the advisory center: the bell is wired to
`Clicked_ForecastDigestBell_Button`, while advisories have their own root
controller and tab.

## Static feature inventory

The native bundle also identifies:

- Weather advisory center
- Daily and hourly forecast detail
- AQI detail and AQI map
- Rainfall detail
- Radar and rainfall-radar maps
- Temperature ranking
- Notification settings and forecast-digest settings
- Home-section ordering
- Widgets, Apple Watch, complications, and Live Activities
- Subscription/VIP and advertising infrastructure

The web app now covers every phone-screen flow represented in the existing web
experience and the newly recovered advisory/location flows. Apple-only surfaces
(widgets, Watch, complications, and native background push delivery) cannot
have literal browser parity. Live Activity is represented in notification
settings, but its operating-system surface remains native-only.

## Data and API evidence

The native bundle contains:

- `mountainLocations.json`: 151 entries
- `cityDistricts.json`: 368 districts
- API base string: `http://api.taiwanweather.app/v1/`
- Advisory endpoint: `/weather/advisories`
- Forecast, observation, AQI, rainfall, heat-card, radar-image, temperature-image,
  top-100, leaderboard, notification, and Live Activity endpoint strings

The web implementation continues to use the HTTPS API base.

## Public references

- App Store: https://apps.apple.com/tw/app/id6762736722
- Developer site: https://taiwanweather.app/
