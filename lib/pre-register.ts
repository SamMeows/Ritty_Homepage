export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MAX_EMAIL_LENGTH = 254

export const PLATFORMS = ['ios', 'android'] as const
export type Platform = (typeof PLATFORMS)[number]

export type PreRegisterResult = 'created' | 'duplicate'
