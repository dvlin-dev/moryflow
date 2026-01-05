import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { SettingsSection, settingsSections } from '../const'

type NavigationItem = (typeof settingsSections)[number]

type SectionNavigationProps = {
  sections: readonly NavigationItem[]
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

export const SectionNavigation = ({
  sections,
  activeSection,
  onSectionChange,
}: SectionNavigationProps) => {
  const { t } = useTranslation('settings')

  return (
    <nav className="w-44 shrink-0">
      <div className="flex flex-col gap-1">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={cn(
              'rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-fast',
              activeSection === section.id
                ? 'bg-muted/60 font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )}
            onClick={() => onSectionChange(section.id)}
          >
            <p>{t(section.labelKey)}</p>
            {section.descriptionKey && (
              <p className="mt-0.5 text-xs text-muted-foreground">{t(section.descriptionKey)}</p>
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
