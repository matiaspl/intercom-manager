import { FC } from "react";
import { useGlobalState } from "../../global-state/context-provider";
import { DisplayContainerHeader } from "../landing-page/display-container-header";
import { ResponsiveFormContainer } from "../generic-components";
import { NavigateToRootButton } from "../navigate-to-root-button/navigate-to-root-button";
import { HeaderWrapper } from "../create-production/create-production-components";
import { MobileSettingsForm } from "./MobileSettingsForm";

export const MobileSettingsPage: FC = () => {
  const [{ devices, userSettings }] = useGlobalState();

  const defaultValues = {
    username: userSettings?.username,
    audioinput:
      userSettings?.audioinput ??
      devices.input?.find((d) => d.deviceId === "default")?.deviceId ??
      devices.input?.[0]?.deviceId,
    audiooutput: userSettings?.audiooutput,
    backendUrl: userSettings?.backendUrl,
    backendApiKey: userSettings?.backendApiKey,
  };

  return (
    <ResponsiveFormContainer>
      <HeaderWrapper>
        <NavigateToRootButton />
        <DisplayContainerHeader>Settings</DisplayContainerHeader>
      </HeaderWrapper>
      {devices && (
        <MobileSettingsForm
          buttonText="Save"
          defaultValues={defaultValues}
          updateUserSettings
          needsConfirmation
        />
      )}
    </ResponsiveFormContainer>
  );
};
