import { Client, Room } from '@colyseus/sdk';

const COLYSEUS_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

let client: Client | null = null;
let activeRoom: Room | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client(COLYSEUS_URL);
  }
  return client;
}

export function getActiveRoom(): Room | null {
  return activeRoom;
}

/**
 * Leave the active room (if any) and clear the singleton reference.
 * Safe to call when no room is active. Idempotent.
 */
export function leaveActiveRoom(): void {
  const room = activeRoom;
  activeRoom = null;
  if (room) {
    try {
      room.leave();
    } catch {
      // Ignore — connection may already be closed
    }
  }
}

export async function createRoom(options: {
  name: string;
  maxPlayers?: number;
  maxRounds?: number;
  drawingTime?: number;
  isPrivate?: boolean;
}): Promise<Room> {
  const room = await getClient().create('game_room', options);
  activeRoom = room;
  return room;
}

export async function joinByCode(code: string, name: string): Promise<Room> {
  const room = await getClient().joinById(code.toUpperCase(), { name });
  activeRoom = room;
  return room;
}

export async function quickPlay(name: string): Promise<Room> {
  const room = await getClient().joinOrCreate('game_room', { name, isPrivate: false });
  activeRoom = room;
  return room;
}
