import {
  serve,
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket 
} from "./deps.ts";

const sockets = new Set<WebSocket>();

class WebSocketServer {
  private port: number;
  private rooms: Record<string, { users: { name: string, socket: WebSocket }[] }> = {};

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
    sockets.add(sock);
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

          sock.send(`Length: ${sockets.size}`);
          this.handleJsonMessage(message, sock);
        } else if (ev instanceof Uint8Array) {
          console.log("ws:Binary", ev);
        } else if (isWebSocketPingEvent(ev)) {
          const [, body] = ev;
          console.log("ws:Ping", body);
        } else if (isWebSocketCloseEvent(ev)) {
          const { code, reason } = ev;
          console.log("ws:Close", code, reason);
          sockets.delete(sock);
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
    const { userName, room } = message;

    // TODO: refacator the heck out of this. A room can defo be its own class.

    if ([userName, room].some(x => typeof x !== 'string' || !x)) {
      sock.send("userName and room are required:");
      sock.close();
      return;
    }

    if (this.rooms[room as string]) {
      console.log('Room exists!');

      if (this.rooms[room as string].users.some(user => user.name === userName)) {
        sock.send('Username is taken!')
      } else {
        this.rooms[room as string].users.push({ name: userName as string, socket: sock })

        this.rooms[room as string].users.forEach(user => {
          user.socket.send(`Everbody welcome ${userName}!`)
        })
      }
    } else {
      this.rooms[room as string] = {
        users: [{ name: userName as string, socket: sock }]
      }

      sock.send(`New room ${room} created!`)
    }
  }

}

if (import.meta.main) {
  new WebSocketServer();
}
