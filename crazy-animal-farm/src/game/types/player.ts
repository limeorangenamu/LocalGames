export type PlayerMovementState = 'idle' | 'move' | 'sprint' | 'dodge'

export type PlayerActionResourceProfile = Readonly<{
  maxStamina: number
  staminaCostMultiplier: number
  staminaRecoveryMultiplier: number
  dodgeDistanceMultiplier: number
}>

export type PlayerActionResourceSnapshot = Readonly<{
  stamina: number
  maxStamina: number
  recoveryDelayed: boolean
  movementState: PlayerMovementState
}>
