import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { connectSocket, getSocket, resetSocket } from '../lib/socket'
import useGameStore from '../store/gameStore'

const COLORS = {
  bg: '#0a1628',
  card: '#132040',
  border: '#1e3a5f',
  emerald: '#10b981',
  amber: '#f59e0b',
  slate: '#94a3b8',
  white: '#f1f5f9',
  red: '#ef4444',
}

const TIME_OPTIONS = [
  { value: 4, label: '4 min', sub: 'Quick Match' },
  { value: 6, label: '6 min', sub: 'Standard' },
  { value: 10, label: '10 min', sub: 'Extended' },
]

export default function HomeScreen({ navigation }) {
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [timeOption, setTimeOption] = useState(6)
  const [tab, setTab] = useState('create') // 'create' | 'join'
  const [loading, setLoading] = useState(false)

  const { setRoom, setIdentity, myId, myName } = useGameStore()

  const playerId = myId || Math.random().toString(36).slice(2)

  const handleCreate = () => {
    const playerName = name.trim()
    if (!playerName) { Alert.alert('Enter your name'); return }
    setLoading(true)
    setIdentity(playerId, playerName)

    const socket = connectSocket()
    const timeout = setTimeout(() => {
      setLoading(false)
      Alert.alert('Connection failed', 'Server took too long to respond.')
    }, 15000)

    socket.once('room_created', ({ room }) => {
      clearTimeout(timeout)
      setLoading(false)
      setRoom(room.code, room, playerId)
      navigation.navigate('Lobby', { roomCode: room.code })
    })
    socket.once('error', ({ message }) => {
      clearTimeout(timeout)
      setLoading(false)
      Alert.alert('Error', message)
    })

    const doEmit = () => socket.emit('create_room', {
      player: { id: playerId, name: playerName },
      timeOption,
    })
    if (socket.connected) doEmit()
    else socket.once('connect', doEmit)
  }

  const handleJoin = () => {
    const playerName = name.trim()
    const code = joinCode.trim().toUpperCase()
    if (!playerName) { Alert.alert('Enter your name'); return }
    if (!code || code.length < 4) { Alert.alert('Enter a valid room code'); return }
    setLoading(true)
    setIdentity(playerId, playerName)

    const socket = connectSocket()
    const timeout = setTimeout(() => {
      setLoading(false)
      Alert.alert('Connection failed', 'Server took too long to respond.')
    }, 15000)

    socket.once('room_joined', ({ room }) => {
      clearTimeout(timeout)
      setLoading(false)
      setRoom(room.code, room, playerId)
      navigation.navigate('Lobby', { roomCode: room.code })
    })
    socket.once('error', ({ message }) => {
      clearTimeout(timeout)
      setLoading(false)
      Alert.alert('Error', message)
    })

    const doEmit = () => socket.emit('join_room', {
      roomCode: code,
      player: { id: playerId, name: playerName },
    })
    if (socket.connected) doEmit()
    else socket.once('connect', doEmit)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🏏</Text>
            <Text style={styles.title}>CRICKET{'\n'}TRUMP CARD</Text>
            <Text style={styles.subtitle}>Multiplayer Card Battle</Text>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            {['create', 'join'].map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tab, tab === t && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'create' ? '+ Create Room' : '⟶ Join Room'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name input */}
          <View style={styles.card}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name..."
              placeholderTextColor={COLORS.slate}
              maxLength={20}
            />

            {tab === 'join' && (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>Room Code</Text>
                <TextInput
                  style={[styles.input, styles.inputCode]}
                  value={joinCode}
                  onChangeText={t => setJoinCode(t.toUpperCase())}
                  placeholder="e.g. AB12CD"
                  placeholderTextColor={COLORS.slate}
                  autoCapitalize="characters"
                  maxLength={6}
                />
              </>
            )}

            {tab === 'create' && (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>Game Duration</Text>
                <View style={styles.timeRow}>
                  {TIME_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setTimeOption(opt.value)}
                      style={[styles.timeBtn, timeOption === opt.value && styles.timeBtnActive]}
                    >
                      <Text style={[styles.timeBtnLabel, timeOption === opt.value && styles.timeBtnLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.timeBtnSub}>{opt.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={tab === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnText}>{tab === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Share the room code with friends to play together</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '900', color: COLORS.amber, textAlign: 'center', letterSpacing: 2 },
  subtitle: { fontSize: 14, color: COLORS.slate, marginTop: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 10, padding: 3, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.emerald },
  tabText: { color: COLORS.slate, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#000' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  label: { color: COLORS.slate, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#0d1f3c', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.white, fontSize: 16 },
  inputCode: { letterSpacing: 6, fontSize: 20, fontWeight: '700', textAlign: 'center', color: COLORS.amber },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  timeBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: '#0d1f3c' },
  timeBtnActive: { borderColor: COLORS.emerald, backgroundColor: '#064e3b22' },
  timeBtnLabel: { color: COLORS.slate, fontWeight: '700', fontSize: 14 },
  timeBtnLabelActive: { color: COLORS.emerald },
  timeBtnSub: { color: COLORS.slate, fontSize: 10, marginTop: 2 },
  btn: { marginTop: 18, backgroundColor: COLORS.emerald, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  footer: { textAlign: 'center', color: COLORS.slate, fontSize: 12, marginTop: 20 },
})
