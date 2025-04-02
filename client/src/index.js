import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { io } from 'socket.io-client';
import { useRoomClient } from './RoomClient';
import { useForm } from 'react-hook-form';

/**
 * @typedef {Object} CreateRoom
 * @property {() => string} status
 * @property {(string) => void} fn
 */

/**
 *
 * @param {import("socket.io-client").Socket} socket
 * @returns {CreateRoom}
 */
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
  const [received, setReceived] = useState({
    value: '',
    userID: '',
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

    function onSendToFrontend(value) {
      setReceived(value);
    }

    socket.on('notification', onNotification);
    socket.on('sendToFrontend', onSendToFrontend);

    return () => {
      socket.off('notification', onNotification);
      socket.off('sendToFrontend', onSendToFrontend);
    };
  }, [socket]);

  return (
    <div>
      <h1>Game</h1>
      {received.userID && <div>userID={received.userID}</div>}
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
            : `Sent to backend '${sentString}', received from backend '${received.value}'`}
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
        <p>Current room status: {roomClient.getStatusMessage()}</p>
        <p>Room list status: {roomList.status()}</p>

        {roomList.value().length > 0 ? (
          <ul>
            {roomList.value().map((room) => (
              <li key={room.id}>
                {room.roomName}{' '}
                <button onClick={() => roomClient.join(room.id)}>Join</button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No rooms available</p>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <Game
    socket={io('', {
      // THE PATH MUST BE EXACTLY /api/socket-io/
      // THIS DOES NOT WORK /api/socket-io
      path: '/api/socket-io/',
    })}
  />,
);
