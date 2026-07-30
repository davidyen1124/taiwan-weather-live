import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Taiwan weather loading shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/i);
  assert.match(html, /<title>台灣即時天氣｜逐時預報、空氣品質與雷達<\/title>/i);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /正在讀取最新天氣/);
  assert.match(html, /連線中央氣象資料中/);
});

test("ships the current location, mountain, advisory, and swipe parity features", async () => {
  const [
    paritySheets,
    advisoryScreen,
    bottomNavigation,
    weatherApp,
    weatherLibrary,
    detailSheets,
    mountainJson,
    districtJson,
  ] = await Promise.all([
    readFile(new URL("../app/components/ParitySheets.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/WeatherAdvisories.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/BottomNavigation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/WeatherApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/weather.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/DetailSheets.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/mountainLocations.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/cityDistricts.json", import.meta.url), "utf8"),
  ]);

  const mountainLocations = JSON.parse(mountainJson);
  const cityDistricts = JSON.parse(districtJson);
  const districtCount = cityDistricts.reduce(
    (total, city) => total + city.districts.length,
    0,
  );

  assert.equal(mountainLocations.length, 151);
  assert.equal(districtCount, 368);
  assert.match(paritySheets, /我目前的位置/);
  assert.match(paritySheets, /新增位置/);
  assert.match(paritySheets, /通知設定/);
  assert.match(paritySheets, /上移/);
  assert.match(paritySheets, /下移/);
  assert.match(paritySheets, /移除/);
  assert.match(weatherApp, /taiwan-weather\.locations\.v1/);
  assert.match(weatherLibrary, /"\/weather\/advisories"/);
  assert.match(advisoryScreen, /天氣警特報/);
  assert.match(advisoryScreen, /BottomNavigation/);
  assert.match(bottomNavigation, /預報/);
  assert.match(bottomNavigation, /圖資/);
  assert.match(bottomNavigation, /警特報/);
  assert.match(weatherLibrary, /FEELS_LIKE_COLOR_STOPS/);
  assert.match(detailSheets, /左右滑動切換日期/);
  assert.match(detailSheets, /今日逐時/);
  assert.match(detailSheets, /溫度排行/);
  assert.match(detailSheets, /onTouchStart/);
  assert.match(detailSheets, /onTouchEnd/);
});
