// test/fixtures/content-extraction/golden.schema.ts
import { z } from 'zod';

/**
 * Schema for content extraction test fixtures
 * Each fixture contains synthetic HTML and expected extraction results
 */
export const ContentFixtureSchema = z.object({
  // Unique identifier for this fixture
  id: z.string(),

  // Description of what this fixture tests
  description: z.string(),

  // Mock URL for this page
  url: z.string().url(),

  // Synthetic HTML content
  html: z.string(),

  // Expected extraction results
  expected: z.object({
    // Strings that must be present in extracted content (case-insensitive)
    mustContain: z.array(z.string()),

    // Strings that must NOT be present (noise indicators)
    mustNotContain: z.array(z.string()),

    // Minimum content length after extraction
    minLength: z.number().int().positive(),

    // Maximum content length (to detect full body return)
    maxLength: z.number().int().positive(),
  }),

  // Metadata about the fixture
  metadata: z.object({
    category: z.enum([
      'minimalistic',
      'blog',
      'docs',
      'portfolio',
      'ecommerce',
      'spa',
    ]),
    hasNavigation: z.boolean(),
    hasFooter: z.boolean(),
    hasSidebar: z.boolean().optional(),
  }),
});

export type ContentFixture = z.infer<typeof ContentFixtureSchema>;

/**
 * Helper function to validate a fixture
 */
export function validateFixture(fixture: unknown): ContentFixture {
  return ContentFixtureSchema.parse(fixture);
}

/**
 * Helper function to run assertions on extracted content
 */
export function assertContentMatches(
  extracted: string,
  expected: ContentFixture['expected'],
): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  const lowerExtracted = extracted.toLowerCase();

  // Check mustContain
  for (const text of expected.mustContain) {
    if (!lowerExtracted.includes(text.toLowerCase())) {
      errors.push(`Missing expected content: "${text}"`);
    }
  }

  // Check mustNotContain
  for (const noise of expected.mustNotContain) {
    if (lowerExtracted.includes(noise.toLowerCase())) {
      errors.push(`Found unexpected noise: "${noise}"`);
    }
  }

  // Check length bounds
  if (extracted.length < expected.minLength) {
    errors.push(
      `Content too short: ${extracted.length} < ${expected.minLength}`,
    );
  }
  if (extracted.length > expected.maxLength) {
    errors.push(
      `Content too long: ${extracted.length} > ${expected.maxLength}`,
    );
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
