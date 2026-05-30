import styled from "@emotion/styled";
import { useEffect, useRef, useState, Dispatch, SetStateAction } from "react";
import { useForm, useWatch } from "react-hook-form";
import { isBrowserFirefox, isBrowserSafari } from "../../bowser";
import { useGlobalState } from "../../global-state/context-provider";
import { useSubmitOnEnter } from "../../hooks/use-submit-form-enter-press";
import { ButtonWrapper } from "../generic-components";
import {
  DevicesSection,
  FormInput,
  FormSelect,
  PrimaryButton,
  SectionTitle,
  StyledWarningMessage,
} from "../form-elements/form-elements";
import {
  CheckboxWrapper,
  FetchErrorMessage,
} from "../landing-page/join-production-components";
import { Checkbox } from "../checkbox/checkbox";
import { TJoinProductionOptions, TProduction } from "../production-line/types";
import { isMobileApp } from "../../platform";
import { OverlayBubble } from "../../mobile-overlay/bubble";
import { DebugPanel } from "./DebugPanel";
import { ReloadDevicesButton } from "../reload-devices-button.tsx/reload-devices-button";
import { TUserSettings } from "../user-settings/types";
import { ConfirmationModal } from "../verify-decision/confirmation-modal";
import { FormItem } from "../user-settings-form/form-item";
import { useSubmitForm } from "../user-settings-form/use-submit-form";
import {
  useFetchProductionList,
  type GetProductionListFilter,
} from "../landing-page/use-fetch-production-list";
import { TListProductionsResponse } from "../../api/api";
import { FirefoxWarning } from "../production-line/firefox-warning";
import { Spinner } from "../loader/loader";
import { useWebSocket } from "../../hooks/use-websocket";
import { useWebsocketReconnect } from "../../hooks/use-websocket-reconnect";
import { useWebsocketActions } from "../../hooks/use-websocket-actions";
import { useStorage } from "../accessing-local-storage/access-local-storage";

type FormValues = TJoinProductionOptions & {
  audiooutput: string;
};

const SubmitButton = styled(PrimaryButton)<{ shouldSubmitOnEnter?: boolean }>`
  outline: ${({ shouldSubmitOnEnter }) =>
    shouldSubmitOnEnter ? "2px solid #007bff" : "none"};
  outline-offset: ${({ shouldSubmitOnEnter }) =>
    shouldSubmitOnEnter ? "2px" : "0"};
`;

