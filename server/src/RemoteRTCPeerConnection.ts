import { Socket } from "socket.io"
import logger from './logger'
import { PeerConnection } from "node-datachannel/*"
import EventEmitter from "events"

interface Signal {
  description?: RTCSessionDescription
  candidate?: RTCIceCandidate
}

export class RemoteRTCPeerConnection extends EventEmitter {
  signalingSocket: Socket
  id: string
  peer: PeerConnection

  constructor(id: string, signalingSocket: Socket, peer: PeerConnection) {
    super()
    this.id = id
    this.signalingSocket = signalingSocket
    this.peer = peer
    
    this.signalingSocket.on('signal', this._receiveSignal.bind(this))
    this.signalingSocket.on('disconnect', () => this.emit('disconnect'))
  }

  async _receiveSignal({ description, candidate }: Signal) {
    try {
      if (description) {
        this.emit('onnewrtcsessiondescription', description)
        logger.debug(this.id, 'RemoteRTCPeerConnection:',`received a remote ${description.type}`)
      } else if (candidate) {
        this.emit('onicecandidate', candidate)
        logger.debug(this.id, 'RemoteRTCPeerConnection:', candidate?.candidate ? 'received an ice candidate' : 'received end-of-ice-candidates signal')
      }
    } catch(err) {
      logger.error(this.id, err);
    }
  }

  setRemoteDescription(description: { sdp: string, type: string }) {
    this.signalingSocket.emit('signal', { description })
    logger.debug(this.id, 'RemoteRTCPeerConnection:', 'provided an offer to the client')
  }

  addRemoteCandidate(candidate: { sdpMid: string, candidate: string }) {
    this.signalingSocket.emit('signal', { candidate })
    logger.debug(this.id, 'RemoteRTCPeerConnection:', 'provided an candidate to the client')
  }

  init(id: string) {
    this.signalingSocket.emit('signal', { id })
    logger.debug(this.id, 'RemoteRTCPeerConnection:', 'provided an id to the client')
  }

  destroy() {
    this.signalingSocket.removeAllListeners('signal')
    this.signalingSocket.removeAllListeners('disconnect')
    this.signalingSocket.disconnect(true)
    this.removeAllListeners()
  }
}