// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslateFunction = (key: any) => string

export const getOpenButtonLabel = (isPickingVault: boolean, t: TranslateFunction) =>
  isPickingVault ? t('opening') : t('open')

export const getCreateButtonLabel = (isPickingVault: boolean, t: TranslateFunction) =>
  isPickingVault ? t('creating') : t('create')

