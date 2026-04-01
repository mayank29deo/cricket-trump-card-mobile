import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, ScrollView, Modal, Animated, Dimensions,
} from 'react-native'

const { width: SCREEN_W } = Dimensions.get('window')

const COLORS = {
  bg: '#0a1628', card: '#132040', border: '#1e3a5f',
  emerald: '#10b981', amber: '#f59e0b', slate: '#94a3b8',
  white: '#f1f5f9', red: '#ef4444', purple: '#8b5cf6',
}

const TAGLINES = [
  'Battle with legendary cricketers. Choose your stat. Dominate the pitch.',
  "Remember those afternoons? Shuffling cards, arguing over Sachin's average — it's back.",
  'The cricket trump cards you played as a kid, now with your friends online.',
  'Tendulkar vs Bradman. Warne vs Murali. You decide who wins.',
  'Every card a memory. Every stat a battle. Every round a story.',
]

const HOW_TO_PLAY = [
  { step: 1, title: 'Get Your Cards', icon: '🃏', desc: 'Cards are shuffled and dealt equally — with balanced legendary, epic, rare, and common distribution.' },
  { step: 2, title: 'Choose a Stat', icon: '🏏', desc: 'The active player picks one stat (Batting Avg, Strike Rate, Centuries, Runs, Wickets, or Catches) for the round.' },
  { step: 3, title: 'Compare & Win', icon: '🏆', desc: 'Highest value wins all played cards. For lower-is-better stats like Economy, lowest wins.' },
  { step: 4, title: 'Ties Go Neutral', icon: '🤝', desc: 'Tied cards go to a neutral pile — the next round winner sweeps them all!' },
  { step: 5, title: 'Last Card Wins', icon: '👑', desc: 'Collect all cards — or have the most when time runs out — to win the game.' },
]

const PREVIEW_CARDS = [
  { name: 'Sachin', flag: '🇮🇳', rarity: 'LEG', color: '#f59e0b', rotate: '-6deg' },
  { name: 'Bradman', flag: '🇦🇺', rarity: 'LEG', color: '#f59e0b', rotate: '-2deg' },
  { name: 'Lara', flag: '🏴', rarity: 'LEG', color: '#f59e0b', rotate: '2deg' },
  { name: 'Warne', flag: '🇦🇺', rarity: 'LEG', color: '#f59e0b', rotate: '6deg' },
]

const TICKER_ITEMS = [
  { icon: '🎮', text: '10,000+ Games Played' },
  { icon: '👥', text: '5,000+ Players Online' },
  { icon: '🏏', text: '186+ Legendary Cricketers' },
  { icon: '🌍', text: 'Players from 8 Countries' },
  { icon: '⚡', text: 'Real-time Multiplayer' },
  { icon: '🏆', text: 'IPL & International Decks' },
]

