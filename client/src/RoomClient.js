import { useState } from 'react';

class RoomStateInterface {
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

class RoomState extends RoomStateInterface {
  // Rewrite to protected fields using _ notation.
  #roomClient = null;
  #roomId = null;

  constructor(roomClient, roomId) {
    super();

    if (roomClient) {
      this.#roomClient = roomClient;
    }
    if (roomId) {
      this.#roomId = roomId;
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
}

class LoadingState extends RoomState {
  constructor(roomClient) {
    super(roomClient, null);
  }

  load() {
    if (!this.roomClient) {
      throw new Error(
        'Failed to load room state. The internal property ' +
          '`this.roomClient` is missing.',
      );
    }

    this.roomClient.socket.emit('room:get');

    this.roomClient.socket.once('room:get:success', ({ roomId }) => {
      if (roomId) {
        this.roomClient.setState(new JoinedState(this.roomClient, roomId));
      } else {
        this.roomClient.setState(new InitialState(this.roomClient));
      }
    });

    this.roomClient.socket.once('room:get:error', () => {
      this.roomClient.setState(new LoadErrorState(this.roomClient, error));
    });
  }

  join(roomId) {
    throw new Error('Please wait while checking room status...');
  }

  leave() {
    throw new Error('Please wait while checking room status...');
  }

  getStatusMessage() {
    return 'Checking room status...';
  }
}

class LoadErrorState extends RoomState {
  /**
   * @param {any} roomClient
   * @param {Error} error
   */
  constructor(roomClient, error) {
    super(roomClient, null);
    this.error = error;
  }

  join(roomId) {
    this.roomClient.setState(new JoiningState(this.roomClient, roomId));
    this.roomClient.socket.emit('room:join', { roomId });
  }

  leave() {
    throw new Error('Cannot leave a room when room status is unknown.');
  }

  getStatusMessage() {
    return `Failed to load room status. ${this.error.message}`;
  }
}

class InitialState extends RoomState {
  constructor(roomClient) {
    super(roomClient, null);
  }

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
  constructor(roomClient, roomId) {
    super(roomClient, roomId);
  }

  join(roomId) {
    this.roomClient.setState(new JoiningState(this.roomClient, roomId));
    this.roomClient.socket.emit('room:join', { roomId });
  }

  leave() {
    throw new Error("Can't leave room while disconnected.");
  }

  getStatusMessage() {
    return 'Disconnected from the room.';
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
    return 'Attempting to join the room.';
  }
}

class JoinedState extends RoomState {
  constructor(roomClient, roomId) {
    super(roomClient, roomId);
  }

  join(roomId) {
    throw new Error(
      `Attempted to join the room ${roomId}. ` +
        `Can't join while already in the room.`,
    );
  }

  leave() {
    this.roomClient.setState(new LeavingState(this.roomClient, this.roomId));
    this.roomClient.socket.emit('room:leave', { roomId: this.roomId });
  }

  getStatusMessage() {
    return 'Successfully joined the the room.';
  }
}

class JoinErrorState extends RoomState {
  /**
   * @param {any} roomClient
   * @param {string} roomId
   * @param {Error} error
   */
  constructor(roomClient, roomId, error) {
    super(roomClient, roomId);
    this.error = error;
  }

  join() {
    this.roomClient.setState(new JoiningState(this.roomClient, this.roomId));
    this.roomClient.socket.emit('room:join', { roomId: this.roomId });
  }

  getStatusMessage() {
    return `Failed to join the room. ${this.error.message}`;
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
    return 'Attempting to leave the room.';
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
    return `Failed to leave the room. ${this.error.message}`;
  }
}

function useErrorMessage() {
  const CLEAN = 'CLEAN.';

  const [errorMessage, setErrorMessage] = useState(CLEAN);

  function withErrorHandling(fn) {
    return function (...args) {
      try {
        fn(...args);
        setErrorMessage(CLEAN);
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        }
      }
    };
  }

  return { getErrorMessage: () => errorMessage, withErrorHandling };
}

function useRoomClient(socket) {
  const [state, setState] = useState(new LoadingState());
  const { getErrorMessage, withErrorHandling } = useErrorMessage();

  if (!state.roomClient) {
    const roomClient = {
      state,
      setState,
      socket,
    };
    state.roomClient = roomClient;
    state.load();
  }

  /*
   * - What happens when I join?
   * - How does that affect leave?
   * - Join only 1 or multiple rooms?
   * - What does it mean when join and leave takes in a room id?
   * - On server we may have never left a room, but on the client we may not
   * know that?
   * - Room client could load room it's currently in.
   * - ...
   */
  return {
    join: withErrorHandling((roomId) => state.join(roomId)),
    // There is a bug when leaving a room. Leaving always tries to leave the room it has joined.
    leave: withErrorHandling(() => state.leave()),
    getStatusMessage: () => state.getStatusMessage(),
    getErrorMessage,
  };
}

export { useRoomClient };
