import { useState } from 'react';

class RoomState {
  #roomClient = null;
  #roomId = null;

  constructor(roomClient, roomId) {
    if (roomClient) {
      this.#roomClient = roomClient;
    }
    if (roomId) {
      this.roomId = roomId;
    }
  }

  set roomClient(roomClient) {
    if (roomClient) {
      this.#roomClient = roomClient;
    }
  }

  get roomClient() {
    return this.#roomClient;
  }

  set roomId(roomId) {
    if (roomId) {
      this.#roomId = roomId;
    }
  }

  get roomId() {
    return this.#roomId;
  }

  join(roomId) {
    throw new Error('Abstract method join(roomId).');
  }

  leave() {
    throw new Error('Abstract method leave().');
  }

  getStatusMessage() {
    throw new Error('Abstract method getStatusMessage().');
  }
}

class InitialState extends RoomState {
  join(roomId) {
    this.roomClient.setState(new JoiningState(this.roomClient, roomId));
    this.roomClient.socket.emit('room:join', { roomId });
  }

  leave() {
    throw new Error("You aren't in a room.");
  }

  getStatusMessage() {
    return 'Not connected to any rooms.';
  }
}

class DisconnectedState extends RoomState {
  join(roomId) {
    this.roomClient.setState(new JoiningState(this.roomClient, roomId));
    this.roomClient.socket.emit('room:join', { roomId });
  }

  getStatusMessage() {
    return `Disconnected from the room.`;
  }
}

class JoiningState extends RoomState {
  constructor(roomClient, roomId) {
    super(roomClient, roomId);
    this.setupListeners();
  }

  setupListeners() {
    this.successHandler = () => {
      this.roomClient.setState(new JoinedState(this.roomClient, this.roomId));
    };

    this.errorHandler = (error) => {
      this.roomClient.setState(
        new JoinErrorState(this.roomClient, this.roomId, error),
      );
    };

    this.roomClient.socket.once('room:join:success', this.successHandler);
    this.roomClient.socket.once('room:join:error', this.errorHandler);
  }

  join(roomId) {
    throw new Error(
      `Attempted to join the room ${roomId}. ` +
        `Can't join while joining the room.`,
    );
  }

  leave() {
    throw new Error(
      "Attempted to leave the room. Can't leave while joining the room.",
    );
  }

  getStatusMessage() {
    return `Attempting to join the room.`;
  }
}

class JoinedState extends RoomState {
  leave() {
    this.roomClient.setState(new LeavingState(this.roomClient, this.roomId));
    this.roomClient.socket.emit('room:leave', { roomId: this.roomId });
  }

  getStatusMessage() {
    return `Successfully joined the the room.`;
  }
}

class JoinErrorState extends RoomState {
  constructor(roomClient, roomId, error) {
    super(roomClient, roomId);
    this.error = error;
  }

  join() {
    this.roomClient.setState(new JoiningState(this.roomClient, this.roomId));
    this.roomClient.socket.emit('room:join', { roomId: this.roomId });
  }

  getStatusMessage() {
    return `Failed to join the room.`;
  }
}

class LeavingState extends RoomState {
  constructor(roomClient, roomId) {
    super(roomClient, roomId);
    this.setupListeners();
  }

  setupListeners() {
    this.successHandler = () => {
      this.roomClient.setState(
        new DisconnectedState(this.roomClient, this.roomId),
      );
    };

    this.errorHandler = (error) => {
      this.roomClient.setState(
        new LeaveErrorState(this.roomClient, this.roomId, error),
      );
    };

    this.roomClient.socket.once('room:leave:success', this.successHandler);
    this.roomClient.socket.once('room:leave:error', this.errorHandler);
  }

  getStatusMessage() {
    return `Attempting to leave the room.`;
  }
}

class LeaveErrorState extends RoomState {
  constructor(roomClient, roomId, error) {
    super(roomClient, roomId);
    this.error = error;
  }

  leave() {
    this.roomClient.setState(new LeavingState(this.roomClient, this.roomId));
    this.roomClient.socket.emit('room:leave', { roomId: this.roomId });
  }

  getStatusMessage() {
    return `Failed to leave the room.`;
  }
}

function useRoomClient(socket) {
  const [state, setState] = useState(new InitialState());

  if (!state.roomClient) {
    const roomClient = {
      state,
      setState,
      socket,
    };
    state.roomClient = roomClient;
  }

  return {
    join(roomId) {
      state.join(roomId);
    },
    leave(roomId) {
      state.leave();
    },
    getStatusMessage() {
      return state.getStatusMessage();
    },
  };
}

export { useRoomClient };
