import { io } from 'socket.io-client'

const SOCKET_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001'

let socket = null

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'], // websocket first — bypasses mobile carrier proxies
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
    })
  }
  return socket
}

export const connectSocket = () => {
  const s = getSocket()
  if (!s.connected && !s.active) s.connect()
  return s
}

export const safeEmit = (event, data) => {
  const s = getSocket()
  if (s.connected) {
    s.emit(event, data)
  } else {
    s.once('connect', () => s.emit(event, data))
    if (!s.active) s.connect()
  }
}

export const resetSocket = () => {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export const disconnectSocket = () => {
  if (socket && socket.connected) socket.disconnect()
}
