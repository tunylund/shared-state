let debugLog = true

const logger = {
  log: (...args: any[]) => console.log("shared-state-server", ...args),
  error: (...args: any[]) => console.error("shared-state-server", ...args),
  debug: (...args: any[]) => debugLog ? console.debug("shared-state-server", ...args) : ''
}

export function setLogLevel(logDebugMessages: boolean) {
  debugLog = logDebugMessages
}

export default logger
