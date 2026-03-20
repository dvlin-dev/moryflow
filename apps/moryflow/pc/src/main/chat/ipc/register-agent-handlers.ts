import { ipcMain } from 'electron';
import { createChatRequestExecutor } from '../application/createChatRequestExecutor.js';
import type { RegisterChatHandlersContext } from './register-context.js';

export const registerChatAgentHandlers = ({ activeStreams }: RegisterChatHandlersContext) => {
  const executeChatRequest = createChatRequestExecutor(activeStreams);

  ipcMain.handle('chat:agent-request', async (event, payload) => {
    return executeChatRequest({
      sender: event.sender,
      payload,
    });
  });

  ipcMain.handle('chat:agent-stop', async (_event, payload) => {
    const { channel } = payload ?? {};
    if (!channel) {
      throw new Error('Missing channel.');
    }
    await activeStreams.stopChannel(channel);
    return { ok: true };
  });
};
