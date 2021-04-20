# Signalling server

This is a naive and under-researched implementation of a webRTC signalling server, written with [deno](https://deno.land/).

It's made to work with https://github.com/remyoudemans/try-webrtc, which uses [simple-peer](https://github.com/feross/simple-peer) to facilitate connecting.

To run it, run the following command in the root directory:
```shell
deno run --allow-net index.ts
```

To run it during development, use:
```shell
deno run --allow-net --unstable --watch index.ts
```

## Flaws
- stores rooms and user data in memory, so will run out of day real quick
- hasn't yet abstracted away the JSON stringifying and parsing for websocket messages
- reinvents the wheel by not using a websocket library
- is missing a lot of error handling
- it's not serverless. It would make more sense to do implement this with Cloudflare Workers cause [they support websockets now](https://support.cloudflare.com/hc/en-us/articles/200169466-Using-Cloudflare-with-WebSockets).
