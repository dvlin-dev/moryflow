import { describe, expect, it } from 'vitest';
import { buildBrowserContextOptions } from './browser-context-options';

const createBaseValues = (): Parameters<typeof buildBrowserContextOptions>[0] => ({
  viewportWidth: 1280,
  viewportHeight: 800,
  device: ' Desktop Chrome ',
  userAgent: ' Custom UA ',
  locale: ' en-US ',
  timezoneId: ' America/Los_Angeles ',
  colorScheme: 'light',
  reducedMotion: 'no-preference',
  offline: false,
  permissionsJson: '',
  headersJson: '',
  geolocationLat: undefined,
  geolocationLng: undefined,
  geolocationAccuracy: undefined,
  httpUsername: '',
  httpPassword: '',
  acceptDownloads: true,
  recordVideoEnabled: false,
  recordVideoWidth: undefined,
  recordVideoHeight: undefined,
});

describe('buildBrowserContextOptions', () => {
  it('builds context options with base options and normalized fields', () => {
    const values = createBaseValues();
    values.permissionsJson = '["clipboard-read"]';
    values.headersJson = '{"x-test":"1"}';
    values.geolocationLat = 10;
    values.geolocationLng = 20;
    values.geolocationAccuracy = 1;
    values.httpUsername = 'user';
    values.httpPassword = 'pass';
    values.recordVideoEnabled = true;
    values.recordVideoWidth = 1024;
    values.recordVideoHeight = 768;

    const { options, errors } = buildBrowserContextOptions(values, {
      timeout: 300000,
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
    });

    expect(errors).toEqual([]);
    expect(options).toMatchObject({
      timeout: 300000,
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
      device: 'Desktop Chrome',
      userAgent: 'Custom UA',
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      offline: false,
      acceptDownloads: true,
      permissions: ['clipboard-read'],
      headers: { 'x-test': '1' },
      geolocation: { latitude: 10, longitude: 20, accuracy: 1 },
      httpCredentials: { username: 'user', password: 'pass' },
      recordVideo: { enabled: true, width: 1024, height: 768 },
    });
  });

  it('returns permissionsJson error when permissions is invalid JSON array', () => {
    const values = createBaseValues();
    values.permissionsJson = '{"invalid":"object"}';

    const { options, errors } = buildBrowserContextOptions(values);

    expect(options).toBeNull();
    expect(errors).toEqual([{ field: 'permissionsJson', message: 'Invalid JSON array' }]);
  });

  it('returns geolocation error when latitude and longitude are incomplete', () => {
    const values = createBaseValues();
    values.geolocationLat = 12;

    const { options, errors } = buildBrowserContextOptions(values);

    expect(options).toBeNull();
    expect(errors).toEqual([
      { field: 'geolocation', message: 'Latitude and longitude are required' },
    ]);
  });

  it('returns httpCredentials error when username/password are incomplete', () => {
    const values = createBaseValues();
    values.httpUsername = 'user-only';

    const { options, errors } = buildBrowserContextOptions(values);

    expect(options).toBeNull();
    expect(errors).toEqual([
      { field: 'httpCredentials', message: 'Username and password are required' },
    ]);
  });
});
