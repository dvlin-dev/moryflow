import type { EditModelInitialData } from './edit-model-dialog';

export type ProviderTestStatus = 'idle' | 'testing' | 'success' | 'error';

export type ProviderModelView = EditModelInitialData & {
  shortName?: string;
};
