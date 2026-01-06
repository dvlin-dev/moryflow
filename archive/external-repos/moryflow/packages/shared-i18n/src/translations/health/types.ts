import en from './en'

type DotPrefix<T extends string> = T extends '' ? '' : `${T}.`

type KeyToString<K> = K extends string | number ? `${K}` : never

type DeepKeyOf<T, Prefix extends string = ''> = T extends string
  ? Prefix
  : {
      [K in keyof T]: T[K] extends string
        ? `${DotPrefix<Prefix>}${KeyToString<K>}`
        : DeepKeyOf<T[K], `${DotPrefix<Prefix>}${KeyToString<K>}`>
    }[keyof T]

export type HealthTranslationKeys = DeepKeyOf<typeof en>
