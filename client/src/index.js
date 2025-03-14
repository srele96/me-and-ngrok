import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";

async function createIO() {
  try {
    const X_USER_ID = "X-User-Id";

    // websocket connection fails to be established
    // check if it is related to the SYNC in the docker-compose
    // becuase i am sure that websocket connection worked yesterday...
    // when i used SYNC and WATCH in docker-compose
    const response = await fetch("/api/id/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}.`);
    }

    const { id }= await response.json();

    sessionStorage.setItem(X_USER_ID, id);

    const socket = io("", {
      // THE PATH MUST BE EXACTLY /api/socket-io/
      // THIS DOES NOT WORK /api/socket-io
      path: "/api/socket-io/",
      extraHeaders: {
        [X_USER_ID]: id,
      },
    });

    window.dispatchEvent(
      new CustomEvent("socketIOReady", { detail: { socket } })
    );
  } catch (error) {
    window.dispatchEvent(
      new CustomEvent("socketIOError", { detail: { error } })
    );
  }
}

// Call outside of react tree to avoid creating multiple connections.
createIO();

function useSocket() {
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    function onSocketIOReady(event) {
      setSocket(event.detail.socket);
    }

    window.addEventListener("socketIOReady", onSocketIOReady);

    return () => {
      window.removeEventListener("socketIOReady", onSocketIOReady);
    };
  }, []);

  useEffect(() => {
    function onSocketIOError(event) {
      setError(event.detail.error);
    }
    window.addEventListener("socketIOError", onSocketIOError);
    return () => {
      window.removeEventListener("socketIOError", onSocketIOError);
    };
  }, []);

  return { socket, error };
}

const App = () => {
  const { socket, error } = useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [fooEvents, setFooEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onFooEvent(value) {
      setFooEvents((previous) => [...previous, value]);
    }

    function onNotification(value) {
      setNotifications(previous => [...previous, value]);
    }

    if (socket) {
      socket.on('notification', onNotification);
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("foo", onFooEvent);
    }

    return () => {
      if (socket) {
        socket.off('notification', onNotification);
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("foo", onFooEvent);
      }
    };
  }, [socket]);

  function createStatus() {
    if (!socket && !error) {
      return 'Creating socket...';
    } else {
      if (socket) {
        return isConnected ? 'Connected' : 'Disconnected';
      }
      if (error) {
        return 'Failed to create socket. ' + error.message;
      }
      return 'Something went horribly wrong...';
    }
  }

  return (
    <div>
      <h1>SocketIO demo</h1>
      <p>{createStatus()}</p>
      <p>Notifications</p>
      <ul>
        {notifications.map((notification) => {
          return <li key={notification.id}>{notification.value}</li>;
        })}
      </ul>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
