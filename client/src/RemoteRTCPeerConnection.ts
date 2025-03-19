import { Socket } from "socket.io-client"
import logger from './logger'
import { act, ACTIONS } from "./actions"

interface Signal {
  id?: string
  description?: RTCSessionDescription
  candidate?: RTCIceCandidate
}

type Listeners = ((candidate: RTCIceCandidate | null) => void) | ((description: RTCSessionDescription) => void)
type Events = 'onicecandidate' | 'onnewrtcsessiondescription'

export class RemoteRTCPeerConnection {
  signalingSocket: Socket
  listeners: Record<Events, Set<Listeners>>= {
    onicecandidate: new Set<(candidate: RTCIceCandidate | null) => void>(),
    onnewrtcsessiondescription: new Set<(description: RTCSessionDescription) => void>()
  }

  constructor(signalingSocket: Socket) {
    this.signalingSocket = signalingSocket
    this.signalingSocket.on('signal', this._receiveSignal.bind(this))
  }

  addEventListener(type: Events, listener: Listeners): void {
    this.listeners[type].add(listener)
  }

  dispatchEvent(type: Events, ...args: any[]) { 
    this.listeners[type].forEach((listener: any) => listener(...args))
  }

  removeEventListener(type: Events, listener: Listeners): void {
    this.listeners[type].delete(listener)
  }

  async _receiveSignal(signal: Signal) {
    const { id, description, candidate } = signal
    if (id) {
      act(ACTIONS.INIT, [id])
      logger.debug('RemoteRTCPeerConnection:', `accepted an id`, id)
    } else if ('description' in signal) {
      this.dispatchEvent('onnewrtcsessiondescription', description)
      logger.debug('RemoteRTCPeerConnection:', `received a remote ${description?.type}`)
    } else if ('candidate' in signal) {
      this.dispatchEvent('onicecandidate', candidate)
      logger.debug('RemoteRTCPeerConnection:', candidate?.candidate ? 'received an ice candidate' : 'received end-of-ice-candidates signal')
    }
  }

  setRemoteDescription(description: RTCSessionDescription | null) {
    if (description) {
      this.signalingSocket.emit('signal', { description })
      logger.debug('RemoteRTCPeerConnection:', `provided an answer`)
    }
  }

  addRemoteCandidate(candidate: RTCIceCandidate | null) {
    this.signalingSocket.emit('signal', { candidate })
    logger.debug('RemoteRTCPeerConnection:', `provided an ice candidate`)
  }

  destroy() {
    this.signalingSocket.off('signal')
    this.listeners['onicecandidate'].clear()
    this.listeners['onnewrtcsessiondescription'].clear()
  }
}
