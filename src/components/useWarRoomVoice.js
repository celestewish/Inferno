import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  resolveIceServers,
  makeSignal,
  isValidSignal,
  signalIsForMe,
  shouldInitiateOffer,
  reconcilePresence,
  setParticipantConnection,
  removeParticipant,
} from '../lib/warroom'

// Detect WebRTC + mic support once. In a static (no-TURN) deployment this covers
// most NATs but not symmetric ones; that is surfaced to the user as a caveat and
// tracked as a TURN follow-up.
const SUPPORTED =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof RTCPeerConnection !== 'undefined'

// A mesh voice hook: every participant holds one RTCPeerConnection per peer.
// Presence (Supabase Realtime) drives the roster; broadcast carries SDP/ICE. No
// audio ever touches Supabase or any server we run; only signaling metadata does.
export default function useWarRoomVoice({ boardId, self, iceServers } = {}) {
  const [status, setStatus] = useState('idle') // idle|requesting|connecting|connected|denied|error
  const [participants, setParticipants] = useState([])
  const [muted, setMuted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [remoteStreams, setRemoteStreams] = useState([]) // [{ id, stream }]

  const channelRef = useRef(null)
  const pcsRef = useRef(new Map()) // peerId -> RTCPeerConnection
  const pendingIceRef = useRef(new Map()) // peerId -> RTCIceCandidateInit[]
  const localStreamRef = useRef(null)
  const selfRef = useRef(self)
  const roomRef = useRef(null)
  const mutedRef = useRef(false)

  selfRef.current = self

  const sendSignal = useCallback((kind, to, data) => {
    const channel = channelRef.current
    const from = selfRef.current?.id
    if (!channel || !from) return
    const payload = makeSignal(kind, { from, to, data })
    if (!payload) return
    channel.send({ type: 'broadcast', event: 'signal', payload })
  }, [])

  const addRemoteStream = useCallback((peerId, stream) => {
    setRemoteStreams((current) => {
      const rest = current.filter((entry) => entry.id !== peerId)
      return [...rest, { id: peerId, stream }]
    })
  }, [])

  const closePeer = useCallback((peerId) => {
    const pc = pcsRef.current.get(peerId)
    if (pc) {
      try {
        pc.ontrack = null
        pc.onicecandidate = null
        pc.onconnectionstatechange = null
        pc.close()
      } catch {
        // Already closed; nothing to do.
      }
      pcsRef.current.delete(peerId)
    }
    pendingIceRef.current.delete(peerId)
    setRemoteStreams((current) => current.filter((entry) => entry.id !== peerId))
  }, [])

  const createPeer = useCallback(
    (peerId) => {
      const existing = pcsRef.current.get(peerId)
      if (existing) return existing

      const pc = new RTCPeerConnection({ iceServers: resolveIceServers(iceServers) })
      pcsRef.current.set(peerId, pc)

      const localStream = localStreamRef.current
      if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal('ice', peerId, event.candidate.toJSON())
      }
      pc.ontrack = (event) => {
        const [stream] = event.streams
        if (stream) addRemoteStream(peerId, stream)
      }
      pc.onconnectionstatechange = () => {
        setParticipants((current) => setParticipantConnection(current, peerId, pc.connectionState))
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          // Leave the roster to presence; just tear down the dead connection.
          closePeer(peerId)
        }
      }
      return pc
    },
    [addRemoteStream, closePeer, iceServers, sendSignal],
  )

  const drainPendingIce = useCallback(async (peerId, pc) => {
    const pending = pendingIceRef.current.get(peerId)
    if (!pending?.length) return
    pendingIceRef.current.delete(peerId)
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {
        // Stale candidate after renegotiation; safe to drop.
      }
    }
  }, [])

  const handleSignal = useCallback(
    async (signal) => {
      const myId = selfRef.current?.id
      if (!signalIsForMe(signal, myId)) return
      const peerId = signal.from

      try {
        if (signal.kind === 'offer') {
          const pc = createPeer(peerId)
          await pc.setRemoteDescription(signal.data)
          await drainPendingIce(peerId, pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          sendSignal('answer', peerId, answer)
        } else if (signal.kind === 'answer') {
          const pc = pcsRef.current.get(peerId)
          if (pc) {
            await pc.setRemoteDescription(signal.data)
            await drainPendingIce(peerId, pc)
          }
        } else if (signal.kind === 'ice') {
          const pc = pcsRef.current.get(peerId)
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(signal.data)
          } else {
            const list = pendingIceRef.current.get(peerId) || []
            list.push(signal.data)
            pendingIceRef.current.set(peerId, list)
          }
        }
      } catch (error) {
        console.error('War Room signaling error:', error)
      }
    },
    [createPeer, drainPendingIce, sendSignal],
  )

  const initiateOffer = useCallback(
    async (peerId) => {
      try {
        const pc = createPeer(peerId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal('offer', peerId, offer)
      } catch (error) {
        console.error('War Room offer error:', error)
      }
    },
    [createPeer, sendSignal],
  )

  const rosterFromPresence = useCallback((state) => {
    const rows = []
    Object.entries(state || {}).forEach(([key, presences]) => {
      const meta = (presences || [])[0]
      if (!meta) return
      const id = meta.userId ?? key
      rows.push({
        id,
        name: meta.name || meta.email || 'Teammate',
        email: meta.email || '',
        muted: Boolean(meta.muted),
      })
    })
    return rows
  }, [])

  const onPresenceSync = useCallback(() => {
    const channel = channelRef.current
    const myId = selfRef.current?.id
    if (!channel || !myId) return

    const roster = rosterFromPresence(channel.presenceState())
    setParticipants((current) => reconcilePresence(current, roster))

    const rosterIds = new Set(roster.map((r) => r.id))
    // Drop peers who left.
    for (const peerId of [...pcsRef.current.keys()]) {
      if (!rosterIds.has(peerId)) closePeer(peerId)
    }
    // Offer to peers we should initiate to and are not yet connected with.
    for (const row of roster) {
      if (row.id === myId) continue
      if (pcsRef.current.has(row.id)) continue
      if (shouldInitiateOffer(myId, row.id)) initiateOffer(row.id)
    }
  }, [closePeer, initiateOffer, rosterFromPresence])

  const teardown = useCallback(() => {
    for (const peerId of [...pcsRef.current.keys()]) closePeer(peerId)
    pcsRef.current.clear()
    pendingIceRef.current.clear()

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (channelRef.current) {
      try {
        channelRef.current.untrack()
      } catch {
        // Channel may already be closing.
      }
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    roomRef.current = null
    mutedRef.current = false
    setRemoteStreams([])
    setParticipants([])
    setMuted(false)
  }, [closePeer])

  const leave = useCallback(() => {
    teardown()
    setStatus('idle')
    setErrorMessage('')
  }, [teardown])

  const join = useCallback(
    async (room) => {
      const roomKey = room?.key
      const myId = selfRef.current?.id
      if (!SUPPORTED) {
        setStatus('error')
        setErrorMessage('This browser does not support voice huddles.')
        return
      }
      if (!boardId || !roomKey || !myId) {
        setStatus('error')
        setErrorMessage('Pick a board and huddle first.')
        return
      }
      if (channelRef.current) teardown()

      setStatus('requesting')
      setErrorMessage('')
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      } catch (error) {
        if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
          setStatus('denied')
          setErrorMessage('Microphone access was blocked. Allow the mic in your browser to join.')
        } else if (error?.name === 'NotFoundError') {
          setStatus('error')
          setErrorMessage('No microphone was found.')
        } else {
          setStatus('error')
          setErrorMessage('Could not start the microphone.')
        }
        return
      }

      localStreamRef.current = stream
      mutedRef.current = false
      setMuted(false)
      roomRef.current = roomKey
      setStatus('connecting')

      const channel = supabase.channel(`warroom:${boardId}:${roomKey}`, {
        config: { presence: { key: myId }, broadcast: { self: false } },
      })
      channelRef.current = channel

      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (isValidSignal(payload)) handleSignal(payload)
      })
      channel.on('presence', { event: 'sync' }, onPresenceSync)

      channel.subscribe(async (state) => {
        if (state === 'SUBSCRIBED') {
          const me = selfRef.current || {}
          await channel.track({
            userId: myId,
            name: me.name || me.email || 'Teammate',
            email: me.email || '',
            muted: mutedRef.current,
            onlineAt: new Date().toISOString(),
          })
          setStatus('connected')
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          setStatus('error')
          setErrorMessage('Lost the huddle connection. Try rejoining.')
        }
      })
    },
    [boardId, handleSignal, onPresenceSync, teardown],
  )

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const next = !mutedRef.current
    mutedRef.current = next
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next
    })
    setMuted(next)
    // Reflect the new mic state to peers via presence.
    const channel = channelRef.current
    const me = selfRef.current || {}
    if (channel) {
      channel.track({
        userId: me.id,
        name: me.name || me.email || 'Teammate',
        email: me.email || '',
        muted: next,
        onlineAt: new Date().toISOString(),
      })
    }
  }, [])

  // Tear everything down on unmount so mic tracks stop and connections close.
  useEffect(() => teardown, [teardown])

  // If the board changes out from under an active huddle, leave it.
  useEffect(() => {
    if (channelRef.current && roomRef.current) leave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId])

  return {
    supported: SUPPORTED,
    status,
    participants,
    muted,
    errorMessage,
    remoteStreams,
    join,
    leave,
    toggleMute,
  }
}
