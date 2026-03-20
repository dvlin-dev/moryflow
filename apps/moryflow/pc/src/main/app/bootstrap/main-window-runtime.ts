type WindowLike = {
  isMinimized: () => boolean;
  restore: () => void;
  isVisible: () => boolean;
  show: () => void;
  focus: () => void;
  isDestroyed: () => boolean;
};

type MainWindowHooks<TWindow extends WindowLike> = {
  onFocus?: (window: TWindow) => void;
  onClosed?: (window: TWindow) => void;
};

export const createMainWindowRuntime = <TWindow extends WindowLike>(input: {
  createMainWindow: (input: { hooks: MainWindowHooks<TWindow> }) => Promise<TWindow>;
  bindMainWindowLifecyclePolicy: (
    window: TWindow,
    input: {
      getCloseBehavior: () => 'hide_to_menubar' | 'quit';
      isQuitting: () => boolean;
      onHiddenToMenubar: () => void;
      requestQuit: () => void;
    }
  ) => () => void;
  clearUnreadCount: () => void;
  getCloseBehavior: () => 'hide_to_menubar' | 'quit';
  isQuitting: () => boolean;
  onHiddenToMenubar: () => void;
  requestQuit: () => void;
  onAfterClosed: () => Promise<void> | void;
}) => {
  let activeWindow: TWindow | null = null;
  let mainWindow: TWindow | null = null;
  let pendingMainWindowCreation: Promise<TWindow> | null = null;
  let disposeMainWindowLifecyclePolicy: (() => void) | null = null;

  const focusMainWindow = (window: TWindow): TWindow => {
    if (window.isMinimized()) {
      window.restore();
    }
    if (!window.isVisible()) {
      window.show();
    }
    window.focus();
    input.clearUnreadCount();
    return window;
  };

  const createOrFocusMainWindow = async (): Promise<TWindow> => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return focusMainWindow(mainWindow);
    }

    if (!pendingMainWindowCreation) {
      pendingMainWindowCreation = input
        .createMainWindow({
          hooks: {
            onFocus: (window) => {
              mainWindow = window;
              activeWindow = window;
              input.clearUnreadCount();
            },
            onClosed: (window) => {
              if (mainWindow === window) {
                mainWindow = null;
              }
              if (activeWindow === window) {
                activeWindow = null;
              }
              disposeMainWindowLifecyclePolicy?.();
              disposeMainWindowLifecyclePolicy = null;
              void input.onAfterClosed();
            },
          },
        })
        .then((created) => {
          mainWindow = created;
          disposeMainWindowLifecyclePolicy?.();
          disposeMainWindowLifecyclePolicy = input.bindMainWindowLifecyclePolicy(created, {
            getCloseBehavior: input.getCloseBehavior,
            isQuitting: input.isQuitting,
            onHiddenToMenubar: input.onHiddenToMenubar,
            requestQuit: input.requestQuit,
          });
          return created;
        })
        .finally(() => {
          pendingMainWindowCreation = null;
        });
    }

    const created = await pendingMainWindowCreation;
    if (created.isDestroyed()) {
      return createOrFocusMainWindow();
    }
    return focusMainWindow(created);
  };

  return {
    getActiveWindow: () => activeWindow,
    getMainWindow: () => mainWindow,
    createOrFocusMainWindow,
  };
};
