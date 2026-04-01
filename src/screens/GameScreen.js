import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, ScrollView, FlatList, Alert, Share, Animated
} from 'react-native'
import { getSocket, safeEmit } from '../lib/socket'
import useGameStore from '../store/gameStore'

const COLORS = {
  bg: '#0a1628', card: '#132040', border: '#1e3a5f',
  emerald: '#10b981', amber: '#f59e0b', slate: '#94a3b8',
  white: '#f1f5f9', red: '#ef4444', purple: '#8b5cf6',
}

const STAT_LABELS = {
  batting_avg: 'Bat Avg', strike_rate: 'Strike Rate', centuries: 'Centuries',
  total_runs: 'Total Runs', wickets: 'Wickets', catches: 'Catches',
}
const STAT_ICONS = {
  batting_avg: '🏏', strike_rate: '⚡', centuries: '💯',
  total_runs: '📊', wickets: '🎯', catches: '🤲',
}
const IPL_STAT_LABELS = {
  ipl_runs: 'IPL Runs', ipl_avg: 'IPL Avg', ipl_sr: 'Strike Rate',
  ipl_wickets: 'Wickets', ipl_economy: 'Economy', ipl_matches: 'Matches',
}
const IPL_STAT_ICONS = {
  ipl_runs: '📊', ipl_avg: '🏏', ipl_sr: '⚡',
  ipl_wickets: '🎯', ipl_economy: '💰', ipl_matches: '🏟️',
}
const RARITY_COLORS = {
  legendary: '#f59e0b', epic: '#8b5cf6', rare: '#3b82f6', common: '#64748b',
}

function fmtVal(v) {
  if (typeof v === 'number' && v % 1 !== 0) return v.toFixed(2)
  return String(v ?? '—')
}
function getAvatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#1e40af', '#7c3aed', '#b45309', '#065f46', '#9f1239', '#1e3a5f']
  return colors[Math.abs(hash) % colors.length]
}

