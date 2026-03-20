import crypto from 'node:crypto';
import os from 'node:os';
import { createDesktopStore } from '../storage/desktop-store.js';

export const DEVICE_CONFIG_STORE_NAME = 'device-config';

export interface DeviceConfig {
  deviceId: string;
  deviceName: string;
}

let store: ReturnType<typeof createDesktopStore<{ config: DeviceConfig }>> | null = null;

const getStore = () => {
  if (!store) {
    store = createDesktopStore<{ config: DeviceConfig }>({
      name: DEVICE_CONFIG_STORE_NAME,
      defaults: {
        config: {
          deviceId: crypto.randomUUID(),
          deviceName: os.hostname(),
        },
      },
    });
  }
  return store;
};

export const readDeviceConfig = (): DeviceConfig => getStore().get('config');

export const writeDeviceConfig = (config: DeviceConfig): void => {
  getStore().set('config', config);
};
