import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@aiget/ui/components/dialog'
import { Button } from '@aiget/ui/components/button'
import { ScrollArea } from '@aiget/ui/components/scroll-area'
import { Loader2Icon } from 'lucide-react'
import { sectionContentLayout, settingsSections, type SettingsDialogProps } from './const'
import { useSettingsDialogState } from './use-settings-dialog'
import { SectionNavigation } from './components/section-navigation'
import { SectionContent } from './components/section-content'
import { useTranslation } from '@/lib/i18n'

export const SETTINGS_CHUNK_HASH =
  typeof import.meta.url === 'string'
    ? import.meta.url.match(/([A-Za-z0-9]{8,})\.(?:m?js|js)/)?.[1]
    : undefined

export const SettingsDialog = ({ open, onOpenChange, initialSection, vaultPath }: SettingsDialogProps) => {
  const { t } = useTranslation('settings')
  const {
    meta,
    navigation,
    form,
    mcpArrays,
    providers,
    actions: { handleSave, handleClose },
  } = useSettingsDialogState({ open, onOpenChange, initialSection })

  // 表单验证失败时的处理
  const handleInvalid = (errors: Record<string, unknown>) => {
    console.warn('[settings-dialog] form validation failed:', errors)
  }

  const sectionContent = (
    <SectionContent
      section={navigation.activeSection}
      meta={{ isLoading: meta.isLoading, appVersion: meta.appVersion }}
      form={form}
      providers={providers}
      mcp={{ stdioArray: mcpArrays.stdioArray, httpArray: mcpArrays.httpArray }}
      vaultPath={vaultPath}
    />
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[80vh] w-[90vw] max-w-[1200px]! flex-col overflow-hidden p-0"
        showCloseButton={!meta.isSaving}
      >
        <DialogHeader className="shrink-0 px-6 pt-5 pb-0">
          <DialogTitle className="text-base">{t('settings')}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSave, handleInvalid)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-6">
            <SectionNavigation
              sections={settingsSections}
              activeSection={navigation.activeSection}
              onSectionChange={navigation.setActiveSection}
            />
            <section className="min-h-0 flex-1 overflow-hidden rounded-xl bg-muted/30">
              {sectionContentLayout[navigation.activeSection]?.useScrollArea ?? true ? (
                <ScrollArea className="h-full">
                  <div className="p-4">{sectionContent}</div>
                </ScrollArea>
              ) : (
                <div className="h-full overflow-hidden p-4">{sectionContent}</div>
              )}
            </section>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 px-6 pb-5">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={meta.isSaving}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={meta.isSaving || meta.isLoading}>
              {meta.isSaving && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {t('saveSettings')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
