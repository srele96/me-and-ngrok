import React, { useState, useEffect } from 'react';

// Room context to manage room state across components
export const RoomContext = React.createContext({
  rooms: [],
  currentRoom: null,
  createRoom: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
});

// Custom hook for room functionality
export function useRoomManager(socket) {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    function onRoomCreated(room) {
      setRooms((prev) => [...prev, room]);
      setError(null);
    }

    function onRoomError(err) {
      setError(err.message);
    }

    function onRoomsList(roomsList) {
      setRooms(roomsList);
    }

    socket.on('room:created', onRoomCreated);
    socket.on('room:error', onRoomError);
    socket.on('room:list', onRoomsList);

    // Request initial rooms list
    socket.emit('room:list');

    return () => {
      socket.off('room:created', onRoomCreated);
      socket.off('room:error', onRoomError);
      socket.off('room:list', onRoomsList);
    };
  }, [socket]);

  const createRoom = (roomName) => {
    if (!socket) return;
    socket.emit('room:create', { roomName });
  };

  const joinRoom = (roomId) => {
    if (!socket) return;
    socket.emit('room:join', { roomId });
    setCurrentRoom(roomId);
  };

  const leaveRoom = () => {
    if (!socket || !currentRoom) return;
    socket.emit('room:leave', { roomId: currentRoom });
    setCurrentRoom(null);
  };

  return {
    rooms,
    currentRoom,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}

// Room creation form component
export function RoomCreationForm() {
  const [roomName, setRoomName] = useState('');
  const { socket } = React.useContext(SocketContext);
  const { createRoom, error } = useRoomManager(socket);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      createRoom(roomName.trim());
      setRoomName('');
    }
  };

  return (
    <div className="room-creation">
      <h2>Create New Room</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter room name"
          required
        />
        <button type="submit">Create Room</button>
      </form>
    </div>
  );
}

// Room list component
export function RoomsList() {
  const { socket } = React.useContext(SocketContext);
  const { rooms, joinRoom, currentRoom } = useRoomManager(socket);

  return (
    <div className="rooms-list">
      <h2>Available Rooms</h2>
      {rooms.length === 0 ? (
        <p>No rooms available</p>
      ) : (
        <ul>
          {rooms.map((room) => (
            <li key={room.id}>
              {room.name}
              {currentRoom !== room.id && (
                <button onClick={() => joinRoom(room.id)}>Join</button>
              )}
              {currentRoom === room.id && <span> (Joined)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Socket context for providing socket instance
export const SocketContext = React.createContext({ socket: null });

// Provider component to wrap application
export function RoomProvider({ children, socket }) {
  const roomManager = useRoomManager(socket);

  return (
    <SocketContext.Provider value={{ socket }}>
      <RoomContext.Provider value={roomManager}>
        {children}
      </RoomContext.Provider>
    </SocketContext.Provider>
  );
}
