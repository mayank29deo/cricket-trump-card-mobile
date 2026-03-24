import React, { useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, FlatList, Alert, Share
} from 'react-native'
import { getSocket } from '../lib/socket'
import useGameStore from '../store/gameStore'

const COLORS = {
  bg: '#0a1628', card: '#132040', border: '#1e3a5f',
  emerald: '#10b981', amber: '#f59e0b', slate: '#94a3b8', white: '#f1f5f9',
}

function getAvatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#1e40af', '#7c3aed', '#b45309', '#065f46', '#9f1239', '#1e3a5f']
  return colors[Math.abs(hash) % colors.length]
}

export default function LobbyScreen({ navigation, route }) {
  const { roomCode } = route.params
  const { roomData, myId, updateGameState, setRoom, setMyHand, setPhase } = useGameStore()
  const socketRef = useRef(null)

  const isHost = roomData?.host === myId
  const players = roomData?.players || []

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    socket.on('room_updated', ({ room }) => updateGameState(room))

    socket.on('game_started', ({ myHand, myId: id, gameState }) => {
      setRoom(gameState.code, gameState, id)
      setMyHand(myHand)
    })

    socket.on('phase_changed', (phaseData) => {
      setPhase(phaseData)
      navigation.replace('Game', { roomCode })
    })

    socket.on('error', ({ message }) => Alert.alert('Error', message))

    return () => {
      socket.off('room_updated')
      socket.off('game_started')
      socket.off('phase_changed')
      socket.off('error')
    }
  }, [roomCode])

  const handleStart = () => {
    const socket = getSocket()
    socket.emit('start_game', { roomCode, playerId: myId })
  }

  const handleLeave = () => {
    const socket = getSocket()
    socket.emit('leave_room', { roomCode, playerId: myId })
    navigation.goBack()
  }

  const handleShare = async () => {
    await Share.share({
      message: `Join my Cricket Trump Card game! Room code: ${roomCode}\nhttps://cricket-trump-card.vercel.app/join/${roomCode}`,
    })
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleLeave} style={styles.backBtn}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>WAITING ROOM</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Room code card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>ROOM CODE</Text>
          <Text style={styles.code}>{roomCode}</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Text style={styles.shareText}>📤 Invite Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Players list */}
        <Text style={styles.sectionLabel}>Players ({players.length}/6)</Text>
        <FlatList
          data={players}
          keyExtractor={p => p.id}
          style={styles.list}
          renderItem={({ item: p }) => (
            <View style={styles.playerRow}>
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(p.name) }]}>
                <Text style={styles.avatarText}>{p.name?.[0]?.toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName}>{p.name}</Text>
              <View style={styles.badges}>
                {p.id === myId && (
                  <View style={styles.youBadge}><Text style={styles.youText}>YOU</Text></View>
                )}
                {p.id === roomData?.host && (
                  <View style={styles.hostBadge}><Text style={styles.hostText}>HOST</Text></View>
                )}
              </View>
            </View>
          )}
        />

        {/* Time option display */}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>⏱ {roomData?.timeOption || 6} min game</Text>
          <Text style={styles.infoText}>🃏 52 cards from 104-card pool</Text>
        </View>

        {/* Action area */}
        {isHost ? (
          <View>
            {players.length < 2 && (
              <Text style={styles.waitText}>Need at least 2 players to start</Text>
            )}
            <TouchableOpacity
              style={[styles.startBtn, players.length < 2 && styles.startBtnDisabled]}
              onPress={handleStart}
              disabled={players.length < 2}
            >
              <Text style={styles.startBtnText}>START GAME ▶</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingText}>⏳ Waiting for host to start...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.slate, fontSize: 18 },
  heading: { color: COLORS.white, fontWeight: '900', fontSize: 16, letterSpacing: 2 },
  codeCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  codeLabel: { color: COLORS.slate, fontSize: 11, letterSpacing: 2, marginBottom: 8 },
  code: { fontSize: 36, fontWeight: '900', color: COLORS.amber, letterSpacing: 8, marginBottom: 14 },
  shareBtn: { backgroundColor: '#1e3a5f', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  shareText: { color: COLORS.white, fontWeight: '600' },
  sectionLabel: { color: COLORS.slate, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  list: { flex: 1, marginBottom: 12 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  playerName: { flex: 1, color: COLORS.white, fontWeight: '600', fontSize: 15 },
  badges: { flexDirection: 'row', gap: 6 },
  youBadge: { backgroundColor: '#064e3b', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  youText: { color: COLORS.emerald, fontSize: 10, fontWeight: '700' },
  hostBadge: { backgroundColor: '#78350f22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.amber },
  hostText: { color: COLORS.amber, fontSize: 10, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  infoText: { color: COLORS.slate, fontSize: 12 },
  waitText: { color: COLORS.slate, textAlign: 'center', fontSize: 13, marginBottom: 10 },
  startBtn: { backgroundColor: COLORS.emerald, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  waitingBox: { backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  waitingText: { color: COLORS.slate, fontWeight: '600' },
})
