import { getApiBaseUrl } from "../config";

export const generateWhipUrl = (
  productionId: string,
  lineId: string,
  username: string
): string => {
  const API_URL = getApiBaseUrl();

  return `${API_URL.replace(/\/+$/, "")}/whip/${productionId}/${lineId}/${encodeURIComponent(username)}`;
};
