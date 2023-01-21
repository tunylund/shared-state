let debugLog = true

const logger = {
  log: console.log,
  error: console.error,
  debug: (...args: any[]) => debugLog ? console.debug(...args) : ''
}

export function setLogLevel(logDebugMessages: boolean) {
  debugLog = logDebugMessages
}

export default logger
