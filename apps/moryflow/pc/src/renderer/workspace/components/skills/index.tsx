/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Skills 主页面（Installed/Recommended + 详情弹层）
 * [UPDATE]: 2026-02-11 - New skill 复用 Skill Creator；Try 行为改为立即新建会话并生效
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Input } from '@anyhunt/ui/components/input';
import { Button } from '@anyhunt/ui/components/button';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SkillsList } from './skills-list';
import { SkillDetailModal } from './skill-detail-modal';
import { useSkillsPageState } from './use-skills';

export const SkillsPage = () => {
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
          <h1 className="text-xl font-semibold text-foreground">Skills</h1>
          <p className="text-sm text-muted-foreground">Give Moryflow superpowers.</p>
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
            Refresh
          </Button>
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search skills"
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
                toast.error(
                  error instanceof Error ? error.message : 'Failed to start Skill Creator'
                );
              }
            }}
          >
            <Plus className="mr-1 size-4" />
            New skill
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
            toast.error(error instanceof Error ? error.message : 'Failed to start skill');
            throw error;
          }
        }}
        onToggleEnabled={async (name, enabled) => {
          try {
            await setEnabled(name, enabled);
            toast.success(enabled ? 'Skill enabled' : 'Skill disabled');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update skill status');
          }
        }}
        onUninstall={async (name) => {
          try {
            await uninstall(name);
            toast.success('Skill uninstalled');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to uninstall skill');
          }
        }}
        onOpenDirectory={async (name) => {
          try {
            await openDirectory(name);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to open skill directory');
          }
        }}
      />
    </div>
  );
};
