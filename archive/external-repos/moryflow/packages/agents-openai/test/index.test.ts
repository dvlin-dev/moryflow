import { describe, test, expect } from 'vitest';
import { OpenAIProvider } from '../src';

describe('Exports', () => {
  test('OpenAIProvider is out there', () => {
    const provider = new OpenAIProvider();
    expect(provider).toBeDefined();
  });
});
