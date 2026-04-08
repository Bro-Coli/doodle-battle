import { Room } from '@colyseus/core';
import { Schema, type } from '@colyseus/schema';

export class PingState extends Schema {
  @type('number') tick: number = 0;
}

export class GameRoom extends Room<PingState> {
  state = new PingState();

  onCreate() {
    this.setSimulationInterval(() => {
      this.state.tick += 1;
    }, 1000);
  }
}
