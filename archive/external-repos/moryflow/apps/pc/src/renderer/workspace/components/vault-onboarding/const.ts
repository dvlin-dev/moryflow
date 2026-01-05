export type VaultOnboardingProps = {
  isPickingVault: boolean
  vaultMessage: string | null
  onOpenVault: () => Promise<void>
  onSelectDirectory: () => Promise<string | null>
  onCreateVault: (name: string, parentPath: string) => Promise<void>
}

/** 欢迎页视图状态 */
export type OnboardingView = 'main' | 'create'
