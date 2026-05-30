import type { ResponseLike } from "../http";

const isSuccessful = (r: { status: number }) =>
  r.status >= 200 && r.status <= 399;

export const handleFetchRequest = async <T>(
  fetchRequest: Promise<Response | ResponseLike>
): Promise<T> => {
  const response = (await fetchRequest) as Response | ResponseLike;
  let json: unknown = null;
  let text: string | null = null;

  const contentType = response.headers?.get?.("content-type");

  if (contentType && contentType.indexOf("text/plain") > -1) {
    text = await response.text();
  } else if (contentType && contentType.indexOf("application/json") > -1) {
    json = await response.json();
  } else {
    try {
      json = await response.json();
    } catch {
      try {
        text = await response.text();
      } catch {
        // ignore
      }
    }
  }

  const isSuccess = isSuccessful(response);

  if (!isSuccess) {
    const { status } = response;
    let err: Error;
    if (text) {
      err = new Error(text);
    } else if (
      json &&
      typeof json === "object" &&
      json !== null &&
      "message" in json
    ) {
      err = new Error(String((json as { message: string }).message));
    } else {
      err = new Error(response.statusText || "Unknown error");
    }
    (err as Error & { status?: number }).status = status;
    throw err;
  }

  return (text as T) || (json as T);
};
