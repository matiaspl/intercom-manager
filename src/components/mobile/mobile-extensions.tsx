import styled from "@emotion/styled";
import { isMobileApp } from "../../platform";
import { BackendStatus } from "../backend-status/backend-status";
import { CompanionStatus } from "../companion-status/companion-status";
import { BubbleActionHandler } from "./BubbleActionHandler";
import { CallServiceManager } from "./CallServiceManager";
import { CompanionManager } from "./CompanionManager";
import { MobileInit } from "./MobileInit";
import { StartupPermissions } from "./StartupPermissions";

const StatusBar = styled.div`
  display: flex;
  justify-content: center;
  padding: 0.4rem 1rem 0.8rem 1rem;
`;

export const MobileProviders = () => {
  if (!isMobileApp()) return null;

  return (
    <>
      <StartupPermissions />
      <StatusBar>
        <BackendStatus />
        <span style={{ width: 8 }} />
        <CompanionStatus />
      </StatusBar>
      <BubbleActionHandler />
      <MobileInit />
      <CallServiceManager />
      <CompanionManager />
    </>
  );
};

