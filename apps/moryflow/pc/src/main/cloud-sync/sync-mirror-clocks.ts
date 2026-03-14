import {
  incrementClock as sharedIncrementClock,
  mergeVectorClocks,
} from '@moryflow/sync';

export const incrementClock = sharedIncrementClock;
export const mergeClocks = mergeVectorClocks;
