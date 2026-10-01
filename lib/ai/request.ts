const maxRequestBytes = 16 * 1024;

type AiRequestResult =
  | { success: true; data: unknown }
  | { success: false; status: 400 | 413 | 415; error: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function parseAiRequest(request: Request): Promise<AiRequestResult> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { success: false, status: 415, error: "Send a JSON request." };
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    return { success: false, status: 413, error: "Request is too large." };
  }

  if (!request.body) {
    return { success: false, status: 400, error: "Invalid JSON body." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxRequestBytes) {
      await reader.cancel();
      return { success: false, status: 413, error: "Request is too large." };
    }
    chunks.push(value);
  }
  reader.releaseLock();

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { success: true, data: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { success: false, status: 400, error: "Invalid JSON body." };
  }
}