/**
 * [PROPS]: VaultOnboardingProps
 * [EMITS]: onOpenVault/onSelectDirectory/onCreateVault
 * [POS]: 首次进入的 Vault 选择与创建引导（Lucide 图标）
 */

import { useState, useCallback } from 'react';
import { Button } from '@anyhunt/ui/components/button';
import { Input } from '@anyhunt/ui/components/input';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Cloud, FolderPlus, FolderOpen } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { VaultOnboardingProps, OnboardingView } from './const';
import { getOpenButtonLabel, getCreateButtonLabel } from './handle';

type TranslateFunction = (key: any) => string;

/** 选项卡组件 */
const OptionRow = ({
  icon,
  title,
  description,
  action,
  actionLabel,
  buttonTestId,
  disabled,
  comingSoon,
  comingSoonLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  buttonTestId?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  comingSoonLabel?: string;
}) => {
  const IconComponent = icon;

  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-4">
        <IconComponent className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {comingSoon ? (
        <span className="text-xs text-muted-foreground px-3 py-1.5 rounded-md bg-muted">
          {comingSoonLabel}
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={action}
          disabled={disabled}
          className="min-w-[72px]"
          data-testid={buttonTestId}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

/** 主视图 - 选项列表 */
const MainView = ({
  isPickingVault,
  onCreateClick,
  onOpenVault,
  t,
}: {
  isPickingVault: boolean;
  onCreateClick: () => void;
  onOpenVault: () => Promise<void>;
  t: TranslateFunction;
}) => (
  <div className="space-y-1">
    <OptionRow
      icon={FolderPlus}
      title={t('createVaultTitle')}
      description={t('createVaultDescription')}
      action={onCreateClick}
      actionLabel={t('create')}
      buttonTestId="vault-onboarding-create"
      disabled={isPickingVault}
    />
    <OptionRow
      icon={FolderOpen}
      title={t('openLocalVaultTitle')}
      description={t('openLocalVaultDescription')}
      action={() => void onOpenVault()}
      actionLabel={getOpenButtonLabel(isPickingVault, t)}
      buttonTestId="vault-onboarding-open"
      disabled={isPickingVault}
    />
    <OptionRow
      icon={Cloud}
      title={t('syncRemoteVaultTitle')}
      description={t('syncRemoteVaultDescription')}
      comingSoon
      comingSoonLabel={t('comingSoon')}
    />
  </div>
);

/** 创建仓库视图 */
const CreateView = ({
  isPickingVault,
  vaultName,
  selectedPath,
  onVaultNameChange,
  onBack,
  onBrowse,
  onCreate,
  t,
}: {
  isPickingVault: boolean;
  vaultName: string;
  selectedPath: string | null;
  onVaultNameChange: (name: string) => void;
  onBack: () => void;
  onBrowse: () => void;
  onCreate: () => void;
  t: TranslateFunction;
}) => (
  <div className="space-y-6">
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('back')}
    </button>
    <h2 className="text-base font-medium">{t('createLocalVault')}</h2>
    <div className="space-y-4">
      <div className="flex items-center justify-between py-3 border-b border-border/50">
        <div>
          <h3 className="text-sm font-medium">{t('vaultName')}</h3>
          <p className="text-xs text-muted-foreground">{t('vaultNameDescription')}</p>
        </div>
        <Input
          value={vaultName}
          onChange={(e) => onVaultNameChange(e.target.value)}
          placeholder={t('vaultName')}
          className="w-[200px] text-right"
          data-testid="vault-onboarding-name"
        />
      </div>
      <div className="flex items-center justify-between py-3 border-b border-border/50">
        <div>
          <h3 className="text-sm font-medium">{t('vaultLocation')}</h3>
          <p className="text-xs text-muted-foreground">
            {selectedPath ? (
              <>
                {t('vaultWillBeSavedAt')}
                <span className="text-primary">{selectedPath}</span>
              </>
            ) : (
              t('clickToSelectLocation')
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onBrowse}
          disabled={isPickingVault}
          data-testid="vault-onboarding-browse"
        >
          {t('browse')}
        </Button>
      </div>
    </div>
    <div className="flex justify-center pt-2">
      <Button
        onClick={onCreate}
        disabled={isPickingVault || !vaultName.trim() || !selectedPath}
        className="min-w-[80px]"
        data-testid="vault-onboarding-confirm"
      >
        {getCreateButtonLabel(isPickingVault, t)}
      </Button>
    </div>
  </div>
);

export const VaultOnboarding = ({
  isPickingVault,
  vaultMessage,
  onOpenVault,
  onSelectDirectory,
  onCreateVault,
}: VaultOnboardingProps) => {
  const { t } = useTranslation('workspace');
  const [view, setView] = useState<OnboardingView>('main');
  const [vaultName, setVaultName] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleCreateClick = useCallback(() => {
    setView('create');
  }, []);

  const handleBack = useCallback(() => {
    setView('main');
    setVaultName('');
    setSelectedPath(null);
  }, []);

  const handleBrowse = useCallback(async () => {
    const path = await onSelectDirectory();
    if (path) {
      setSelectedPath(path);
    }
  }, [onSelectDirectory]);

  const handleCreate = useCallback(async () => {
    if (!vaultName.trim() || !selectedPath) return;
    await onCreateVault(vaultName.trim(), selectedPath);
  }, [vaultName, selectedPath, onCreateVault]);

  return (
    <section
      className="flex h-full w-full flex-col items-center justify-center"
      data-testid="vault-onboarding"
    >
      <div className="w-full max-w-md space-y-8 px-6">
        {/* Logo 和应用名称 */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 shadow-lg">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Moryflow</h1>
        </div>

        {/* 内容区域 */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 shadow-sm">
          {view === 'main' ? (
            <MainView
              isPickingVault={isPickingVault}
              onCreateClick={handleCreateClick}
              onOpenVault={onOpenVault}
              t={t}
            />
          ) : (
            <CreateView
              isPickingVault={isPickingVault}
              vaultName={vaultName}
              selectedPath={selectedPath}
              onVaultNameChange={setVaultName}
              onBack={handleBack}
              onBrowse={handleBrowse}
              onCreate={handleCreate}
              t={t}
            />
          )}
        </div>

        {/* 消息提示 */}
        {vaultMessage && (
          <p className="text-center text-sm text-muted-foreground">{vaultMessage}</p>
        )}
      </div>
    </section>
  );
};
