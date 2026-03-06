import '@testing-library/jest-dom';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key' | 'length'>;

const isStorageLike = (value: unknown): value is StorageLike => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StorageLike>;
  return (
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function' &&
    typeof candidate.clear === 'function' &&
    typeof candidate.key === 'function'
  );
};

const createMemoryStorage = (): StorageLike => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(String(key)) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(String(key));
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  };
};

if (typeof window !== 'undefined' && !isStorageLike(window.localStorage)) {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: createMemoryStorage(),
  });
}
