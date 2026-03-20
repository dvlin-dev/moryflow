type AppLike = {
  setAsDefaultProtocolClient: (...args: any[]) => boolean | void;
  requestSingleInstanceLock: () => boolean;
  quit: () => void;
  on: (...args: any[]) => void;
};

type ProcessLike = {
  defaultApp?: boolean;
  argv: string[];
  execPath: string;
  env: Record<string, string | undefined>;
};

export const configureProtocolLifecycle = (input: {
  app: AppLike;
  process: ProcessLike;
  protocolName: string;
  extractDeepLinkFromArgv: (argv: string[]) => string | null;
  deepLinkController: {
    handleDeepLink: (url: string) => void;
  };
  openMainWindowWithDeepLinkFlush: () => Promise<void>;
}) => {
  if (input.process.defaultApp) {
    if (input.process.argv.length >= 2) {
      input.app.setAsDefaultProtocolClient(input.protocolName, input.process.execPath, [
        input.process.argv[1],
      ]);
    }
  } else {
    input.app.setAsDefaultProtocolClient(input.protocolName);
  }

  const shouldBypassSingleInstanceLock =
    input.process.env['MORYFLOW_E2E'] === 'true' &&
    Boolean(input.process.env['MORYFLOW_E2E_USER_DATA']?.trim());

  const gotSingleInstanceLock = shouldBypassSingleInstanceLock
    ? true
    : input.app.requestSingleInstanceLock();

  if (!gotSingleInstanceLock) {
    input.app.quit();
  }

  if (gotSingleInstanceLock) {
    input.app.on('second-instance', (_event: unknown, argv: string[]) => {
      const deepLink = input.extractDeepLinkFromArgv(argv);
      if (deepLink) {
        input.deepLinkController.handleDeepLink(deepLink);
        return;
      }

      void input.openMainWindowWithDeepLinkFlush();
    });

    const initialDeepLink = input.extractDeepLinkFromArgv(input.process.argv);
    if (initialDeepLink) {
      input.deepLinkController.handleDeepLink(initialDeepLink);
    }
  }

  input.app.on('open-url', (event: { preventDefault: () => void }, url: string) => {
    event.preventDefault();
    input.deepLinkController.handleDeepLink(url);
  });

  return {
    gotSingleInstanceLock,
  };
};
