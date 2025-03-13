import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { io } from 'socket.io-client';

const socket = io('http://localhost:7000', {
  // THE PATH MUST BE EXACTLY /api/socket-io/
  // THIS DOES NOT WORK /api/socket-io
  path: '/api/socket-io/',
});

const App = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onFooEvent(value) {
      setFooEvents(previous => [...previous, value]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('foo', onFooEvent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('foo', onFooEvent);
    };
  }, []);

  return (
    <div>
      <h1>SocketIO demo</h1>
      <p>{isConnected ? 'Connected' : 'Disconnected'}</p>
    </div>
  )
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
