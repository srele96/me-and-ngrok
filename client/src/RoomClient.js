class RoomState {
  constructor(roomClient, room) {
    this.roomClient = roomClient;
    this.room = room;
  }

  join() {
    console.error('Invalid operation for current state');
  }

  leave() {
    console.error('Invalid operation for current state');
  }

  getStatusMessage() {
    return '';
  }
}

class DisconnectedState extends RoomState {
  join() {
    this.roomClient.setState(new JoiningState(this.roomClient, this.room));
    this.roomClient.socket.emit('room:join', { room: this.room });
  }

  getStatusMessage() {
    return `Not connected to ${this.room}`;
  }
}


class JoiningState extends RoomState {
  constructor(roomClient, room) {
    super(roomClient, room);

    this.setupListeners();
  }

  setupListeners() {
    this.successHandler = () => {
      this.roomClient.setState(new JoinedState(this.roomClient, this.room));
    };

    this.errorHandler = (error) => {
      this.roomClient.setState(new JoinErrorState(this.roomClient, this.room, error));
    };

    this.roomClient.socket.once('room:join:success', this.successHandler);
    this.roomClient.socket.once('room:join:error', this.errorHandler);
  }

  getStatusMessage() {
    return `Attempting to join the ${this.room}`;
  }
}

class JoinedState extends RoomState {
  leave() {
    this.roomClient.setState(new LeavingState(this.roomClient, this.room));
    this.roomClient.socket.emit('room:leave', { room: this.room });
  }

  getStatusMessage() {
    return `Successfully joined the ${this.room}`;
  }
}

class JoinErrorState extends RoomState {
  constructor(roomClient, room, error) {
    super(roomClient, room);
    this.error = error;
  }

  join() {
    this.roomClient.setState(new JoiningState(this.roomClient, this.room));
    this.roomClient.socket.emit('room:join', { room: this.room });
  }

  getStatusMessage() {
    return `Failed to join the ${this.room}: ${this.error}`;
  }
}

class LeavingState extends RoomState {
  constructor(roomClient, room) {
    super(roomClient, room);

    this.setupListeners();
  }

  setupListeners() {
    this.successHandler = () => {
      this.roomClient.setState(new DisconnectedState(this.roomClient, this.room));
    };

    this.errorHandler = (error) => {
      this.roomClient.setState(new LeaveErrorState(this.roomClient, this.room, error));
    };

    this.roomClient.socket.once('room:leave:success', this.successHandler);
    this.roomClient.socket.once('room:leave:error', this.errorHandler);
  }

  getStatusMessage() {
    return `Attempting to leave the ${this.room}`;
  }
}

class LeaveErrorState extends RoomState {
  constructor(roomClient, room, error) {
    super(roomClient, room);
    this.error = error;
  }

  leave() {
    this.roomClient.setState(new LeavingState(this.roomClient, this.room));
    this.roomClient.socket.emit('room:leave', { room: this.room });
  }

  getStatusMessage() {
    return `Failed to leave the ${this.room}: ${this.error}`;
  }
}

class RoomClient {
  constructor(socket, room) {
    this.socket = socket;
    this.room = room;
    this.state = new DisconnectedState(this, room)
  }

  setState(state) {
    this.state = state;
  }

  join() {
    this.state.join();
  }

  leave() {
    this.state.leave();
  }

  getStatusMessage() {
    return this.state.getStatusMessage();
  }
}

