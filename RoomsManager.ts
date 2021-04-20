import { WebSocket } from './deps.ts';

interface RoomUser {
  name: string;
  socket: WebSocket;
}

type Rooms = Record<string, Room>;

class Room {
  constructor(name: string, initialUser?: RoomUser) {
    this.name = name;

    if (initialUser) {
      this.addUser(initialUser);
    }
  }

  public name: string;
  public users: RoomUser[] = [];

  hasUser(userName: string) {
    return this.users.some(user => user.name === userName);
  }

  addUser(user: RoomUser) {
    this.users.push(user);
    this.users.forEach(({ socket }) => {
      socket.send(JSON.stringify({ type: 'newUser', name: user.name}));
    })
  }

  removeUser(userName: string) {
    this.users = this.users.filter(user => user.name !== userName);
  }

  get length() {
    return this.users.length;
  }
}

export default class RoomsManager {
  public rooms: Rooms = {};

  roomExists(roomName: string): boolean {
    return !!this.rooms[roomName];
  }

  userNameIsTaken(roomName: string, userName: string): boolean {
    return this.roomExists(roomName) &&
      this.rooms[roomName].hasUser(userName);
  }

  join(roomName: string, user: RoomUser) {
    if (!this.roomExists(roomName)) {
      this.rooms[roomName] = new Room(roomName, user);
      user.socket.send(JSON.stringify({ type: 'roomCreated', name: roomName}));
      return;
    }

    const room = this.rooms[roomName];

    if (room.hasUser(user.name)) {
      user.socket.send('Username is taken!');
      return;
    }

    room.addUser(user);
    user.socket.send(JSON.stringify({ type: 'roomJoined', name: roomName}));
  }

  removeUserFromRoom(userName: string, roomName: string) {
    const room = this.rooms[roomName];

    if (room && room.hasUser(userName)) {
      room.removeUser(userName);

      if (room.length === 0) {
        delete this.rooms[roomName];
      }
    }
  }
}
