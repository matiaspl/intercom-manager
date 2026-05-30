import {
  clearCallHandlers,
  setCallActionHandler,
  setCallStateGetter,
} from "./action-handlers";

export const registerHandler = (
  callId: string,
  action: string,
  handler: () => void
): void => {
  setCallActionHandler(callId, action, handler);
};

export const syncCallState = (
  callId: string,
  isInputMuted: boolean,
  isOutputMuted: boolean
): void => {
  setCallStateGetter(callId, () => ({ isInputMuted, isOutputMuted }));
};

export const detachCall = (callId: string): void => {
  clearCallHandlers(callId);
};
