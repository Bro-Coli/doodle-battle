import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import type { EntityProfile, InteractionMatrix } from '@crayon-world/shared';

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

let savedMockAi: string | undefined;
let savedApiKey: string | undefined;

beforeEach(() => {
  savedMockAi = process.env.MOCK_AI;
  savedApiKey = process.env.ANTHROPIC_API_KEY;
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
  const { default: interactionsRouter } = await import('../src/routes/interactions');
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/interactions', interactionsRouter);
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
  const response = await fetch(`http://localhost:${port}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}

// Sample entity profile for use in tests
const wolfProfile: EntityProfile = {
  name: 'Wolf',
  archetype: 'walking',
  traits: ['predatory', 'pack animal'],
  role: 'Apex predator',
  speed: 7,
};

const eagleProfile: EntityProfile = {
  name: 'Eagle',
  archetype: 'flying',
  traits: ['sharp vision'],
  role: 'Aerial hunter',
  speed: 8,
};

const oakProfile: EntityProfile = {
  name: 'Oak',
  archetype: 'rooted',
  traits: ['sturdy', 'tall'],
  role: 'Ancient forest tree',
  speed: 0,
};

// ---- Tests ----

describe('POST /api/interactions — input validation', () => {
  it('returns 400 when entities is missing', async () => {
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

  it('returns 400 when entities is empty array', async () => {
    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, { entities: [] });
      expect(status).toBe(400);
      expect((data as Record<string, unknown>)['error']).toBeTruthy();
    } finally {
      await stopServer(server);
    }
  });
});

describe('POST /api/interactions — single entity edge case', () => {
  it('returns empty entries for single entity without calling AI', async () => {
    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, { entities: [wolfProfile] });
      expect(status).toBe(200);
      const matrix = data as InteractionMatrix;
      expect(Array.isArray(matrix.entries)).toBe(true);
      expect(matrix.entries).toHaveLength(0);
    } finally {
      await stopServer(server);
    }
  });
});

describe('POST /api/interactions — mock mode', () => {
  it('returns MOCK_INTERACTION_MATRIX when MOCK_AI=true', async () => {
    const testApp = await buildApp('true');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {
        entities: [wolfProfile, eagleProfile],
      });
      expect(status).toBe(200);
      const matrix = data as InteractionMatrix;
      expect(Array.isArray(matrix.entries)).toBe(true);
      expect(matrix.entries.length).toBeGreaterThan(0);
      // Each entry should have entityId (string) and relationships (object)
      for (const entry of matrix.entries) {
        expect(typeof entry.entityId).toBe('string');
        expect(typeof entry.relationships).toBe('object');
      }
    } finally {
      await stopServer(server);
    }
  });
});

describe('POST /api/interactions — real mode with mocked Anthropic', () => {
  it('calls Claude and returns validated InteractionMatrix', async () => {
    const mockCreate = await getMockCreate();

    // Simulate 2 entities: Wolf (id 0) and Eagle (id 1)
    const validResponse = JSON.stringify([
      {
        id: 0,
        relationships: { '1': 'ignore' },
      },
      {
        id: 1,
        relationships: { '0': 'ignore' },
      },
    ]);

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
    });

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {
        entities: [wolfProfile, eagleProfile],
      });
      expect(status).toBe(200);
      const matrix = data as InteractionMatrix;
      expect(Array.isArray(matrix.entries)).toBe(true);
      expect(matrix.entries).toHaveLength(2);
      expect(matrix.entries[0].entityId).toBe('0');
      expect(matrix.entries[0].relationships['1']).toBe('ignore');
    } finally {
      await stopServer(server);
    }
  });

  it('retries once on malformed response then falls back to all-ignore', async () => {
    const mockCreate = await getMockCreate();

    // Both attempts return garbage
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not JSON at all' }],
    });

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {
        entities: [wolfProfile, eagleProfile],
      });
      expect(status).toBe(200);
      const matrix = data as InteractionMatrix;
      expect(Array.isArray(matrix.entries)).toBe(true);
      expect(matrix.entries).toHaveLength(2);
      // All relationships should be 'ignore'
      for (const entry of matrix.entries) {
        for (const rel of Object.values(entry.relationships)) {
          expect(rel).toBe('ignore');
        }
      }
      // SDK was called twice (one initial + one retry)
      expect(mockCreate).toHaveBeenCalledTimes(2);
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
        entities: [wolfProfile, eagleProfile],
      });
      expect(status).toBe(502);
      expect((data as Record<string, unknown>)['error']).toBeTruthy();
    } finally {
      await stopServer(server);
    }
  });

  it('deduplicates entities by name before calling AI', async () => {
    const mockCreate = await getMockCreate();

    // With deduplication, only 1 unique entity — should return empty entries
    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      // Two entities with the same name — should deduplicate to 1 unique entity
      const { status, data } = await post(port, {
        entities: [wolfProfile, { ...wolfProfile }],
      });
      expect(status).toBe(200);
      const matrix = data as InteractionMatrix;
      // With 1 unique entity, returns empty entries (no AI call needed)
      expect(Array.isArray(matrix.entries)).toBe(true);
      expect(matrix.entries).toHaveLength(0);
      // SDK should NOT have been called since we end up with 1 unique entity
      expect(mockCreate).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it('deduplicates by name and sends only unique entities to AI', async () => {
    const mockCreate = await getMockCreate();

    // Wolf appears twice, Eagle once — deduplicated to 2 unique entities
    const validResponse = JSON.stringify([
      { id: 0, relationships: { '1': 'ignore' } },
      { id: 1, relationships: { '0': 'ignore' } },
    ]);
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
    });

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status } = await post(port, {
        entities: [wolfProfile, eagleProfile, { ...wolfProfile }],
      });
      expect(status).toBe(200);
      // Verify Claude was called exactly once with deduplicated prompt
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      // The user message should contain only 2 entities (Wolf + Eagle, not Wolf+Eagle+Wolf)
      const userMsg = callArgs.messages[0].content as string;
      // Count "id" occurrences — should be 2 (one per unique entity)
      const idMatches = userMsg.match(/- id \d+/g);
      expect(idMatches).toHaveLength(2);
    } finally {
      await stopServer(server);
    }
  });
});

describe('POST /api/interactions — entity profile integration', () => {
  it('handles three distinct entities and returns matrix with 3 entries', async () => {
    const mockCreate = await getMockCreate();

    const validResponse = JSON.stringify([
      { id: 0, relationships: { '1': 'chase', '2': 'ignore' } },
      { id: 1, relationships: { '0': 'flee', '2': 'ignore' } },
      { id: 2, relationships: { '0': 'ignore', '1': 'ignore' } },
    ]);
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
    });

    const testApp = await buildApp('false', 'sk-ant-test');
    const { server, port } = await startServer(testApp);
    try {
      const { status, data } = await post(port, {
        entities: [wolfProfile, eagleProfile, oakProfile],
      });
      expect(status).toBe(200);
      const matrix = data as InteractionMatrix;
      expect(matrix.entries).toHaveLength(3);
      // Wolf chases Eagle
      const wolfEntry = matrix.entries.find((e) => e.entityId === '0');
      expect(wolfEntry?.relationships['1']).toBe('chase');
      // Eagle flees Wolf
      const eagleEntry = matrix.entries.find((e) => e.entityId === '1');
      expect(eagleEntry?.relationships['0']).toBe('flee');
    } finally {
      await stopServer(server);
    }
  });
});
