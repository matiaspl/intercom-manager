import { BrowserRouter, Routes, Route } from "react-router-dom";
import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { ErrorPage } from "./components/router-error.tsx";
import { useDevicePermissions } from "./hooks/use-device-permission.ts";
import { LandingPage } from "./components/landing-page/landing-page.tsx";
import { useInitializeGlobalStateReducer } from "./global-state/global-state-reducer.ts";
import { GlobalStateContext } from "./global-state/context-provider.tsx";
import { ErrorBanner } from "./components/error";
import { useFetchDevices } from "./hooks/use-fetch-devices.ts";
import {
  DisplayContainer,
  FlexContainer,
} from "./components/generic-components.ts";
import { DisplayWarning } from "./components/display-box.tsx";
import { isValidBrowser } from "./bowser.ts";
import { DisplayContainerHeader } from "./components/landing-page/display-container-header.tsx";
import { NavigateToRootButton } from "./components/navigate-to-root-button/navigate-to-root-button.tsx";
import { CallsPage } from "./components/calls-page/calls-page.tsx";
import { Header } from "./components/header.tsx";
import { useLocalUserSettings } from "./hooks/use-local-user-settings.ts";
import { ManageProductionsPage } from "./components/manage-productions-page/manage-productions-page.tsx";
import { CreateProductionPage } from "./components/create-production/create-production-page.tsx";
import { useSetupTokenRefresh } from "./hooks/use-reauth.tsx";
import { isMobileApp } from "./platform";
import { BackendStatus } from "./components/backend-status/backend-status";
import { TUserSettings } from "./components/user-settings/types";
import { BubbleActionHandler } from "./components/mobile/BubbleActionHandler";
import { MobileInit } from "./components/mobile/MobileInit";
import { CallServiceManager } from "./components/mobile/CallServiceManager";
import { useInitiateProductionCall } from "./hooks/use-initiate-production-call";

const DisplayBoxPositioningContainer = styled(FlexContainer)`
  justify-content: center;
  align-items: center;
  padding-top: 12rem;
`;

const ButtonWrapper = styled.div`
  margin: 0 2rem 2rem;
  display: inline-block;
`;

const NotFound = () => {
  return (
    <DisplayContainer>
      <DisplayContainerHeader>
        <ButtonWrapper>
          <NavigateToRootButton />
        </ButtonWrapper>
        Page not found.
      </DisplayContainerHeader>
    </DisplayContainer>
  );
};

const StatusBar = styled.div`
  display: flex;
  justify-content: center;
  padding: 0.4rem 1rem 0.8rem 1rem;
`;

type AppContentProps = {
  continueToApp: boolean;
  denied: boolean;
  permission: boolean;
  apiError: boolean;
  userSettings: TUserSettings | null;
  setUnsupportedContinue: (value: boolean) => void;
  setApiError: (value: boolean) => void;
};

