import { Client, Room } from '@colyseus/sdk';

const COLYSEUS_URL = 'http://localhost:3001';

let client: Client | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client(COLYSEUS_URL);
  }
  return client;
}

export async function connectToRoom(roomName: string = 'game_room'): Promise<Room> {
  const c = getClient();
  const room = await c.joinOrCreate(roomName);
  return room;
}

export async function verifySync(): Promise<void> {
  const room = await connectToRoom();
  console.log('[Colyseus] Connected to room:', room.id);
  console.log('[Colyseus] Initial state:', JSON.stringify(room.state));

  // Try multiple listener approaches for 0.17 compatibility
  room.onStateChange((state: any) => {
    console.log('[Colyseus] state changed — tick:', state?.tick);
  });

  // Auto-leave after 10 seconds
  setTimeout(() => {
    room.leave();
    console.log('[Colyseus] Left room after verification');
  }, 10000);
}

// Temporary — for Phase 10 verification only
if (typeof window !== 'undefined') {
  (window as any).__verifyColyseusSync = verifySync;
}
