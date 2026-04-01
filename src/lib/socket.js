import { io } from 'socket.io-client'

export const PRIMARY_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001'
export const FALLBACK_URL = 'https://cricket-trump-card.onrender.com'

let socket = null
let activeUrl = PRIMARY_URL

export const setActiveUrl = (url) => { activeUrl = url }

const SOCKET_OPTIONS = {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
}

export const getSocket = () => {
  if (!socket) {
    socket = io(activeUrl, SOCKET_OPTIONS)
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
