import type { EntityProfile } from '@crayon-world/shared';

const RECOGNIZE_URL = '/api/recognize';
const RETRY_DELAY_MS = 1000;

async function postRecognize(dataUrl: string): Promise<EntityProfile> {
  const response = await fetch(RECOGNIZE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl: dataUrl }),
  });

  if (!response.ok) {
    let message = 'Recognition failed';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.json() as Promise<EntityProfile>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function recognizeDrawing(dataUrl: string): Promise<EntityProfile> {
  try {
    return await postRecognize(dataUrl);
  } catch {
    // Silent retry after delay
    await delay(RETRY_DELAY_MS);
    return postRecognize(dataUrl);
  }
}
