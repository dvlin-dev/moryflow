import * as React from 'react';

interface ChangePasswordContextType {
  canSave: boolean;
  isLoading: boolean;
  onSave: () => void;
  setCanSave: (canSave: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setOnSave: (onSave: () => void) => void;
}

const ChangePasswordContext = React.createContext<ChangePasswordContextType | null>(null);

export function ChangePasswordProvider({ children }: { children: React.ReactNode }) {
  const [canSave, setCanSave] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [onSave, setOnSave] = React.useState<() => void>(() => () => {});

  return (
    <ChangePasswordContext.Provider
      value={{
        canSave,
        isLoading,
        onSave,
        setCanSave,
        setIsLoading,
        setOnSave,
      }}
    >
      {children}
    </ChangePasswordContext.Provider>
  );
}

export function useChangePassword() {
  const context = React.useContext(ChangePasswordContext);
  if (!context) {
    throw new Error('useChangePassword must be used within ChangePasswordProvider');
  }
  return context;
}