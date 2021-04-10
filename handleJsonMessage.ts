import { WebSocket } from "https://deno.land/std@0.92.0/ws/mod.ts";

const users: string[] = [];

const handleLogin = (message: Record<string, unknown>, sock: WebSocket) => {
  const { userName } = message;

  if (typeof userName === 'string') {
    users.push(userName);
    sock.send("Your room is: Jeff") // use a uuid. We need a consistent room.
  }
};

export default (message: Record<string, unknown>, sock: WebSocket) => {
  switch(message.type) {
    case 'login':
      console.log('Trying to login!');
      handleLogin(message, sock);
      break;
    default:
      console.log(`Unrecognized message type: ${message.type}`);
  }
}
