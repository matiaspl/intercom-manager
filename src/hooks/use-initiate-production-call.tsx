import { useCallback, Dispatch } from "react";
import { TJoinProductionOptions } from "../components/production-line/types";
import { TGlobalStateAction } from "../global-state/global-state-actions";
import { isBrowserSafari, isIpad, isMobile } from "../bowser";
import { useFetchDevices } from "./use-fetch-devices";
import { useDevicePermissions } from "./use-device-permission";
import logger from "../utils/logger";

export const useInitiateProductionCall = ({
  dispatch,
}: {
  dispatch: Dispatch<TGlobalStateAction>;
}) => {
  const { permission } = useDevicePermissions({
    continueToApp: true,
  });

  const [getUpdatedDevices] = useFetchDevices({
    dispatch,
    permission,
  });

  const initiateProductionCall = useCallback(
    async ({
      payload,
      customGlobalMute,
    }: {
      payload: {
        joinProductionOptions: TJoinProductionOptions;
        audiooutput: string | undefined;
      };
      customGlobalMute?: string;
    }): Promise<boolean> => {
      try {
        // Wait for devices to refresh and get the updated devices
        const updatedDevices = await getUpdatedDevices();

        // Validate and auto-fallback for missing devices
        const requestedInput = payload.joinProductionOptions.audioinput;
        const inputDeviceExists =
          requestedInput === "no-device" ||
          updatedDevices.input.some((d) => d.deviceId === requestedInput);

        const selectedInput = inputDeviceExists
          ? requestedInput
          : updatedDevices.input[0]?.deviceId !== undefined
            ? updatedDevices.input[0].deviceId
            : "no-device";

        const nextJoinOpts: TJoinProductionOptions = {
          ...payload.joinProductionOptions,
          audioinput: selectedInput,
        };

        const requestedOutput = payload.audiooutput;
        const outputDeviceExists = updatedDevices.output.some(
          (device) => device.deviceId === requestedOutput
        );

        const nextAudioOutput = (() => {
          if (!isBrowserSafari && !isMobile && !isIpad) {
            if (!outputDeviceExists && updatedDevices.output.length > 0) {
              return updatedDevices.output[0].deviceId;
            }
            if (
              updatedDevices.output.length === 0 &&
              requestedOutput &&
              !outputDeviceExists
            ) {
              // Clear invalid desktop output if none available
              return undefined;
            }
            return requestedOutput;
          }
          // Mobile/Safari: ignore output selection
          return undefined;
        })();

        const uuid = globalThis.crypto.randomUUID();

        dispatch({
          type: "ADD_CALL",
          payload: {
            id: uuid,
            callState: {
              joinProductionOptions: nextJoinOpts,
              audiooutput: nextAudioOutput,
              mediaStreamInput: null,
              dominantSpeaker: null,
              audioLevelAboveThreshold: false,
              connectionState: null,
              audioElements: null,
              sessionId: null,
              dataChannel: null,
              isRemotelyMuted: false,
              hotkeys: {
                muteHotkey: "m",
                speakerHotkey: "n",
                pushToTalkHotkey: "t",
                increaseVolumeHotkey: "u",
                decreaseVolumeHotkey: "d",
                globalMuteHotkey: customGlobalMute || "p",
              },
            },
          },
        });
        dispatch({
          type: "SELECT_PRODUCTION_ID",
          payload: payload.joinProductionOptions.productionId,
        });
        return true;
      } catch (error) {
        logger.red(`Error to initiate production call: ${error}`);
        dispatch({
          type: "ERROR",
          payload: {
            error: error instanceof Error ? error : new Error(String(error)),
          },
        });
        return false;
      }
    },
    [dispatch, getUpdatedDevices]
  );

  return { initiateProductionCall };
};
