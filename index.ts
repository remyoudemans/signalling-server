import {
  serve,
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket 
} from "./deps.ts";

import handleJsonMessage from './handleJsonMessage.ts';

const sockets = new Set<WebSocket>();

async function handleWs(sock: WebSocket) {
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
        handleJsonMessage(message, sock);
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

if (import.meta.main) {
  /** websocket echo server */
  const port = 8080;
  console.log(`websocket server is running on: ${port}`);
  for await (const req of serve({ port })) {
    const { conn, r: bufReader, w: bufWriter, headers } = req;
    acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    })
      .then(handleWs)
      .catch(async (err) => {
        console.error(`failed to accept websocket: ${err}`);
        await req.respond({ status: 400 });
      });
  }
}
