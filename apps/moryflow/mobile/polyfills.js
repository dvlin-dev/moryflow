import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  try {
    const { polyfillGlobal } = require('react-native/Libraries/Utilities/PolyfillFunctions');

    // structuredClone polyfill
    if (!('structuredClone' in global)) {
      const structuredCloneModule = require('@ungap/structured-clone');
      const structuredClonePolyfill = structuredCloneModule.default ?? structuredCloneModule;
      polyfillGlobal('structuredClone', () => structuredClonePolyfill);
    }

    // TextEncoderStream / TextDecoderStream polyfill
    if (!global.TextEncoderStream || !global.TextDecoderStream) {
      const { TextEncoderStream, TextDecoderStream } = require('@stardazed/streams-text-encoding');
      if (!global.TextEncoderStream) {
        polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
      }
      if (!global.TextDecoderStream) {
        polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
      }
    }

    // ReadableStream / TransformStream polyfill（@openai/agents-core 依赖）
    if (!global.ReadableStream || !global.TransformStream || !global.WritableStream) {
      const {
        ReadableStream,
        TransformStream,
        WritableStream,
        ReadableStreamDefaultController,
      } = require('web-streams-polyfill');
      if (!global.ReadableStream) {
        polyfillGlobal('ReadableStream', () => ReadableStream);
      }
      if (!global.TransformStream) {
        polyfillGlobal('TransformStream', () => TransformStream);
      }
      if (!global.WritableStream) {
        polyfillGlobal('WritableStream', () => WritableStream);
      }
      if (!global.ReadableStreamDefaultController && ReadableStreamDefaultController) {
        polyfillGlobal('ReadableStreamDefaultController', () => ReadableStreamDefaultController);
      }
    }
  } catch (e) {
    console.warn('[Polyfills] Setup failed:', e);
  }
}

export {};