// ─── Mini card component ──────────────────────────────────────────────────────
function MiniCard({ card, isSelected, isLocked, onPress, highlightStat, statIcons = STAT_ICONS }) {
  const rarityColor = RARITY_COLORS[card?.rarity] || COLORS.slate
  return (
    <TouchableOpacity
      onPress={() => !isLocked && onPress && onPress(card)}
      disabled={isLocked}
      style={[
        styles.miniCard,
        isSelected && { borderColor: COLORS.amber, shadowColor: COLORS.amber, shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 },
        isLocked && { opacity: 0.4 },
        { borderColor: isSelected ? COLORS.amber : rarityColor + '55' }
      ]}
    >
      <View style={[styles.miniCardRarity, { backgroundColor: rarityColor }]}>
        <Text style={styles.miniCardRarityText}>{card?.rarity?.[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.miniCardName} numberOfLines={1}>{card?.name}</Text>
      <Text style={styles.miniCardCountry}>{card?.country}</Text>
      {highlightStat && (
        <Text style={styles.miniCardHighlight}>
          {statIcons[highlightStat]} {fmtVal(card?.stats?.[highlightStat])}
        </Text>
      )}
      <View style={styles.miniCardPoints}>
        <Text style={[styles.miniCardPts, { color: rarityColor }]}>{card?.points}pts</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Full card (for announced card display) ───────────────────────────────────
function BigCard({ card, highlightStat, statLabels = STAT_LABELS, statIcons = STAT_ICONS }) {
  if (!card) return null
  const rarityColor = RARITY_COLORS[card.rarity] || COLORS.slate
  return (
    <View style={[styles.bigCard, { borderColor: rarityColor }]}>
      <View style={[styles.bigCardHeader, { backgroundColor: rarityColor + '33' }]}>
        <Text style={styles.bigCardName}>{card.name}</Text>
        <View style={[styles.bigCardRarityBadge, { backgroundColor: rarityColor }]}>
          <Text style={styles.bigCardRarityText}>{card.rarity?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.bigCardCountry}>{card.country} • {card.role}</Text>
      <View style={styles.bigCardStats}>
        {Object.entries(statLabels).map(([stat, label]) => (
          <View
            key={stat}
            style={[styles.bigCardStat, highlightStat === stat && styles.bigCardStatHighlight]}
          >
            <Text style={styles.bigCardStatIcon}>{statIcons[stat]}</Text>
            <Text style={styles.bigCardStatLabel}>{label}</Text>
            <Text style={[styles.bigCardStatVal, highlightStat === stat && { color: COLORS.amber }]}>
              {fmtVal(card.stats?.[stat])}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Phase countdown badge ────────────────────────────────────────────────────
function PhaseTimer({ seconds, phase }) {
  const isActive = phase === 'active_selecting'
  const urgent = seconds <= 5
  return (
    <View style={[styles.phaseTimer, isActive ? styles.phaseTimerGreen : styles.phaseTimerAmber, urgent && styles.phaseTimerUrgent]}>
      <Text style={[styles.phaseTimerText, { color: urgent ? COLORS.red : isActive ? COLORS.emerald : COLORS.amber }]}>
        ⏱ {seconds}s
      </Text>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GameScreen({ navigation, route }) {
  const { roomCode } = route.params
  const {
    roomData, myHand, myId, gamePhase, isMyTurn, timeLeft,
    gameEndData, currentPhase, phaseTimeLeft, mySelectedCard, hasSubmittedCard,
    updateGameState, setMyHand, setPhase, setPhaseTimeLeft, setTimeLeft,
    setRoundResult, setGameEnd, resetGame, markCardSubmitted,
  } = useGameStore()

  const [selectedCard, setSelectedCard] = useState(null)
  const [pendingStatCard, setPendingStatCard] = useState(null)
  const [roundResult, setRoundResultLocal] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [opponentSubmits, setOpponentSubmits] = useState({ count: 0, total: 0 })
  const [lastRound, setLastRound] = useState(false)
  const [connected, setConnected] = useState(true)

  const isIPL = roomData?.deckType === 'ipl'
  const statLabels = isIPL ? IPL_STAT_LABELS : STAT_LABELS
  const statIcons  = isIPL ? IPL_STAT_ICONS  : STAT_ICONS

  const activePlayerId = roomData?.activePlayerId || currentPhase?.activePlayerId
  const isActivePlayer = activePlayerId === myId
  const opponents = roomData?.players?.filter(p => p.id !== myId && p.isActive) || []
  const announcedCard = currentPhase?.activeCard
  const announcedStat = currentPhase?.stat
  const announcedStatValue = currentPhase?.statValue
  const totalTime = (roomData?.timeOption || 6) * 60

  useEffect(() => {
    const socket = getSocket()

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_room', { roomCode, player: { id: myId, name: roomData?.players?.find(p => p.id === myId)?.name || '' } })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('phase_changed', (phaseData) => {
      setPhase(phaseData)
      setSelectedCard(null)
      setPendingStatCard(null)
      setOpponentSubmits({ count: 0, total: 0 })
    })

    socket.on('phase_timer_tick', ({ phaseTimeLeft: t }) => setPhaseTimeLeft(t))

    socket.on('opponent_selection_update', ({ submittedCount, totalOpponents }) => {
      setOpponentSubmits({ count: submittedCount, total: totalOpponents })
    })

    socket.on('round_result', ({ roundResult: result, gameState }) => {
      setRoundResultLocal(result)
      setShowResult(true)
      setRoundResult(result)
      updateGameState(gameState)
      setTimeout(() => {
        setShowResult(false)
        setRoundResultLocal(null)
        setSelectedCard(null)
        setPendingStatCard(null)
      }, 2500)
    })

    socket.on('game_state_update', ({ gameState, myHand: hand }) => {
      updateGameState(gameState)
      if (hand) setMyHand(hand)
    })

    socket.on('timer_tick', ({ timeLeft: tl }) => setTimeLeft(tl))

    socket.on('last_round_warning', () => setLastRound(true))

    socket.on('game_ended', (data) => setGameEnd(data))

    socket.on('error', ({ message }) => Alert.alert('Error', message))

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('phase_changed')
      socket.off('phase_timer_tick')
      socket.off('opponent_selection_update')
      socket.off('round_result')
      socket.off('game_state_update')
      socket.off('timer_tick')
      socket.off('last_round_warning')
      socket.off('game_ended')
      socket.off('error')
    }
  }, [])

  const handleCardPickForActive = useCallback((card) => {
    if (!isActivePlayer || gamePhase !== 'active_selecting') return
    setSelectedCard(card)
    setPendingStatCard(card)
  }, [isActivePlayer, gamePhase])

  const handleSelectStat = useCallback((stat) => {
    if (!isActivePlayer || !selectedCard) return
    if (selectedCard.usedStats?.includes(stat)) return
    safeEmit('select_card_stat', { roomCode, playerId: myId, cardId: selectedCard.id, stat })
    setPendingStatCard(null)
  }, [isActivePlayer, selectedCard, roomCode, myId])

  const handleOpponentCardPick = useCallback((card) => {
    if (isActivePlayer || gamePhase !== 'opponents_selecting' || hasSubmittedCard) return
    safeEmit('select_opponent_card', { roomCode, playerId: myId, cardId: card.id })
    markCardSubmitted(card)
  }, [isActivePlayer, gamePhase, hasSubmittedCard, roomCode, myId])

  const handleLeave = () => {
    const socket = getSocket()
    socket.emit('leave_room', { roomCode, playerId: myId })
    resetGame()
    navigation.replace('Home')
  }

  // ─── POST-GAME SCREEN ───────────────────────────────────────────────────────
  if (gamePhase === 'ended' && gameEndData) {
    const players = gameEndData.players || []
    const winner = gameEndData.overallWinner
    const isWinner = winner?.id === myId
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
    const medals = ['🥇', '🥈', '🥉']

    const handleShare = async () => {
      const lines = sortedPlayers.map((p, i) =>
        `${medals[i] || (i + 1) + '.'} ${p.name} — ${p.score || 0} pts`
      ).join('\n')
      await Share.share({ message: `Cricket Trump Card Results 🏏\n\n${lines}\n\nPlay at https://cricket-trump-card.vercel.app` })
    }

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ScrollView contentContainerStyle={styles.endContainer}>
          <Text style={styles.endEmoji}>{isWinner ? '🏆' : '🏏'}</Text>
          <Text style={[styles.endTitle, { color: isWinner ? COLORS.amber : COLORS.white }]}>
            {isWinner ? 'YOU WIN!' : 'GAME OVER'}
          </Text>
          {winner && (
            <Text style={styles.endSub}>
              {isWinner ? 'Congratulations, champion!' : `${winner.name} wins the match!`}
            </Text>
          )}

          {/* Leaderboard */}
          <View style={styles.leaderboard}>
            <Text style={styles.leaderboardTitle}>📋 THIS GAME LEADERBOARD</Text>
            <View style={styles.lbHeader}>
              <Text style={[styles.lbCell, { flex: 0.3 }]}>#</Text>
              <Text style={[styles.lbCell, { flex: 1 }]}>Player</Text>
              <Text style={[styles.lbCell, { width: 60 }]}>Points</Text>
              <Text style={[styles.lbCell, { width: 50 }]}>Cards</Text>
            </View>
            {sortedPlayers.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.lbRow,
                  p.id === winner?.id && styles.lbRowWinner,
                  p.id === myId && styles.lbRowMe,
                ]}
              >
                <Text style={[styles.lbMedal, { flex: 0.3 }]}>{medals[i] || i + 1}</Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.lbAvatar, { backgroundColor: getAvatarColor(p.name) }]}>
                    <Text style={styles.lbAvatarText}>{p.name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.lbName}>{p.name}</Text>
                    {p.id === myId && <Text style={styles.lbYou}>YOU</Text>}
                  </View>
                </View>
                <Text style={[styles.lbCell, { width: 60, color: COLORS.emerald, fontWeight: '700' }]}>
                  {p.score || 0}
                </Text>
                <Text style={[styles.lbCell, { width: 50 }]}>{p.cardCount || 0}</Text>
              </View>
            ))}
          </View>

          {/* Rarity legend */}
          <View style={styles.rarityLegend}>
            {[['legendary', 100], ['epic', 75], ['rare', 50], ['common', 25]].map(([r, pts]) => (
              <View key={r} style={styles.rarityItem}>
                <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[r] }]} />
                <Text style={styles.rarityText}>{r[0].toUpperCase() + r.slice(1)}: {pts}pts</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 Share Results</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeBtn} onPress={() => { resetGame(); navigation.replace('Home') }}>
            <Text style={styles.homeBtnText}>PLAY AGAIN</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ─── GAME SCREEN ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
          <Text style={styles.leaveText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.codeChip}>
          <Text style={styles.codeChipText}>{roomCode}</Text>
        </View>
        <View style={styles.timerChip}>
          <Text style={styles.timerText}>⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</Text>
        </View>
      </View>

      {/* Reconnecting banner */}
      {!connected && (
        <View style={{ marginHorizontal: 16, marginBottom: 4, paddingVertical: 6, paddingHorizontal: 12,
          backgroundColor: '#1c1400', borderWidth: 1, borderColor: COLORS.amber, borderRadius: 8, alignItems: 'center' }}>
          <Text style={{ color: COLORS.amber, fontWeight: 'bold', fontSize: 13 }}>
            📶 Reconnecting...
          </Text>
        </View>
      )}

      {/* Last round warning */}
      {lastRound && (
        <View style={{ marginHorizontal: 16, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 12,
          backgroundColor: '#7f1d1d', borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, alignItems: 'center' }}>
          <Text style={{ color: '#fca5a5', fontWeight: 'bold', fontSize: 13 }}>
            🏁 LAST ROUND — finish this hand to end the game
          </Text>
        </View>
      )}

      {/* Opponents row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.opponentRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {opponents.map(op => (
          <View key={op.id} style={styles.opponentCard}>
            <View style={[styles.opAvatar, { backgroundColor: getAvatarColor(op.name), opacity: op.isActive ? 1 : 0.4 }]}>
              <Text style={styles.opAvatarText}>{op.name?.[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.opName} numberOfLines={1}>{op.name?.split(' ')[0]}</Text>
            <Text style={styles.opCards}>{op.cardCount} 🃏</Text>
            <Text style={styles.opScore}>{op.score || 0}pts</Text>
            {op.id === activePlayerId && <Text style={styles.opTurn}>TURN</Text>}
          </View>
        ))}
      </ScrollView>

      {/* Round result overlay */}
      {showResult && roundResult && (
        <View style={styles.resultOverlay}>
          <Text style={styles.resultStat}>{statIcons[roundResult.stat]} {statLabels[roundResult.stat]}</Text>
          {roundResult.isTie
            ? <Text style={styles.resultTitle}>🤝 TIE — Cards to pile</Text>
            : <Text style={styles.resultTitle}>🏆 {roundResult.winnerId === myId ? 'YOU WIN!' : (roomData?.players?.find(p => p.id === roundResult.winnerId)?.name || '') + ' wins!'}</Text>
          }
          {Object.entries(roundResult.cards || {}).map(([pid, data]) => {
            const pts = roundResult.roundPointsAwarded?.[pid]
            return (
              <Text key={pid} style={{ color: pid === roundResult.winnerId ? COLORS.amber : COLORS.slate, fontSize: 13 }}>
                {roomData?.players?.find(p => p.id === pid)?.name?.split(' ')[0]}: {fmtVal(data.statValue)}
                {pts != null ? `  +${pts}pts` : ''}
              </Text>
            )
          })}
        </View>
      )}

      <ScrollView style={styles.mainArea} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* ── ACTIVE SELECTING — I AM active player ── */}
        {gamePhase === 'active_selecting' && isActivePlayer && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏏 YOUR TURN — Pick a card</Text>
              <PhaseTimer seconds={phaseTimeLeft} phase="active_selecting" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {myHand.map(card => (
                  <MiniCard statIcons={statIcons}
                    key={card.id}
                    card={card}
                    isSelected={selectedCard?.id === card.id}
                    onPress={handleCardPickForActive}
                  />
                ))}
              </View>
            </ScrollView>

            {pendingStatCard && (
              <View style={styles.statPicker}>
                <Text style={styles.statPickerLabel}>
                  SELECT STAT FOR <Text style={{ color: COLORS.amber }}>{pendingStatCard.name}</Text>
                </Text>
                <View style={styles.statGrid}>
                  {Object.entries(statLabels).map(([stat, label]) => {
                    const burned = pendingStatCard.usedStats?.includes(stat)
                    return (
                      <TouchableOpacity
                        key={stat}
                        onPress={() => !burned && handleSelectStat(stat)}
                        disabled={burned}
                        style={[styles.statBtn, burned && styles.statBtnBurned]}
                      >
                        <Text style={styles.statBtnIcon}>{burned ? '🔥' : statIcons[stat]}</Text>
                        <Text style={[styles.statBtnLabel, burned && { color: COLORS.slate }]}>{label}</Text>
                        <Text style={[styles.statBtnVal, burned && { color: '#374151' }]}>
                          {fmtVal(pendingStatCard.stats?.[stat])}
                        </Text>
                        {burned && <Text style={styles.statBtnUsed}>used</Text>}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── ACTIVE SELECTING — I am NOT active player ── */}
        {gamePhase === 'active_selecting' && !isActivePlayer && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                ⏳ {roomData?.players?.find(p => p.id === activePlayerId)?.name || 'Opponent'} is choosing...
              </Text>
              <PhaseTimer seconds={phaseTimeLeft} phase="active_selecting" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {myHand.map(card => <MiniCard key={card.id} card={card} isLocked statIcons={statIcons} />)}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── OPPONENTS SELECTING — I AM active player ── */}
        {gamePhase === 'opponents_selecting' && isActivePlayer && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your card is played</Text>
              <PhaseTimer seconds={phaseTimeLeft} phase="opponents_selecting" />
            </View>
            {announcedCard && <BigCard card={announcedCard} highlightStat={announcedStat} statLabels={statLabels} statIcons={statIcons} />}
            {announcedStat && (
              <Text style={styles.statAnnounce}>
                {statIcons[announcedStat]} {statLabels[announcedStat]}: {fmtVal(announcedStatValue)}
              </Text>
            )}
            <Text style={styles.waitingOpponents}>
              ⏳ Waiting — {opponentSubmits.count}/{opponentSubmits.total} opponents ready
            </Text>
          </View>
        )}

        {/* ── OPPONENTS SELECTING — I am NOT active player ── */}
        {gamePhase === 'opponents_selecting' && !isActivePlayer && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {roomData?.players?.find(p => p.id === activePlayerId)?.name?.split(' ')[0] || 'Opponent'}'s card
              </Text>
              <PhaseTimer seconds={phaseTimeLeft} phase="opponents_selecting" />
            </View>
            {announcedCard && <BigCard card={announcedCard} highlightStat={announcedStat} statLabels={statLabels} statIcons={statIcons} />}
            {announcedStat && (
              <View style={styles.beatThis}>
                <Text style={styles.beatThisLabel}>Beat this</Text>
                <Text style={styles.beatThisVal}>
                  {statIcons[announcedStat]} {statLabels[announcedStat]}: {fmtVal(announcedStatValue)}
                </Text>
              </View>
            )}
            {hasSubmittedCard ? (
              <View style={styles.submittedBanner}>
                <Text style={styles.submittedText}>✓ Card submitted — waiting for others</Text>
              </View>
            ) : (
              <>
                <Text style={styles.pickCardLabel}>Pick your best card to counter:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                    {myHand.map(card => (
                      <MiniCard statIcons={statIcons}
                        key={card.id}
                        card={card}
                        onPress={handleOpponentCardPick}
                        highlightStat={announcedStat}
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        )}

        {/* My score */}
        {gamePhase !== 'waiting' && (
          <View style={styles.myScoreBar}>
            <Text style={styles.myScoreLabel}>Your Hand</Text>
            <Text style={styles.myScoreVal}>{myHand.length} cards</Text>
            <Text style={styles.myScoreLabel}>Points</Text>
            <Text style={[styles.myScoreVal, { color: COLORS.amber }]}>
              {roomData?.players?.find(p => p.id === myId)?.score || 0}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  leaveBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  leaveText: { color: COLORS.slate, fontSize: 18 },
  codeChip: { backgroundColor: COLORS.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  codeChipText: { color: COLORS.amber, fontWeight: '700', fontSize: 13, letterSpacing: 2 },
  timerChip: { marginLeft: 'auto', backgroundColor: COLORS.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  timerText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },

  opponentRow: { maxHeight: 110, paddingVertical: 8 },
  opponentCard: { alignItems: 'center', gap: 2, minWidth: 56 },
  opAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  opAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  opName: { color: COLORS.white, fontSize: 10, fontWeight: '600', maxWidth: 56 },
  opCards: { color: COLORS.slate, fontSize: 10 },
  opScore: { color: COLORS.amber, fontSize: 10, fontWeight: '700' },
  opTurn: { color: COLORS.amber, fontSize: 9, fontWeight: '900' },

  resultOverlay: { margin: 12, backgroundColor: '#0f2a1a', borderWidth: 1, borderColor: COLORS.emerald, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  resultStat: { color: COLORS.slate, fontSize: 13 },
  resultTitle: { color: COLORS.amber, fontWeight: '900', fontSize: 16 },

  mainArea: { flex: 1 },
  section: { padding: 12, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.white, fontWeight: '700', fontSize: 13, flex: 1 },
  phaseTimer: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  phaseTimerGreen: { borderColor: COLORS.emerald + '60', backgroundColor: COLORS.emerald + '15' },
  phaseTimerAmber: { borderColor: COLORS.amber + '60', backgroundColor: COLORS.amber + '15' },
  phaseTimerUrgent: { borderColor: COLORS.red + '80', backgroundColor: COLORS.red + '15' },
  phaseTimerText: { fontSize: 12, fontWeight: '700' },

  miniCard: { width: 120, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1.5, padding: 10, gap: 4 },
  miniCardRarity: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  miniCardRarityText: { color: '#000', fontSize: 10, fontWeight: '900' },
  miniCardName: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  miniCardCountry: { color: COLORS.slate, fontSize: 11 },
  miniCardHighlight: { color: COLORS.amber, fontSize: 12, fontWeight: '700', marginTop: 2 },
  miniCardPoints: { marginTop: 2 },
  miniCardPts: { fontSize: 11, fontWeight: '700' },

  bigCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  bigCardHeader: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigCardName: { color: COLORS.white, fontWeight: '800', fontSize: 16, flex: 1 },
  bigCardRarityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  bigCardRarityText: { color: '#000', fontSize: 10, fontWeight: '900' },
  bigCardCountry: { color: COLORS.slate, fontSize: 12, paddingHorizontal: 12, paddingBottom: 8 },
  bigCardStats: { padding: 10, gap: 4 },
  bigCardStat: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 8 },
  bigCardStatHighlight: { backgroundColor: '#f59e0b22', borderWidth: 1, borderColor: '#f59e0b44' },
  bigCardStatIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  bigCardStatLabel: { color: COLORS.slate, fontSize: 12, flex: 1 },
  bigCardStatVal: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  statPicker: { backgroundColor: COLORS.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  statPickerLabel: { color: COLORS.slate, fontSize: 11, fontWeight: '600', letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBtn: { width: '30%', backgroundColor: '#0d1f3c', borderRadius: 10, borderWidth: 1, borderColor: '#1e4060', padding: 10 },
  statBtnBurned: { opacity: 0.5, borderColor: '#3f0000', backgroundColor: '#1a0000' },
  statBtnIcon: { fontSize: 16, marginBottom: 2 },
  statBtnLabel: { color: COLORS.slate, fontSize: 10, fontWeight: '600' },
  statBtnVal: { color: COLORS.white, fontSize: 16, fontWeight: '800', marginTop: 2 },
  statBtnUsed: { color: COLORS.red, fontSize: 9, fontWeight: '600', marginTop: 2 },

  statAnnounce: { color: COLORS.emerald, fontWeight: '800', fontSize: 16, textAlign: 'center', paddingVertical: 8 },
  waitingOpponents: { color: COLORS.slate, textAlign: 'center', fontSize: 13 },

  beatThis: { backgroundColor: '#064e3b33', borderWidth: 1, borderColor: COLORS.emerald + '44', borderRadius: 12, padding: 12, alignItems: 'center' },
  beatThisLabel: { color: COLORS.slate, fontSize: 11, marginBottom: 4 },
  beatThisVal: { color: COLORS.emerald, fontSize: 18, fontWeight: '800' },

  pickCardLabel: { color: COLORS.slate, fontSize: 12, fontWeight: '600', marginTop: 4 },
  submittedBanner: { backgroundColor: '#064e3b', borderRadius: 12, padding: 14, alignItems: 'center' },
  submittedText: { color: COLORS.emerald, fontWeight: '700', fontSize: 14 },

  myScoreBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 10, borderTopWidth: 1, borderTopColor: COLORS.border, marginHorizontal: 12, borderRadius: 12, backgroundColor: COLORS.card },
  myScoreLabel: { color: COLORS.slate, fontSize: 12 },
  myScoreVal: { color: COLORS.white, fontWeight: '700', fontSize: 16 },

  // End screen
  endContainer: { padding: 24, alignItems: 'center', gap: 12 },
  endEmoji: { fontSize: 64 },
  endTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  endSub: { color: COLORS.slate, fontSize: 14 },
  leaderboard: { width: '100%', backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  leaderboardTitle: { color: COLORS.white, fontWeight: '800', fontSize: 14, marginBottom: 12 },
  lbHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8, marginBottom: 6 },
  lbCell: { color: COLORS.slate, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, marginBottom: 4, backgroundColor: '#ffffff08' },
  lbRowWinner: { backgroundColor: '#f59e0b12', borderWidth: 1, borderColor: COLORS.amber + '44' },
  lbRowMe: { backgroundColor: '#10b98112' },
  lbMedal: { fontSize: 18, textAlign: 'center' },
  lbAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  lbAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  lbName: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  lbYou: { color: COLORS.emerald, fontSize: 10, fontWeight: '700' },

  rarityLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  rarityItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rarityDot: { width: 10, height: 10, borderRadius: 5 },
  rarityText: { color: COLORS.slate, fontSize: 11 },

  shareBtn: { backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1, borderColor: COLORS.border },
  shareBtnText: { color: COLORS.white, fontWeight: '600' },
  homeBtn: { backgroundColor: COLORS.emerald, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48 },
  homeBtnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
})
