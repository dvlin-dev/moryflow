import { Platform } from 'react-native'

if (Platform.OS !== 'web') {
  const setupPolyfills = async () => {
    try {
      const { polyfillGlobal } = await import('react-native/Libraries/Utilities/PolyfillFunctions')

      // structuredClone polyfill
      if (!('structuredClone' in global)) {
        const { default: structuredClonePolyfill } = await import('@ungap/structured-clone')
        polyfillGlobal('structuredClone', () => structuredClonePolyfill)
      }

      // TextEncoderStream / TextDecoderStream polyfill
      const { TextEncoderStream, TextDecoderStream } = await import(
        '@stardazed/streams-text-encoding'
      )
      polyfillGlobal('TextEncoderStream', () => TextEncoderStream)
      polyfillGlobal('TextDecoderStream', () => TextDecoderStream)
    } catch (e) {
      console.warn('[Polyfills] Setup failed:', e)
    }
  }

  setupPolyfills()
}

export {}
