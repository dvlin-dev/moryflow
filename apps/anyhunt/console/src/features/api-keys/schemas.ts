/**
 * [PROVIDES]: createApiKeySchema, createApiKeyDefaults, CreateApiKeyFormValues
 * [DEPENDS]: zod/v3
 * [POS]: API Key 表单校验规则（react-hook-form + zod）
 */
import { z } from 'zod/v3'

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
})

export type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>

export const createApiKeyDefaults: CreateApiKeyFormValues = {
  name: '',
}

