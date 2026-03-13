import { expect, type Page } from '@playwright/test';

export const createRootNoteFromEmptyState = async (
  page: Page
): Promise<{
  fileName: string;
  fileLabel: string;
}> => {
  await expect(page.getByTestId('vault-empty-create-note')).toBeVisible();
  await page.getByTestId('vault-empty-create-note').click();
  await expect(page.locator('.notion-like-editor')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Untitled' })).toHaveValue('NewFile');
  return {
    fileName: 'NewFile',
    fileLabel: 'NewFile.md',
  };
};
