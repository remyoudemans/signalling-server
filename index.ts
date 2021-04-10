import {
  serve,
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket 
} from "./deps.ts";

import RoomsManager from './RoomsManager.ts';

class WebSocketServer {
  private port: number;

  // TODO: remember memory is finite :) 
  private roomsManager = new RoomsManager();
  private socketToUserInRoomMap = new Map<WebSocket, { userName: string, roomName: string }>();

  constructor(port = 8080) {
    this.port = port;
    this.start();
  }

  async start() {
    console.log(`websocket server is running on: ${this.port}`);
    for await (const req of serve({ port: this.port })) {
      const { conn, r: bufReader, w: bufWriter, headers } = req;
      acceptWebSocket({
        conn,
        bufReader,
        bufWriter,
        headers,
      })
        .then(x => this.handleWs(x)) // `this` shenanigans
        .catch(async (err) => {
          console.error(`failed to accept websocket: ${err}`);
          await req.respond({ status: 400 });
        });
    }
  }

  async handleWs(sock: WebSocket) {
    console.log("socket connected!");
    try {
      for await (const ev of sock) {
        if (typeof ev === "string") {
          console.log("ws:Text", ev);
          let message;

          try {
            message = JSON.parse(ev);
          } catch {
            message = {};
          }

          this.handleJsonMessage(message, sock);
        } else if (ev instanceof Uint8Array) {
          console.log("ws:Binary", ev);
        } else if (isWebSocketPingEvent(ev)) {
          const [, body] = ev;
          console.log("ws:Ping", body);
        } else if (isWebSocketCloseEvent(ev)) {
          const { code, reason } = ev;
          console.log("ws:Close", code, reason);
          const { roomName, userName } = this.socketToUserInRoomMap.get(sock) || {};

          if (roomName && userName) {
            this.roomsManager.removeUserFromRoom(userName, roomName);
            this.socketToUserInRoomMap.delete(sock);
          }
        }
      }
    } catch (err) {
      console.error(`failed to receive frame: ${err}`);

      if (!sock.isClosed) {
        await sock.close(1000).catch(console.error);
      }
    }
  }

  handleJsonMessage(message: Record<string, unknown>, sock: WebSocket) {
    switch(message.type) {
      case 'login':
        console.log('Trying to login!');
        this.handleLogin(message, sock);
        break;
      default:
        console.log(`Unrecognized message type: ${message.type}`);
    }
  }

  handleLogin(message: Record<string, unknown>, sock: WebSocket) {
    const { userName, room: roomName } = message;

    if (typeof userName !== 'string' || !userName.length || typeof roomName !== 'string' || !roomName.length) {
      sock.send("userName and roomName are required:");
      sock.close();
      return;
    }

    this.roomsManager.join(
      roomName,
      { name: userName, socket: sock }
    );

    this.socketToUserInRoomMap.set(sock, { userName, roomName });
  }
}

if (import.meta.main) {
  new WebSocketServer();
}
