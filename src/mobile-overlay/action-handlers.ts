export type ActionHandler = () => void;

// Global registry for call-specific UI action handlers and state getters
const actionRegistry: Record<string, Record<string, ActionHandler>> = {};
const stateGetters: Record<string, () => { isInputMuted: boolean; isOutputMuted: boolean }> = {};

export const setCallActionHandler = (
  callId: string,
  action: string,
  handler: ActionHandler
) => {
  if (!actionRegistry[callId]) actionRegistry[callId] = {};
  actionRegistry[callId][action] = handler;
};

export const getCallHandlers = (
  callId: string
): Record<string, ActionHandler> | undefined => actionRegistry[callId];

export const setCallStateGetter = (
  callId: string,
  getter: () => { isInputMuted: boolean; isOutputMuted: boolean }
) => {
  stateGetters[callId] = getter;
};

export const getCallState = (
  callId: string
): { isInputMuted: boolean; isOutputMuted: boolean } | undefined => stateGetters[callId]?.();

export const clearCallHandlers = (callId: string) => {
  delete actionRegistry[callId];
  delete stateGetters[callId];
};
