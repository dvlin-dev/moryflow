"use client"

import { Fragment } from "react"

import { Button } from "../../../ui-primitive/button"
import { ToolbarSeparator } from "../../../ui-primitive/toolbar"

import type {
  ToolbarViewButtonProps,
  ToolbarViewId,
  ToolbarViewsGroupProps,
} from "../types"
import { TOOLBAR_VIEWS } from "../types"

/**
 * 单个视图按钮
 */
export function ToolbarViewButton({
  view,
  isMobile,
  onViewChange,
}: ToolbarViewButtonProps) {
  const viewId = view.id as Exclude<ToolbarViewId, typeof TOOLBAR_VIEWS.MAIN>

  if (isMobile) {
    // 移动端：使用 mobileButton 或默认 Button
    if (view.mobileButton) {
      return view.mobileButton(() => onViewChange(viewId))
    }
    return (
      <Button onClick={() => onViewChange(viewId)}>
        {view.renderIcon()}
      </Button>
    )
  }

  // 桌面端：惰性渲染 desktopComponent
  return view.renderDesktopComponent?.() ?? null
}

/**
 * 视图按钮组
 */
export function ToolbarViewsGroup({
  toolbarViews,
  isMobile,
  onViewChange,
  editor,
}: ToolbarViewsGroupProps) {
  const visibleViews = Object.values(toolbarViews).filter((view) => {
    if (!view.shouldShow) return true
    return view.shouldShow(editor)
  })

  if (visibleViews.length === 0) return null

  return (
    <>
      {visibleViews.map((view) => (
        <Fragment key={view.id}>
          <ToolbarViewButton
            view={view}
            isMobile={isMobile}
            onViewChange={onViewChange}
          />
        </Fragment>
      ))}

      <ToolbarSeparator />
    </>
  )
}
