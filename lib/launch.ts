// 'pre-register': the app is not on the stores, so the site collects pre-registrations.
// 'store': the app is on the stores (soft launch or official launch), so the store buttons come back.
export type LaunchPhase = 'pre-register' | 'store'

export const LAUNCH_PHASE: LaunchPhase = 'pre-register'
