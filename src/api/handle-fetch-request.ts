import type { ResponseLike } from "../http";

const isSuccessful = (r: { status: number }) =>
  r.status >= 200 && r.status <= 399;

export const handleFetchRequest = async <T>(
  fetchRequest: Promise<Response | ResponseLike>
): Promise<T> => {
  const response = (await fetchRequest) as Response | ResponseLike;
  let json: any = null;
  let text: string | null = null;

  const contentType = response.headers?.get?.("content-type");

  if (contentType && contentType.indexOf("text/plain") > -1) {
    text = await response.text();
  } else if (contentType && contentType.indexOf("application/json") > -1) {
    json = await (response as any).json();
  } else {
    // Fallback: try json first, then text
    try {
      json = await (response as any).json();
    } catch {
      try {
        text = await (response as any).text();
      } catch {
        // ignore
      }
    }
  }

  const ok = isSuccessful(response as any);

  if (!ok) {
    if (text) {
      throw new Error(text);
    }

    if (json && typeof json === "object" && "message" in json) {
      throw new Error((json as any).message as string);
    }

    throw new Error(`Response Code: ${(response as any).status}`);
  }

  return (text as any) || (json as T);
};