const AppContent = ({
  continueToApp,
  denied,
  permission,
  apiError,
  userSettings,
  setUnsupportedContinue,
  setApiError,
}: AppContentProps) => {
  const { setupTokenRefresh } = useSetupTokenRefresh();

  useEffect(() => {
    const cleanup = setupTokenRefresh();
    return () => cleanup();
  }, [setupTokenRefresh]);

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Header />
      {isMobileApp() && (
        <StatusBar>
          <BackendStatus />
        </StatusBar>
      )}
      {isMobileApp() && <BubbleActionHandler />}
      {isMobileApp() && <MobileInit />}
      {isMobileApp() && <CallServiceManager />}
      <ErrorBanner />

      {!isValidBrowser && !continueToApp && (
        <DisplayBoxPositioningContainer>
          <DisplayWarning
            text={
              <>
                <p>
                  To use this application it is recommended to use one of the
                  following browsers: Chrome, Edge, Firefox or Safari.
                </p>
                <p>
                  If you are using one of the recommended browsers, then it is
                  an older version and should be updated before continuing.
                </p>
              </>
            }
            title="Browser not supported"
            btn={() => setUnsupportedContinue(true)}
          />
        </DisplayBoxPositioningContainer>
      )}
      {continueToApp && (
        <>
          {denied && (
            <DisplayBoxPositioningContainer>
              <DisplayWarning
                text="To use this application it has to be granted access to audio devices. Reload browser and/or reset permissions to try
            again."
                title="Permissions have been denied"
              />
            </DisplayBoxPositioningContainer>
          )}
          {!permission && !denied && (
            <DisplayBoxPositioningContainer>
              <DisplayWarning
                text="To use this application it has to be granted access to audio devices."
                title="Waiting for device permissions"
              />
            </DisplayBoxPositioningContainer>
          )}
          {apiError && (
            <DisplayBoxPositioningContainer>
              <DisplayWarning
                text="The server is not available. Reload page to try again."
                title="Server not available"
              />
            </DisplayBoxPositioningContainer>
          )}
          {permission && !denied && userSettings && (
            <Routes>
              <>
                <Route
                  path="/"
                  element={<LandingPage setApiError={setApiError} />}
                  errorElement={<ErrorPage />}
                />
                <Route
                  path="/create-production"
                  element={<CreateProductionPage />}
                  errorElement={<ErrorPage />}
                />
                <Route
                  path="/manage-productions"
                  element={<ManageProductionsPage setApiError={setApiError} />}
                  errorElement={<ErrorPage />}
                />
                <Route
                  path="/production-calls/production/:productionId/line/:lineId"
                  element={<CallsPage />}
                  errorElement={<ErrorPage />}
                />
                <Route path="*" element={<NotFound />} />
              </>
            </Routes>
          )}
        </>
      )}
    </BrowserRouter>
  );
};

const App = () => {
  const [unsupportedContinue, setUnsupportedContinue] = useState(false);
  const continueToApp = isValidBrowser || isMobileApp() || unsupportedContinue;
  const { denied, permission } = useDevicePermissions({ continueToApp });
  const initializedGlobalState = useInitializeGlobalStateReducer();
  const [{ devices, userSettings, calls }, dispatch] = initializedGlobalState;
  const [apiError, setApiError] = useState(false);
  const { initiateProductionCall } = useInitiateProductionCall({ dispatch });

  useFetchDevices({
    dispatch,
    permission,
  });

  useLocalUserSettings({ devices, dispatch });

  // Persist call list to localStorage whenever calls change
  useEffect(() => {
    try {
      const callEntries = Object.values(calls || {}).map((c: any) => ({
        joinProductionOptions: c?.joinProductionOptions,
        audiooutput: c?.audiooutput,
      }));
      window.localStorage.setItem("savedCalls", JSON.stringify(callEntries));
    } catch (_) {}
  }, [calls]);

  // Restore saved calls on load once user settings and permission are ready
  useEffect(() => {
    const alreadyRestored = window.sessionStorage.getItem("callsRestored") === "1";
    if (alreadyRestored) return;
    if (!permission || !userSettings) return;
    const currentCount = Object.keys(calls || {}).length;
    if (currentCount > 0) return;
    try {
      const saved = window.localStorage.getItem("savedCalls");
      if (!saved) return;
      const list: Array<{ joinProductionOptions: any; audiooutput?: string }> = JSON.parse(saved);
      if (!Array.isArray(list) || list.length === 0) return;
      // Fire sequentially to avoid bursts
      (async () => {
        for (const item of list) {
          try {
            await initiateProductionCall({ payload: { joinProductionOptions: item.joinProductionOptions, audiooutput: item.audiooutput } });
          } catch (_) {}
        }
        window.sessionStorage.setItem("callsRestored", "1");
      })();
    } catch (_) {}
  }, [permission, userSettings, calls, initiateProductionCall]);

  return (
    <GlobalStateContext.Provider value={initializedGlobalState}>
      <AppContent
        continueToApp={continueToApp}
        denied={denied}
        permission={permission}
        apiError={apiError}
        userSettings={userSettings}
        setUnsupportedContinue={setUnsupportedContinue}
        setApiError={setApiError}
      />
    </GlobalStateContext.Provider>
  );
};

export default App;
