import { Client, Room } from '@colyseus/sdk';
import { API_URL } from '@/shared/api/api.config';

const COLYSEUS_URL = API_URL;

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

export async function joinFirstOpenRoom(name: string): Promise<Room | null> {
  const rooms = await listJoinableRooms();
  if (rooms.length === 0) return null;
  return joinByCode(rooms[0].roomId, name);
}

export interface JoinableRoom {
  roomId: string;
  clients: number;
  maxClients: number;
  drawingTime: number | null;
}

export async function listJoinableRooms(): Promise<JoinableRoom[]> {
  const res = await fetch(new URL('/api/rooms', API_URL).toString());
  if (!res.ok) throw new Error('Failed to load rooms');
  return (await res.json()) as JoinableRoom[];
}
