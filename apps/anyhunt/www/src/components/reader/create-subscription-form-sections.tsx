import type { UseFormReturn } from 'react-hook-form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Textarea,
  Button,
} from '@moryflow/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CRON_PRESETS, TIMEZONES } from '@/features/digest/constants';
import type { CreateSubscriptionFormValues } from './subscription-form-schema';
interface CreateSubscriptionFormSectionProps {
  form: UseFormReturn<CreateSubscriptionFormValues>;
}
interface CreateSubscriptionAdvancedSectionProps extends CreateSubscriptionFormSectionProps {
  showAdvanced: boolean;
  onShowAdvancedChange: (open: boolean) => void;
}
export function CreateSubscriptionBasicFields({ form }: CreateSubscriptionFormSectionProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="AI Industry News" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="topic"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Topic Keywords</FormLabel>
            <FormControl>
              <Input placeholder="artificial intelligence, machine learning, LLM" {...field} />
            </FormControl>
            <FormDescription>Keywords used for searching content</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interests"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Interest Tags</FormLabel>
            <FormControl>
              <Textarea
                placeholder="GPT, Claude, Gemini, open source models"
                className="resize-none"
                rows={2}
                {...field}
              />
            </FormControl>
            <FormDescription>Comma-separated tags for scoring and filtering</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function CreateSubscriptionAdvancedSection({
  form,
  showAdvanced,
  onShowAdvancedChange,
}: CreateSubscriptionAdvancedSectionProps) {
  const AdvancedToggleIcon = showAdvanced ? ChevronDown : ChevronRight;

  return (
    <>
      <Separator />

      <Collapsible open={showAdvanced} onOpenChange={onShowAdvancedChange}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 px-0">
            <AdvancedToggleIcon className="size-4" />
            <span>Advanced Settings</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="cron"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CRON_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map((timezone) => (
                        <SelectItem key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Quality Control</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="minScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Min Score</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Min Items</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={50} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="searchLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Search Limit</FormLabel>
                    <FormControl>
                      <Input type="number" min={10} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">AI Processing</Label>
            <FormField
              control={form.control}
              name="generateItemSummaries"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-sm font-normal">Generate Summaries</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="composeNarrative"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-sm font-normal">Compose Narrative</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Writing Style</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="opinionated">Opinionated</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Delivery Channels</Label>
            <FormField
              control={form.control}
              name="inboxEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-sm font-normal">Inbox (Web)</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emailEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-sm font-normal">Email</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="webhookEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-sm font-normal">Webhook</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
