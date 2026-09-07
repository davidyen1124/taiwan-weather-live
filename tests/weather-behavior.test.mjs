import test from 'node:test';
import assert from 'node:assert/strict';
import { reading, framesWithinHours, uvCategory, aqiStatus, fetchWeatherBundle } from '../app/lib/weather.ts';
import { parsePreferences, moveSection, HOME_SECTIONS } from '../app/lib/preferences.ts';

test('missing readings cannot masquerade as zero; cold temperatures remain valid', () => {
  for (const value of [-99, -999, null, undefined, NaN, Infinity]) assert.equal(reading(value), null);
  assert.equal(reading(-12), -12);
  assert.equal(reading(0, true), 0);
  assert.equal(reading(-1, true), null);
  assert.equal(aqiStatus(-1).label, '暫無資料');
  assert.equal(uvCategory(7), '高量級');
  assert.equal(uvCategory(11), '危險級');
});

test('radar time windows are timestamp based for irregular and two-minute frames', () => {
  const frames = [0, 2, 30, 60, 62, 90].map(min => ({ dateTime: new Date(Date.UTC(2026, 8, 7, 0, min)).toISOString() }));
  assert.deepEqual(framesWithinHours(frames, 1), frames.slice(2));
  assert.deepEqual(framesWithinHours([], 12), []);
});

test('preference recovery keeps each section once and rejects invalid settings', () => {
  const p = parsePreferences({ order: ['sun', 'sun', 'bad'], hidden: ['hourly', 'bad'], theme: 'bad', digestTime: '29:77' });
  assert.equal(p.order[0], 'sun');
  assert.deepEqual([...p.order].sort(), [...HOME_SECTIONS].sort());
  assert.deepEqual(p.hidden, ['hourly']);
  assert.equal(p.digestTime, '07:30');
  assert.equal(p.theme, 'system');
  assert.deepEqual(moveSection(p.order, 'sun', -1), p.order);
  const moved = moveSection(p.order, 'sun', 1);
  assert.equal(moved[1], 'sun');
  assert.equal(p.order[0], 'sun');
});

test('AQI and rainfall outages do not blank a successful forecast', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).includes('/weather/forecast?')) return Response.json({ locationId: 'test', locationName: '大安區', city: '臺北市', hourly: [{ temperature: 30, feelsLike: 33, time: '2026-09-07T12:00:00+08:00' }], daily: [], dailySegments: [] });
    return new Response('unavailable', { status: 503 });
  };
  try {
    const bundle = await fetchWeatherBundle({ latitude: 25, longitude: 121 });
    assert.equal(bundle.forecast.locationName, '大安區');
    assert.equal(bundle.heat.feelsLike, 33);
    assert.equal(reading(bundle.aqi.aqi, true), null);
    assert.equal(reading(bundle.observation.humidity, true), null);
    assert.equal(bundle.unavailable.length, 4);
    assert.deepEqual(bundle.hourlyRainfall.hourlyRainfall, []);
  } finally { globalThis.fetch = original; }
});