export const MobileSettingsForm = ({
  isJoinProduction,
  preSelected,
  addAdditionalCallId,
  prefetchedProduction,
  prefetchedProductionList,
  buttonText,
  defaultValues,
  setJoinProductionOptions,
  customGlobalMute,
  closeAddCallView,
  updateUserSettings,
  onSave,
  needsConfirmation,
  hideUsername,
  hideDevices,
  isProgramUser,
  setIsProgramUser,
}: {
  isJoinProduction?: boolean;
  preSelected?: {
    preSelectedProductionId: string;
    preSelectedLineId: string;
  };
  addAdditionalCallId?: string;
  prefetchedProduction?: TProduction | null;
  prefetchedProductionList?: TListProductionsResponse;
  buttonText: string;
  defaultValues: TUserSettings | FormValues;
  setJoinProductionOptions?: React.Dispatch<
    React.SetStateAction<TJoinProductionOptions | null>
  >;
  customGlobalMute?: string;
  closeAddCallView?: () => void;
  updateUserSettings?: boolean;
  onSave?: () => void;
  needsConfirmation?: boolean;
  hideUsername?: boolean;
  hideDevices?: boolean;
  isProgramUser?: boolean;
  setIsProgramUser?: Dispatch<SetStateAction<boolean>>;
}) => {
  const [production, setProduction] = useState<TProduction | null>(
    prefetchedProduction ?? null
  );
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [selectedLineName, setSelectedLineName] = useState<string>("");
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [isProgramOutputLine, setIsProgramOutputLine] =
    useState<boolean>(false);
  const {
    formState: { errors, isValid },
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
  } = useForm<FormValues | TUserSettings>({
    defaultValues,
    resetOptions: {
      keepDirtyValues: true, // user-interacted input will be retained
      keepErrors: true, // input errors will be retained with value update
    },
  });

  // Extract stable primitive to avoid re-running effects when the defaultValues
  // object reference changes on every parent render.
  const defaultProductionId =
    defaultValues && "productionId" in defaultValues
      ? (defaultValues as FormValues).productionId
      : undefined;

  const productionListFilter: GetProductionListFilter = {
    limit: "100",
    extended: "true",
  };
  const { productions: fetchedProductions, error: productionListFetchError } =
    useFetchProductionList(isJoinProduction ? productionListFilter : undefined);

  // Use prefetched list immediately (no loading flicker), then switch to the
  // live-fetched list once it arrives.
  const productions = fetchedProductions ?? prefetchedProductionList;

  // When a pre-fetched production arrives (via prop), adopt it immediately so
  // the line dropdown renders without waiting for the full production list.
  useEffect(() => {
    if (prefetchedProduction) {
      setProduction(prefetchedProduction);
    }
  }, [prefetchedProduction]);

  // this will update whenever lineId changes
  const selectedLineId = useWatch({ name: "lineId", control });

  const [
    {
      devices,
      selectedProductionId: globalSelectedProductionId,
      calls,
      userSettings,
    },
    dispatch,
  ] = useGlobalState();

  const isAlreadyJoined =
    !!production &&
    !!selectedLineId &&
    Object.values(calls).some(
      (c) =>
        c.joinProductionOptions?.productionId === production.productionId &&
        c.joinProductionOptions?.lineId === selectedLineId
    );

  const { onSubmit } = useSubmitForm({
    isJoinProduction,
    production,
    isProgramUser: isProgramUser || false,
    setJoinProductionOptions,
    customGlobalMute,
    closeAddCallView,
    updateUserSettings,
    onSave,
    selectedLineName,
  });

  const isSettingsConfig = !isJoinProduction;
  const isMobile = isMobileApp();

  // Companion (Stream Deck) connection state
  const callIndexMap = useRef<Record<number, string>>({});
  const callActionHandlers = useRef<Record<string, Record<string, () => void>>>(
    {}
  );
  const everConnectedRef = useRef(false);
  const [isWSReconnecting, setIsWSReconnecting] = useState(false);
  const [isConnectionConflict, setConnectionConflict] = useState(false);
  const [hostPort, setHostPort] = useState<string>("");

  // keep index map synced with calls
  useEffect(() => {
    callIndexMap.current = {};
    Object.keys(calls || {}).forEach((callId, i) => {
      callIndexMap.current[i + 1] = callId;
    });
  }, [calls]);

  const handleAction = useWebsocketActions({
    callIndexMap,
    callActionHandlers,
    // No-op here; global mute toggle is handled in Calls UI
    handleToggleGlobalMute: () => {},
  });

  const { wsConnect, wsDisconnect, isWSConnected } = useWebSocket({
    onAction: handleAction,
    dispatch,
    onConnected: () => {
      everConnectedRef.current = true;
      setConnectionConflict(false);
    },
    resetLastSentCallsState: () => {},
    onConflict: () => {
      setConnectionConflict(true);
      setIsWSReconnecting(false);
    },
  });

  useWebsocketReconnect({
    calls,
    isMasterInputMuted: false,
    everConnected: everConnectedRef.current,
    isWSReconnecting,
    isWSConnected,
    isConnectionConflict,
    setIsWSReconnecting,
    wsConnect,
  });

  useEffect(() => {
    // Prefill saved host:port and auto-connect only on mobile app
    try {
      const savedHostPort = window.localStorage.getItem("companionWsHostPort");
      if (savedHostPort) setHostPort(savedHostPort);
      const savedUrl = window.localStorage.getItem("companionWsUrl");
      if (savedUrl && isMobile && !isWSConnected && !isWSReconnecting) {
        setConnectionConflict(false);
        wsConnect(savedUrl);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  const protocol = "ws://";
  const connectCompanion = () => {
    const url = `${protocol}${hostPort}`;
    try {
      window.localStorage.setItem("companionWsHostPort", hostPort);
      window.localStorage.setItem("companionWsUrl", url);
    } catch (_) {}
    setConnectionConflict(false);
    wsConnect(url);
  };

  // Test tone state (moved from DebugPanel)
  const [tone, setTone] = useState<{
    ctx: AudioContext | null;
    stop: (() => void) | null;
  }>({ ctx: null, stop: null });

  const { writeToStorage } = useStorage();

  const applyUserSetting = (
    key: "audioinput" | "audiooutput",
    value: string
  ) => {
    // Update react-hook-form state
    setValue(key as any, value);
    // Persist immediately
    try {
      writeToStorage(key, value);
    } catch (_) {}
    // Update global state
    dispatch({
      type: "UPDATE_USER_SETTINGS",
      payload: {
        ...userSettings,
        [key]: value,
      } as TUserSettings,
    });
  };

  // Removed inline permission/debug status in favor of DebugPanel

  useEffect(() => {
    if (production && isJoinProduction) {
      const selectedLine = production.lines.find(
        (line) => line.id != null && String(line.id) === selectedLineId
      );
      setSelectedLineName(selectedLine?.name ?? "");
      setIsProgramOutputLine(!!selectedLine?.programOutputLine);
      if (!selectedLine?.programOutputLine) {
        setIsProgramUser?.(false);
      }
    }
  }, [production, selectedLineId, isJoinProduction, setIsProgramUser]);

  // Update selected line id when a new production is fetched
  useEffect(() => {
    // Don't run this hook if we have pre-selected values
    if (preSelected || !isJoinProduction) return;

    if (!production) {
      setValue("lineId", "");

      return;
    }

    // Prefer the first line that the user is not already connected to.
    const joinedLineIds = new Set(
      Object.values(calls)
        .map((c) => c.joinProductionOptions)
        .filter(
          (o): o is NonNullable<typeof o> =>
            !!o && o.productionId === production.productionId
        )
        .map((o) => o.lineId)
    );

    const unjoinedLine = production.lines.find(
      (l) => !joinedLineIds.has(String(l.id))
    );
    const lineId = (unjoinedLine ?? production.lines[0])?.id?.toString() ?? "";

    setValue("lineId", lineId, { shouldValidate: true });
  }, [preSelected, production, calls, setValue, isJoinProduction]);

  useEffect(() => {
    if (defaultProductionId !== undefined) {
      setValue("productionId", defaultProductionId);
    }
  }, [defaultProductionId, setValue]);

  useEffect(() => {
    if (defaultProductionId !== undefined && productions) {
      setProduction(
        productions?.productions.find(
          (p) => p.productionId === defaultProductionId
        ) || null
      );
    }
  }, [defaultProductionId, productions]);

  // If devices have been enumerated and none are available, set to "no-device".
  // Only do this when devices.input is a non-null empty array (i.e. enumeration
  // has completed and genuinely returned no input devices). When devices.input
  // is still null the enumeration hasn't finished yet and we must not
  // pre-emptively set "no-device" — that value would be sent to the backend and
  // cause a 500 error.
  useEffect(() => {
    if (devices.input !== null && devices.input.length === 0) {
      setValue("audioinput", "no-device", { shouldValidate: true });
    }
  }, [devices, setValue]);

  // When real devices arrive, react-hook-form may still hold "no-device" (or a
  // falsy value) captured from the DOM before enumeration completed. Reset the
  // field to the default device so the correct device ID is submitted.
  useEffect(() => {
    if (!devices.input || devices.input.length === 0) return;
    const current = getValues("audioinput");
    if (!current || current === "no-device") {
      const defaultDevice =
        devices.input.find((d) => d.deviceId === "default")?.deviceId ??
        devices.input[0].deviceId;
      setValue("audioinput", defaultDevice, { shouldValidate: true });
    }
  }, [devices.input, getValues, setValue]);

  // If user selects a production from the productionlist
  useEffect(() => {
    if (globalSelectedProductionId && isJoinProduction) {
      reset({
        productionId: `${globalSelectedProductionId}`,
      });
    }
  }, [reset, globalSelectedProductionId, isJoinProduction]);

  useSubmitOnEnter<FormValues | TUserSettings>({
    handleSubmit,
    submitHandler: onSubmit,
    needsConfirmation,
    shouldSubmitOnEnter: true,
    isBrowserFirefox,
    setConfirmModalOpen,
  });

  return (
    <div style={{ minWidth: updateUserSettings ? "min(40rem, 100%)" : "" }}>
      {isSettingsConfig && isMobile && (
        <FormItem label="Backend URL" fieldName="backendUrl" errors={errors}>
          <FormInput
            // eslint-disable-next-line
            {...register(`backendUrl` as any, {
              validate: (v) => {
                if (!v) return true;
                try {
                  // Normalize accidental quotes before validating
                  const s = String(v)
                    .trim()
                    .replace(/^['"]+|['"]+$/g, "");
                  const parsed = new URL(s);
                  void parsed.href;
                  return true;
                } catch (_) {
                  return "Enter a valid URL (e.g., https://host/)";
                }
              },
            })}
            placeholder="https://your-intercom-manager/"
          />
        </FormItem>
      )}
      {isSettingsConfig && isMobile && (
        <FormItem
          label="Backend API Key"
          fieldName="backendApiKey"
          errors={errors}
        >
          <FormInput
            // eslint-disable-next-line
            {...register(`backendApiKey` as any)}
            type="password"
            placeholder="Optional service access token"
          />
        </FormItem>
      )}
      {isSettingsConfig && isMobile && (
        <FormItem label="Floating Controls">
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <PrimaryButton
              type="button"
              onClick={async () => {
                try {
                  await OverlayBubble.openOverlayPermission();
                } catch (_) {}
              }}
            >
              Open Permission Settings
            </PrimaryButton>
            <PrimaryButton
              type="button"
              onClick={() => setShowDebug((v) => !v)}
            >
              {showDebug ? "Hide Debug Info" : "Show Debug Info"}
            </PrimaryButton>
            {showDebug && (
              <div style={{ width: "100%", marginTop: 8 }}>
                <DebugPanel />
              </div>
            )}
          </div>
        </FormItem>
      )}
      {!preSelected && isJoinProduction && productions && (
        <FormItem label="Production Name" errors={errors}>
          <FormSelect
            // eslint-disable-next-line
            {...register(`productionId`)}
            onChange={(ev) => {
              setProduction(
                productions?.productions.find(
                  (p) => p.productionId === ev.target.value
                ) || null
              );
            }}
          >
            {productions.productions.map((p) => (
              <option key={p.productionId} value={p.productionId}>
                {p.name}
              </option>
            ))}
          </FormSelect>
          {productionListFetchError && (
            <FetchErrorMessage>
              The production list could not be fetched.
              {productionListFetchError.name} {productionListFetchError.message}
              .
            </FetchErrorMessage>
          )}
        </FormItem>
      )}
      {isSettingsConfig && (
        <FormItem label="Companion (Stream Deck)">
          <div style={{ display: "grid", gap: "0.6rem" }}>
            <div style={{ position: "relative" }}>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9aa3ab",
                  fontSize: "1.4rem",
                  pointerEvents: "none",
                }}
              >
                {protocol}
              </span>
              <FormInput
                style={{ paddingLeft: "5.6rem", marginBottom: 0 }}
                aria-label="WebSocket host and port"
                type="text"
                placeholder="host:port"
                value={hostPort}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  let withoutProtocol = v;
                  if (v.startsWith("ws://")) withoutProtocol = v.slice(5);
                  if (v.startsWith("wss://")) withoutProtocol = v.slice(6);
                  setHostPort(withoutProtocol);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    connectCompanion();
                  }
                }}
              />
            </div>
            <div
              style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}
            >
              {!isWSConnected ? (
                <PrimaryButton
                  type="button"
                  onClick={connectCompanion}
                  disabled={!hostPort}
                  className={isWSReconnecting ? "with-loader" : ""}
                >
                  {isWSReconnecting ? (
                    <Spinner className="companion-loader" />
                  ) : (
                    "Connect"
                  )}
                </PrimaryButton>
              ) : (
                <PrimaryButton type="button" onClick={wsDisconnect}>
                  Disconnect
                </PrimaryButton>
              )}
              <div style={{ opacity: 0.85 }}>
                Status:{" "}
                {isWSConnected
                  ? "connected"
                  : isWSReconnecting
                    ? "reconnecting"
                    : "disconnected"}
                {isConnectionConflict ? " • conflict" : ""}
              </div>
            </div>
          </div>
        </FormItem>
      )}
      {!preSelected &&
        isJoinProduction &&
        (addAdditionalCallId ? !!production : !!productions) && (
          <FormItem label="Line">
            <FormSelect
              // eslint-disable-next-line
              {...register(`lineId`, {
                required: "Line id is required",
                minLength: 1,
              })}
              style={{
                display: production ? "block" : "none",
                marginBottom: isAlreadyJoined ? 0 : undefined,
              }}
            >
              {production &&
                production.lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name || line.id}
                  </option>
                ))}
            </FormSelect>
            {!production && (
              <StyledWarningMessage>
                Please enter a production id
              </StyledWarningMessage>
            )}
            {isAlreadyJoined && (
              <StyledWarningMessage style={{ marginTop: "0.5rem" }}>
                You have already joined this line
              </StyledWarningMessage>
            )}
          </FormItem>
        )}
      {!hideUsername && (
        <FormItem label="Username" fieldName="username" errors={errors}>
          <FormInput
            // eslint-disable-next-line
            {...register(`username`, {
              required: !hideUsername ? "Username is required" : false,
              minLength: 1,
            })}
            placeholder="Username"
          />
        </FormItem>
      )}
      {!hideDevices && (isJoinProduction || isSettingsConfig) && (
        <>
          <DevicesSection>
            <SectionTitle>
              {isBrowserSafari ? "Device" : "Devices"}
              <ReloadDevicesButton />
              {isBrowserFirefox && <FirefoxWarning type="firefox-warning" />}
            </SectionTitle>
          </DevicesSection>
          <FormItem label="Audio device">
            <FormSelect
              // eslint-disable-next-line
              {...register(`audioinput`, {
                onChange: (e) => applyUserSetting("audioinput", e.target.value),
              })}
            >
              {devices.input && devices.input.length > 0 ? (
                <>
                  {!devices.input.some((d) => d.deviceId === "default") && (
                    <option value="default">Default</option>
                  )}
                  {devices.input.map((device, idx) => {
                    const label =
                      device.label?.trim() ||
                      (device.deviceId === "default"
                        ? "Default"
                        : `Microphone ${idx + 1}`);
                    return (
                      <option key={device.deviceId} value={device.deviceId}>
                        {label}
                      </option>
                    );
                  })}
                </>
              ) : (
                <option value="no-device">No device available</option>
              )}
            </FormSelect>
          </FormItem>
          {!isBrowserSafari && !isMobile && (
            <FormItem label="Output">
              {devices.output && devices.output.length > 0 ? (
                <FormSelect
                  // eslint-disable-next-line
                  {...register(`audiooutput`, {
                    onChange: (e) =>
                      applyUserSetting("audiooutput", e.target.value),
                  })}
                >
                  {!devices.output.some((d) => d.deviceId === "default") && (
                    <option value="default">Default</option>
                  )}
                  {devices.output.map((device, idx) => {
                    const label =
                      device.label?.trim() ||
                      (device.deviceId === "default"
                        ? "Default"
                        : `Output ${idx + 1}`);
                    return (
                      <option key={device.deviceId} value={device.deviceId}>
                        {label}
                      </option>
                    );
                  })}
                </FormSelect>
              ) : (
                <StyledWarningMessage>
                  Controlled by operating system
                </StyledWarningMessage>
              )}
            </FormItem>
          )}

          {/* Test tone at bottom below device selection */}
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.6rem" }}>
            {!tone.ctx ? (
              <PrimaryButton
                type="button"
                onClick={async () => {
                  try {
                    const AudioCtx =
                      (window as any).AudioContext ||
                      (window as any).webkitAudioContext;
                    const ctx = new AudioCtx();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.value = 440;
                    gain.gain.value = 0.06;
                    osc.connect(gain).connect(ctx.destination);
                    osc.start();
                    const stop = () => {
                      try {
                        osc.stop();
                      } catch {}
                      try {
                        osc.disconnect();
                      } catch {}
                      try {
                        gain.disconnect();
                      } catch {}
                      try {
                        ctx.close();
                      } catch {}
                      setTone({ ctx: null, stop: null });
                    };
                    setTone({ ctx, stop });
                  } catch {}
                }}
              >
                Play Test Tone
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="button"
                onClick={() => {
                  try {
                    tone.stop?.();
                  } catch {}
                }}
              >
                Stop Test Tone
              </PrimaryButton>
            )}
          </div>
        </>
      )}
      {isProgramOutputLine && isJoinProduction && (
        <CheckboxWrapper>
          <Checkbox
            label="Listener"
            checked={!isProgramUser}
            onChange={() => setIsProgramUser?.(false)}
          />
          <Checkbox
            label="Audio feed"
            checked={!!isProgramUser}
            onChange={() => setIsProgramUser?.(true)}
          />
        </CheckboxWrapper>
      )}
      <ButtonWrapper>
        <SubmitButton
          type="button"
          disabled={isJoinProduction ? !isValid || isAlreadyJoined : false}
          onClick={
            !needsConfirmation || isBrowserFirefox
              ? handleSubmit(onSubmit)
              : () => setConfirmModalOpen(true)
          }
          shouldSubmitOnEnter
        >
          {buttonText}
        </SubmitButton>
      </ButtonWrapper>

      {confirmModalOpen && (
        <ConfirmationModal
          title="Confirm"
          description="Are you sure you want to update your settings?"
          confirmationText="This will update the devices for all current lines."
          onConfirm={handleSubmit(onSubmit)}
          onCancel={() => setConfirmModalOpen(false)}
          shouldSubmitOnEnter
        />
      )}
    </div>
  );
};
