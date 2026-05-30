import { getApiBaseUrl, getApiKey } from "../config";
import { httpRequest } from "../http";
import { handleFetchRequest } from "./handle-fetch-request.ts";

const API_BASE = () => getApiBaseUrl();
const authHeader = (): Record<string, string> => {
  const key = getApiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
};

export type TPresetCall = {
  productionId: string;
  lineId: string;
  lineUsedForProgramOutput?: boolean;
  isProgramUser?: boolean;
  lineName?: string;
};

export type TPreset = {
  _id: string;
  name: string;
  calls: TPresetCall[];
  createdAt: string;
  isLocal?: boolean;
  companionUrl?: string;
};

type TCreateProductionOptions = {
  name: string;
  lines: { name: string; programOutputLine?: boolean }[];
};

type TParticipant = {
  name: string;
  sessionId: string;
  endpointId: string;
  isActive: boolean;
  isWhip: boolean;
};

type TLine = {
  name: string;
  id: string;
  smbConferenceId: string;
  participants: TParticipant[];
  programOutputLine?: boolean;
};

export type TBasicProductionResponse = {
  name: string;
  productionId: string;
  lines: TLine[];
};

export type TListProductionsResponse = {
  productions: TBasicProductionResponse[];
  offset: 0;
  limit: 0;
  totalItems: 0;
};

type TOfferAudioSessionOptions = {
  productionId: number;
  lineId: number;
  username: string;
};

type TOfferAudioSessionResponse = {
  sdp: string;
  sessionId: string;
};

type TPatchAudioSessionOptions = {
  sessionId: string;
  sdpAnswer: string;
};

type TPatchAudioSessionResponse = null;

type TDeleteAudioSessionOptions = {
  sessionId: string;
};

type THeartbeatOptions = {
  sessionId: string;
};

export type TShareUrlOptions = {
  path: string;
};

type TShareUrlResponse = {
  url: string;
};

type TUpdateProductionNameOptions = {
  productionId: string;
  name: string;
};

type TUpdateLineNameOptions = {
  productionId: string;
  lineId: string;
  name: string;
};

export const API = {
  createProduction: async ({ name, lines }: TCreateProductionOptions) =>
    handleFetchRequest<TBasicProductionResponse>(
      httpRequest(`${API_BASE()}production/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          name,
          lines,
        }),
      })
    ),
  updateProductionName: async ({
    productionId,
    name,
  }: TUpdateProductionNameOptions) =>
    handleFetchRequest<TBasicProductionResponse>(
      httpRequest(`${API_BASE()}production/${productionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          name,
        }),
      })
    ),
  updateLineName: async ({
    productionId,
    lineId,
    name,
  }: TUpdateLineNameOptions) =>
    handleFetchRequest<TBasicProductionResponse>(
      httpRequest(`${API_BASE()}production/${productionId}/line/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          name,
        }),
      })
    ),
  listProductions: ({
    searchParams,
  }: {
    searchParams: string;
  }): Promise<TListProductionsResponse> =>
    handleFetchRequest<TListProductionsResponse>(
      httpRequest(`${API_BASE()}productionlist?${searchParams}`, {
        method: "GET",
        headers: { ...authHeader() },
      })
    ),
  fetchProduction: (id: number): Promise<TBasicProductionResponse> =>
    handleFetchRequest<TBasicProductionResponse>(
      httpRequest(`${API_BASE()}production/${id}`, {
        method: "GET",
        headers: { ...authHeader() },
      })
    ),
  deleteProduction: (id: string): Promise<string> =>
    handleFetchRequest<string>(
      httpRequest(`${API_BASE()}production/${id}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      })
    ),
  listProductionLines: (id: number) =>
    handleFetchRequest<TLine[]>(
      httpRequest(`${API_BASE()}production/${id}/line`, {
        method: "GET",
        headers: { ...authHeader() },
      })
    ),
  fetchProductionLine: (productionId: number, lineId: number): Promise<TLine> =>
    handleFetchRequest<TLine>(
      httpRequest(`${API_BASE()}production/${productionId}/line/${lineId}`, {
        method: "GET",
        headers: { ...authHeader() },
      })
    ),
  addProductionLine: (
    productionId: string,
    name: string,
    programOutputLine?: boolean
  ): Promise<TLine> =>
    handleFetchRequest<TLine>(
      httpRequest(`${API_BASE()}production/${productionId}/line`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          name,
          programOutputLine,
        }),
      })
    ),
  deleteProductionLine: (
    productionId: string,
    lineId: string
  ): Promise<string> =>
    handleFetchRequest<string>(
      httpRequest(`${API_BASE()}production/${productionId}/line/${lineId}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      })
    ),

  offerAudioSession: ({
    productionId,
    lineId,
    username,
  }: TOfferAudioSessionOptions): Promise<TOfferAudioSessionResponse> =>
    handleFetchRequest<TOfferAudioSessionResponse>(
      httpRequest(`${API_BASE()}session/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          productionId,
          lineId,
          username,
        }),
      })
    ),
  patchAudioSession: ({
    sessionId,
    sdpAnswer,
  }: TPatchAudioSessionOptions): Promise<TPatchAudioSessionResponse> =>
    handleFetchRequest<TPatchAudioSessionResponse>(
      httpRequest(`${API_BASE()}session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          sdpAnswer,
        }),
      })
    ),
  deleteAudioSession: ({
    sessionId,
  }: TDeleteAudioSessionOptions): Promise<string> =>
    handleFetchRequest<string>(
      httpRequest(`${API_BASE()}session/${sessionId}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      })
    ),
  heartbeat: ({ sessionId }: THeartbeatOptions): Promise<string> =>
    handleFetchRequest<string>(
      httpRequest(`${API_BASE()}heartbeat/${sessionId}`, {
        method: "GET",
        headers: { ...authHeader() },
      })
    ),
  shareUrl: ({ path }: TShareUrlOptions): Promise<TShareUrlResponse> => {
    return handleFetchRequest<TShareUrlResponse>(
      httpRequest(`${API_BASE()}share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          path,
        }),
      })
    );
  },
  reauth: async (): Promise<void> => {
    return handleFetchRequest<void>(
      httpRequest(`${API_BASE()}reauth`, {
        method: "GET",
        headers: { ...authHeader() },
      })
    );
  },
  createPreset: (options: {
    name: string;
    calls: TPresetCall[];
    companionUrl?: string;
  }): Promise<TPreset> =>
    handleFetchRequest<TPreset>(
      httpRequest(`${API_BASE()}preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(options),
      })
    ),
  listPresets: (): Promise<{ presets: TPreset[] }> =>
    handleFetchRequest<{ presets: TPreset[] }>(
      httpRequest(`${API_BASE()}preset`, {
        method: "GET",
        headers: { ...authHeader() },
      })
    ),
  deletePreset: async (id: string): Promise<void> => {
    const response = await httpRequest(`${API_BASE()}preset/${id}`, {
      method: "DELETE",
      headers: { ...authHeader() },
    });
    if (response.status !== 204) {
      await handleFetchRequest<void>(Promise.resolve(response));
    }
  },
  updatePreset: (
    id: string,
    update: {
      name?: string;
      calls?: TPresetCall[];
      companionUrl?: string | null;
    }
  ): Promise<TPreset> =>
    handleFetchRequest<TPreset>(
      httpRequest(`${API_BASE()}preset/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(update),
      })
    ),
};
