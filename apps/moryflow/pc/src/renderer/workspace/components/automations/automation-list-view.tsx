import { Button } from '@moryflow/ui/components/button';
import type { AutomationJob } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import { AutomationListItem } from './automation-list-item';
import { automationsMethods } from './store/automations-methods';

type AutomationListViewProps = {
  automations: AutomationJob[];
  isHydrated: boolean;
  isLoading: boolean;
  onSelectJob: (jobId: string) => void;
  onCreateNew: () => void;
};

export const AutomationListView = ({
  automations,
  isHydrated,
  isLoading,
  onSelectJob,
  onCreateNew,
}: AutomationListViewProps) => {
  const { t } = useTranslation('workspace');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t('automationsTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('automationsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void automationsMethods.hydrate()}
            disabled={isLoading}
          >
            {t('automationsRefresh')}
          </Button>
          <Button size="sm" onClick={onCreateNew}>
            {t('automationsNewAutomation')}
          </Button>
        </div>
      </div>

      {automations.length === 0 && isHydrated ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t('automationsEmptyDescription')}</p>
          <Button size="sm" variant="outline" onClick={onCreateNew}>
            {t('automationsNewAutomation')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map((job) => (
            <AutomationListItem key={job.id} job={job} onClick={() => onSelectJob(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
};
