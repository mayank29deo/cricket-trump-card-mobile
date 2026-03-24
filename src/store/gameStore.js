import { create } from 'zustand'

const useGameStore = create((set, get) => ({
  roomCode: null,
  roomData: null,
  myHand: [],
  myId: null,
  myName: null,
  gamePhase: 'waiting',
  isMyTurn: false,
  timeLeft: 0,
  overallWinner: null,
  gameEndData: null,
  roundResult: null,
  currentPhase: null,
  phaseTimeLeft: 0,
  mySelectedCard: null,
  hasSubmittedCard: false,

  setIdentity: (id, name) => set({ myId: id, myName: name }),

  setRoom: (roomCode, roomData, myId) => set({
    roomCode,
    roomData,
    myId: myId || get().myId,
    gamePhase: roomData?.gamePhase || 'waiting',
  }),

  updateGameState: (gameState) => {
    const myId = get().myId
    set({
      roomData: gameState,
      gamePhase: gameState.gamePhase,
      isMyTurn: gameState.activePlayerId === myId,
    })
  },

  setMyHand: (hand) => set({ myHand: hand }),

  setPhase: (phaseData) => set({
    currentPhase: phaseData,
    gamePhase: phaseData.phase,
    phaseTimeLeft: phaseData.phaseTimeLeft,
    mySelectedCard: null,
    hasSubmittedCard: false,
  }),

  setPhaseTimeLeft: (t) => set({ phaseTimeLeft: t }),

  setTimeLeft: (t) => set({ timeLeft: t }),

  setRoundResult: (r) => set({ roundResult: r }),

  setGameEnd: (data) => set({ gamePhase: 'ended', overallWinner: data.overallWinner, gameEndData: data }),

  markCardSubmitted: (card) => set({ mySelectedCard: card, hasSubmittedCard: true }),

  resetGame: () => set({
    roomCode: null,
    roomData: null,
    myHand: [],
    gamePhase: 'waiting',
    isMyTurn: false,
    timeLeft: 0,
    overallWinner: null,
    gameEndData: null,
    roundResult: null,
    currentPhase: null,
    phaseTimeLeft: 0,
    mySelectedCard: null,
    hasSubmittedCard: false,
  }),
}))

export default useGameStore
