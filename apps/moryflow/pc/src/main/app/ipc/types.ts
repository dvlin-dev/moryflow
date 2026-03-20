export type IpcHandler = (...args: any[]) => unknown;

export type IpcMainLike = {
  handle: (channel: string, listener: IpcHandler) => void;
};
