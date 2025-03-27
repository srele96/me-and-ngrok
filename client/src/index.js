import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { io } from 'socket.io-client';
import { useRoomClient } from './RoomClient';
import { useForm } from 'react-hook-form';

function useCreateRoom(socket) {
  const [status, setStatus] = useState('room:create:idle');

  const createRoom = (roomName) => {
    setStatus('room:create:pending');

    socket.emit('room:create', { roomName }, ({ success }) => {
      if (success) {
        setStatus('room:create:success');
      } else {
        setStatus('room:create:error');
      }
    });
  };

  return {
    status: () => status,
    fn: createRoom,
  };
}

function useRoomList(socket) {
  // Improve the room listing. Take emitted events from the server.
  // For example:
  // Notify server that we need initial data.
  // socket.emit('room:list:initialize')
  // Handle all incoming data through one event.
  // socket.on('room:list:data', addData)
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState('room:list:idle');

  useEffect(() => {
    setStatus('room:list:pending');

    socket.emit('room:list', null, (response) => {
      if (response.success) {
        setRooms((prevRooms) => {
          if (prevRooms.length === 0) {
            return response.rooms;
          } else {
            // I wonder if we ever can have duplicate rooms here...
            return [...response.rooms, ...prevRooms];
          }
        });
        setStatus('room:list:success');
      } else {
        setStatus('room:list:error');
      }
    });

    socket.on('room:create:success', (room) => {
      setRooms((prevRooms) => {
        if (prevRooms.length === 0) {
          return [room];
        } else {
          return [room, ...prevRooms];
        }
      });
      setStatus('room:list:success');
    });

    return () => {
      socket.off('room:create:success');
    };
  }, []);

  return { value: () => rooms, status: () => status };
}

function Game({ socket }) {
  const [notifications, setNotifications] = useState([]);
  const [sentString, setSentString] = useState(null);
  const [receivedString, setReceivedString] = useState({
    value: '',
    'x-user-id': '',
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const roomClient = useRoomClient(socket);
  const createRoom = useCreateRoom(socket);
  const roomList = useRoomList(socket);

  useEffect(() => {
    function onNotification(value) {
      setNotifications((previous) => [...previous, value]);
    }

    function onSendToBackend(value) {
      setReceivedString(value);
    }

    socket.on('notification', onNotification);
    socket.on('sendToFrontend', onSendToBackend);

    return () => {
      socket.off('notification', onNotification);
      socket.off('sendToFrontend', onSendToBacked);
    };
  }, [socket]);

  return (
    <div>
      <h1>Game</h1>
      {receivedString['x-user-id'] && (
        <div>x-user-id={receivedString['x-user-id']}</div>
      )}
      <button
        onClick={() => {
          function createRandomString() {
            return Array.from(crypto.getRandomValues(new Uint8Array(8)))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
          }
          const randomString = createRandomString();
          setSentString(randomString);
          socket.emit('sendToBackend', randomString);
        }}
      >
        <div>
          {sentString === null
            ? 'Click to send to backend'
            : `Sent to backend '${sentString}', received from backend '${receivedString.value}'`}
        </div>
      </button>
      <p>Notifications</p>
      <ul>
        {notifications.map((notification) => {
          return <li key={notification.id}>{notification.value}</li>;
        })}
      </ul>

      <div>
        <h2>Enter Room Name</h2>
        <form onSubmit={handleSubmit((data) => createRoom.fn(data.roomName))}>
          <div>
            <label htmlFor="roomName">Room Name</label>
            <input
              id="roomName"
              {...register('roomName', { required: 'Room name is required' })}
              placeholder="Enter room name"
            />
            {errors.roomName && <p>{errors.roomName.message}</p>}
          </div>
          <button type="submit">Create room</button>
        </form>
        <p>Status: {createRoom.status()}</p>
      </div>

      <div>
        <h2>Your Rooms</h2>
        <p>Status: {roomList.status()}</p>

        {roomList.value().length > 0 ? (
          <ul>
            {roomList.value().map((room) => (
              <li key={room.id}>{room.roomName}</li>
            ))}
          </ul>
        ) : (
          <p>No rooms available</p>
        )}
      </div>

      <div>
        <p>{roomClient.getStatusMessage()}</p>
        <button onClick={() => roomClient.join('roomId')}>Join</button>
        <h1>Room client</h1>
      </div>
    </div>
  );
}

async function createAsyncSocket() {
  const X_USER_ID = 'X-User-Id';

  let userId = localStorage.getItem(X_USER_ID);

  if (!userId) {
    const response = await fetch('/api/id/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}.`);
    }

    const { id } = await response.json();

    localStorage.setItem(X_USER_ID, id);

    userId = id;
  }

  return io('', {
    // THE PATH MUST BE EXACTLY /api/socket-io/
    // THIS DOES NOT WORK /api/socket-io
    path: '/api/socket-io/',
    extraHeaders: {
      [X_USER_ID]: userId,
    },
  });
}

function Initializing() {
  return <h1>Initializing application...</h1>;
}

function Error(props) {
  return <h1>An error occurred. {props.error.message}</h1>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Initializing />);

// The game relies heavily on the socket.
// Render the game once the socket is ready.
// Provide an absolute singleton instance to the game.
createAsyncSocket(false)
  .then((socket) => {
    root.render(<Game socket={socket} />);
  })
  .catch((error) => {
    root.render(<Error error={error} />);
  });