export default function LandingScreen({ navigation }) {
  const [taglineIndex, setTaglineIndex] = useState(0)
  const [showHowTo, setShowHowTo] = useState(false)
  const taglineOpacity = useRef(new Animated.Value(1)).current
  const tickerX = useRef(new Animated.Value(0)).current
  const heroFade = useRef(new Animated.Value(0)).current
  const heroSlide = useRef(new Animated.Value(20)).current

  // Hero entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start()
  }, [])

  // Rotating taglines
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(taglineOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setTaglineIndex(i => (i + 1) % TAGLINES.length)
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start()
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Ticker scroll
  const tickerWidth = TICKER_ITEMS.length * 180
  useEffect(() => {
    const loop = () => {
      tickerX.setValue(0)
      Animated.timing(tickerX, {
        toValue: -tickerWidth,
        duration: tickerWidth * 50,
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished) loop() })
    }
    loop()
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Decorative pitch lines */}
      <View style={styles.pitchLine} pointerEvents="none" />
      <View style={styles.pitchLineRight} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav bar */}
        <View style={styles.nav}>
          <View style={styles.navBrand}>
            <Text style={styles.navEmoji}>🏏</Text>
            <Text style={styles.navTitle}>CRICKET TRUMP</Text>
          </View>
        </View>

        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
          {/* Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>🏆</Text>
            <Text style={styles.badgeText}>MULTIPLAYER CARD GAME</Text>
          </View>

          {/* Title */}
          <Text style={styles.titleCricket}>CRICKET</Text>
          <Text style={styles.titleTrump}>TRUMP CARD</Text>

          {/* Rotating tagline */}
          <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
            {TAGLINES[taglineIndex]}
          </Animated.Text>

          {/* CTA Buttons */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.btnPlay}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPlayText}>🏏  PLAY NOW</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnHow}
              onPress={() => setShowHowTo(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnHowText}>❓  HOW TO PLAY</Text>
            </TouchableOpacity>
          </View>

          {/* Card preview strip */}
          <View style={styles.cardStrip}>
            {PREVIEW_CARDS.map((c, i) => (
              <View
                key={c.name}
                style={[
                  styles.previewCard,
                  { borderColor: c.color, shadowColor: c.color, transform: [{ rotate: c.rotate }] }
                ]}
              >
                <View style={styles.previewCardTop}>
                  <Text style={[styles.previewRarity, { color: c.color }]}>{c.rarity}</Text>
                  <Text style={{ fontSize: 10 }}>🏏</Text>
                </View>
                <View style={styles.previewCardBottom}>
                  <Text style={styles.previewName}>{c.name}</Text>
                  <Text style={styles.previewFlag}>{c.flag}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Stats ticker */}
      <View style={styles.tickerContainer}>
        <Animated.View style={[styles.tickerTrack, { transform: [{ translateX: tickerX }] }]}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <View key={i} style={styles.tickerItem}>
              <Text style={styles.tickerIcon}>{item.icon}</Text>
              <Text style={styles.tickerText}>{item.text}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* How to Play Modal */}
      <Modal
        visible={showHowTo}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHowTo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>How to Play</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {HOW_TO_PLAY.map(rule => (
                <View key={rule.step} style={styles.ruleRow}>
                  <View style={styles.ruleStep}>
                    <Text style={styles.ruleStepText}>{rule.step}</Text>
                  </View>
                  <View style={styles.ruleBody}>
                    <Text style={styles.ruleTitle}>{rule.icon} {rule.title}</Text>
                    <Text style={styles.ruleDesc}>{rule.desc}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.ruleTip}>
                <Text style={styles.ruleTipText}>💡 Time limit: 4, 6, or 10 minutes. Most cards when time's up wins!</Text>
              </View>
              <TouchableOpacity
                style={styles.btnPlay}
                onPress={() => { setShowHowTo(false); navigation.navigate('Home') }}
              >
                <Text style={styles.btnPlayText}>🏏  START PLAYING</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 56 },

  // Decorative lines
  pitchLine: {
    position: 'absolute', left: '35%', top: 0, bottom: 0, width: 1,
    backgroundColor: COLORS.emerald, opacity: 0.07,
  },
  pitchLineRight: {
    position: 'absolute', right: '35%', top: 0, bottom: 0, width: 1,
    backgroundColor: COLORS.emerald, opacity: 0.07,
  },

  // Nav
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navEmoji: { fontSize: 22 },
  navTitle: { color: COLORS.emerald, fontWeight: '800', fontSize: 15, letterSpacing: 2 },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#064e3b40', borderWidth: 1, borderColor: COLORS.emerald + '60',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20,
  },
  badgeIcon: { fontSize: 14 },
  badgeText: { color: COLORS.emerald, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  titleCricket: {
    fontSize: 52, fontWeight: '900', letterSpacing: 4, textAlign: 'center',
    color: COLORS.amber,
  },
  titleTrump: {
    fontSize: 38, fontWeight: '900', letterSpacing: 2, textAlign: 'center',
    color: COLORS.white, marginTop: -4,
  },

  tagline: {
    color: COLORS.slate, fontSize: 14, textAlign: 'center', fontStyle: 'italic',
    lineHeight: 22, marginTop: 16, marginBottom: 28, minHeight: 44, paddingHorizontal: 8,
  },

  ctaRow: { width: '100%', gap: 10, marginBottom: 32 },
  btnPlay: {
    backgroundColor: COLORS.emerald, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', shadowColor: COLORS.emerald, shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  btnPlayText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  btnHow: {
    backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
  },
  btnHowText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  // Card preview strip
  cardStrip: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 8 },
  previewCard: {
    width: 72, height: 100, backgroundColor: COLORS.card, borderRadius: 10,
    borderWidth: 1.5, padding: 8, justifyContent: 'space-between',
    shadowOpacity: 0.4, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, elevation: 4,
  },
  previewCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewRarity: { fontSize: 9, fontWeight: '900' },
  previewCardBottom: {},
  previewName: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
  previewFlag: { fontSize: 12, marginTop: 2 },

  // Ticker
  tickerContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 42, borderTopWidth: 1, borderTopColor: COLORS.border + '40',
    backgroundColor: COLORS.card + '90', overflow: 'hidden', justifyContent: 'center',
  },
  tickerTrack: { flexDirection: 'row', alignItems: 'center' },
  tickerItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20 },
  tickerIcon: { fontSize: 14 },
  tickerText: { color: COLORS.slate, fontSize: 12, fontWeight: '500', whiteSpace: 'nowrap' },

  // How to Play modal
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%', borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { color: COLORS.white, fontWeight: '900', fontSize: 20, marginBottom: 16, textAlign: 'center' },
  ruleRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  ruleStep: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.emerald,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  ruleStepText: { color: '#000', fontWeight: '800', fontSize: 13 },
  ruleBody: { flex: 1 },
  ruleTitle: { color: COLORS.white, fontWeight: '700', fontSize: 14, marginBottom: 3 },
  ruleDesc: { color: COLORS.slate, fontSize: 12, lineHeight: 18 },
  ruleTip: {
    backgroundColor: '#f59e0b15', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.amber + '40', marginBottom: 16, marginTop: 4,
  },
  ruleTipText: { color: COLORS.amber, fontSize: 12, lineHeight: 18 },
})
