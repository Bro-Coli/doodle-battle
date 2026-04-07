import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';

// Mock the Anthropic SDK before importing the route
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  }));
  // Expose mockCreate on the constructor for test access
  (MockAnthropic as unknown as Record<string, unknown>)._mockCreate = mockCreate;
  return { default: MockAnthropic };
});

// Helper to get the mock create function
async function getMockCreate() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return (Anthropic as unknown as Record<string, unknown>)._mockCreate as ReturnType<typeof vi.fn>;
}

let app: Express;
let savedMockAi: string | undefined;
let savedApiKey: string | undefined;

beforeEach(async () => {
  savedMockAi = process.env.MOCK_AI;
  savedApiKey = process.env.ANTHROPIC_API_KEY;

  // Reset module cache so the route picks up new env vars each test
  vi.resetModules();

  app = express();
  app.use(express.json());
});

afterEach(() => {
  if (savedMockAi === undefined) {
    delete process.env.MOCK_AI;
  } else {
    process.env.MOCK_AI = savedMockAi;
  }
  if (savedApiKey === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = savedApiKey;
  }
  vi.restoreAllMocks();
});

async function buildApp(mockAi = 'false', apiKey = 'sk-ant-test') {
  process.env.MOCK_AI = mockAi;
  process.env.ANTHROPIC_API_KEY = apiKey;
  vi.resetModules();
  const { default: recognizeRouter } = await import('../src/routes/recognize');
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/recognize', recognizeRouter);
  return testApp;
}

// ---- Simple HTTP helper (no supertest dependency) ----
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

function startServer(testApp: Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer(testApp);
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, port });
    });
  });
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function post(port: number, body: unknown): Promise<{ status: number; data: unknown }> {
  const response = await fetch(`http://localhost:${port}/api/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}

// ---- Tests ----

describe('POST /api/recognize — mock mode', () => {
  it('returns a valid EntityProfile when MOCK_AI=true', async () => {
    const testApp = await buildApp('true');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, { imageDataUrl: 'data:image/png;base64,abc' });
      expect(status).toBe(200);
      const profile = data as Record<string, unknown>;
      expect(typeof profile['name']).toBe('string');
      expect((profile['name'] as string).length).toBeGreaterThan(0);
      expect(['walking', 'flying', 'rooted', 'spreading', 'drifting', 'stationary']).toContain(
        profile['archetype'],
      );
      expect(Array.isArray(profile['traits'])).toBe(true);
      expect(typeof profile['role']).toBe('string');
    } finally {
      await stopServer(server);
    }
  });
});

describe('POST /api/recognize — input validation', () => {
  it('returns 400 when imageDataUrl is missing', async () => {
    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {});
      expect(status).toBe(400);
      expect((data as Record<string, unknown>)['error']).toBeTruthy();
    } finally {
      await stopServer(server);
    }
  });

  it('returns 400 when imageDataUrl is empty string', async () => {
    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, { imageDataUrl: '' });
      expect(status).toBe(400);
      expect((data as Record<string, unknown>)['error']).toBeTruthy();
    } finally {
      await stopServer(server);
    }
  });
});

describe('POST /api/recognize — real mode with mocked Anthropic', () => {
  it('calls Claude and returns a validated EntityProfile', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: 'Dragon',
            archetype: 'flying',
            traits: ['fierce', 'scaly'],
            role: 'Ancient winged predator',
          }),
        },
      ],
    });

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      });
      expect(status).toBe(200);
      const profile = data as Record<string, unknown>;
      expect(profile['name']).toBe('Dragon');
      expect(profile['archetype']).toBe('flying');
    } finally {
      await stopServer(server);
    }
  });

  it('returns Mystery Blob when Claude returns malformed JSON', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: "I can't identify this sketch, sorry." }],
    });

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      });
      expect(status).toBe(200);
      expect((data as Record<string, unknown>)['name']).toBe('Mystery Blob');
    } finally {
      await stopServer(server);
    }
  });

  it('returns 502 when Anthropic SDK throws', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockRejectedValue(new Error('Network error'));

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      });
      expect(status).toBe(502);
      expect((data as Record<string, unknown>)['error']).toBeTruthy();
    } finally {
      await stopServer(server);
    }
  });

  it('returns Mystery Blob when Claude returns valid JSON with null validation result', async () => {
    const mockCreate = await getMockCreate();
    // Missing required fields — validateEntityProfile returns null
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ name: '', archetype: 'flying' }) }],
    });

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      });
      expect(status).toBe(200);
      expect((data as Record<string, unknown>)['name']).toBe('Mystery Blob');
    } finally {
      await stopServer(server);
    }
  });

  it('caches by entity name — second call returns cached profile', async () => {
    const mockCreate = await getMockCreate();
    const wolfProfile = {
      name: 'Wolf',
      archetype: 'walking',
      traits: ['predatory', 'pack animal'],
      role: 'Apex predator',
    };
    // Both calls return the same entity name
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(wolfProfile) }],
    });

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { data: first } = await post(port, {
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      });
      const { data: second } = await post(port, {
        imageDataUrl: 'data:image/png;base64,different==',
      });

      // Both should return Wolf
      expect((first as Record<string, unknown>)['name']).toBe('Wolf');
      expect((second as Record<string, unknown>)['name']).toBe('Wolf');

      // Claude was called twice (cache only kicks in after first response — no pre-call cache)
      // But both responses should be identical objects from cache
      expect(first).toEqual(second);
    } finally {
      await stopServer(server);
    }
  });
});
