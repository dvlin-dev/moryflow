import { z } from 'zod/v3';

export const endpointFormSchema = z.object({
  accountId: z.string().trim().min(1, 'Account ID is required.'),
  chatId: z.string().trim().min(1, 'Chat ID is required.'),
  threadId: z.string().trim().optional(),
  label: z.string().trim().min(1, 'Label is required.'),
});

export type EndpointFormValues = z.infer<typeof endpointFormSchema>;

export const createEndpointFormDefaults = (): EndpointFormValues => ({
  accountId: 'default',
  chatId: '',
  threadId: '',
  label: '',
});
