/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Skills 主页面（Installed/Recommended + 详情弹层）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Input } from '@moryflow/ui/components/input';
import { Button } from '@moryflow/ui/components/button';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { SkillsList } from './skills-list';
import { SkillDetailModal } from './skill-detail-modal';
import { useSkillsPageState } from './use-skills';

export const SkillsPage = () => {
  const { t } = useTranslation('workspace');
  const {
    loading,
    skills,
    recommendedSkills,
    search,
    setSearch,
    refresh,
    selectedSkill,
    detailOpen,
    openDetail,
    closeDetail,
    getDetail,
    setEnabled,
    uninstall,
    openDirectory,
    handleInstallRecommended,
    startSkillThread,
  } = useSkillsPageState();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t('skillsTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('skillsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void refresh();
            }}
          >
            <RefreshCw className="mr-1 size-4" />
            {t('skillsRefresh')}
          </Button>
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={t('skillsSearchPlaceholder')}
            className="h-9 w-64"
          />
          <Button
            size="sm"
            onClick={async () => {
              try {
                await startSkillThread('skill-creator', {
                  autoInstall: true,
                  autoEnable: true,
                });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t('skillsFailedToStart'));
              }
            }}
          >
            <Plus className="mr-1 size-4" />
            {t('skillsNewSkill')}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <SkillsList
          loading={loading}
          skills={skills}
          recommendedSkills={recommendedSkills}
          search={search}
          onOpenDetail={openDetail}
          onInstallRecommended={(skill) => {
            void handleInstallRecommended(skill);
          }}
        />
      </div>

      <SkillDetailModal
        open={detailOpen}
        skill={selectedSkill}
        onOpenChange={(open) => {
          if (!open) {
            closeDetail();
          }
        }}
        onLoadDetail={getDetail}
        onTry={async (skillName) => {
          try {
            await startSkillThread(skillName);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : t('skillsFailedToStartSkill'));
            throw error;
          }
        }}
        onToggleEnabled={async (name, enabled) => {
          try {
            await setEnabled(name, enabled);
            toast.success(enabled ? t('skillsSkillEnabled') : t('skillsSkillDisabled'));
          } catch (error) {
            toast.error(error instanceof Error ? error.message : t('skillsFailedToUpdateStatus'));
          }
        }}
        onUninstall={async (name) => {
          try {
            await uninstall(name);
            toast.success(t('skillsSkillUninstalled'));
          } catch (error) {
            toast.error(error instanceof Error ? error.message : t('skillsFailedToUninstall'));
          }
        }}
        onOpenDirectory={async (name) => {
          try {
            await openDirectory(name);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : t('skillsFailedToOpenDir'));
          }
        }}
      />
    </div>
  );
};
