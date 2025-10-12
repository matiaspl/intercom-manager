import { SubmitHandler } from "react-hook-form";
import { useGlobalState } from "../../global-state/context-provider";
import { useInitiateProductionCall } from "../../hooks/use-initiate-production-call";
import { useStorage } from "../accessing-local-storage/access-local-storage";
import { TJoinProductionOptions, TProduction } from "../production-line/types";
import { TUserSettings } from "../user-settings/types";

type FormValues = TJoinProductionOptions & {
  audiooutput: string;
};

export const useSubmitForm = ({
  isJoinProduction,
  production,
  isProgramUser,
  setJoinProductionOptions,
  customGlobalMute,
  closeAddCallView,
  updateUserSettings,
  onSave,
  selectedLineName,
  productionName,
}: {
  isJoinProduction?: boolean;
  production: TProduction | null;
  isProgramUser?: boolean;
  setJoinProductionOptions?: React.Dispatch<
    React.SetStateAction<TJoinProductionOptions | null>
  >;
  customGlobalMute?: string;
  closeAddCallView?: () => void;
  updateUserSettings?: boolean;
  onSave?: () => void;
  selectedLineName?: string;
  productionName?: string;
}) => {
  const [{ userSettings }, dispatch] = useGlobalState();
  const { writeToStorage, removeFromStorage } = useStorage();
  const { initiateProductionCall } = useInitiateProductionCall({
    dispatch,
  });

  const onSubmit: SubmitHandler<FormValues | TUserSettings> = (payload) => {
    if (isJoinProduction && "lineId" in payload) {
      const selectedLine = production?.lines.find(
        (line) => line.id === payload.lineId
      );

      const options: TJoinProductionOptions = {
        ...payload,
        audioinput: payload?.audioinput || userSettings?.audioinput,
        lineUsedForProgramOutput: selectedLine?.programOutputLine || false,
        isProgramUser: isProgramUser || false,
        lineName: selectedLineName || selectedLine?.name,
        productionName: productionName || production?.name,
      };

      const callPayload = {
        joinProductionOptions: options,
        audiooutput: payload.audiooutput || userSettings?.audiooutput,
      };

      initiateProductionCall({
        payload: callPayload,
        customGlobalMute,
      });

      if (closeAddCallView) {
        closeAddCallView();
      }

      setJoinProductionOptions?.(options);
    }

    if (updateUserSettings || !isJoinProduction) {
      const newUserSettings: TUserSettings = {
        username: payload.username,
        audioinput: payload.audioinput,
        audiooutput: payload.audiooutput,
        backendUrl: (payload as TUserSettings).backendUrl,
        backendApiKey: (payload as TUserSettings).backendApiKey,
      };

      if (payload.username) {
        writeToStorage("username", payload.username);
      }

      if (payload.audioinput) {
        writeToStorage("audioinput", payload.audioinput);
      }

      if (payload.audiooutput) {
        writeToStorage("audiooutput", payload.audiooutput);
      }

      const rawBackendUrl = (payload as TUserSettings).backendUrl?.trim();
      if (rawBackendUrl) {
        // Strip accidental surrounding quotes
        const sanitized = rawBackendUrl
          .replace(/^%22|%22$/g, "") // encoded quotes
          .replace(/^\\"|\\"$/g, "") // escaped quotes
          .replace(/^['"]+|['"]+$/g, ""); // raw quotes
        newUserSettings.backendUrl = sanitized;
        writeToStorage("backendUrl", sanitized);
      } else {
        removeFromStorage("backendUrl");
      }

      const backendApiKey = (payload as TUserSettings).backendApiKey?.trim();
      if (backendApiKey) {
        writeToStorage("backendApiKey", backendApiKey);
      } else {
        removeFromStorage("backendApiKey");
      }

      dispatch({
        type: "UPDATE_USER_SETTINGS",
        payload: isJoinProduction ? newUserSettings : payload,
      });
    }

    if (onSave) onSave();
  };

  return { onSubmit };
};
