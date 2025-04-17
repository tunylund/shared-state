let debugLog = true

const logger = {
  log: (...args: any[]) => console.log("shared-state-client", ...args),
  error: (...args: any[]) => console.error("shared-state-client", ...args),
  debug: (...args: any[]) => debugLog ? console.debug("shared-state-client", ...args) : ''
}

export function setLogLevel(logDebugMessages: boolean) {
  debugLog = logDebugMessages
}

export default logger
