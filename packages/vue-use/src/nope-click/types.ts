export type PointerType = 'mouse' | 'touch' | 'pen' | 'unknown'

export type CancelReason =
  | 'disabled'
  | 'non-primary'
  | 'modified'
  | 'moved'
  | 'scrolled'
  | 'selection'
  | 'canceled'
  | 'lost-capture'
  | 'hit-test'
  | 'unmounted'
  | 'timeout'

export type IntentPressPhase = 'start' | 'cancel' | 'intent'

export interface IntentPressEvent {
  phase: IntentPressPhase
  pointerType: PointerType
  target: EventTarget | null
  currentTarget: EventTarget | null

  clientX: number
  clientY: number

  timeStamp: number
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  button?: number

  originalEvent: Event
  reason?: CancelReason | undefined
}

export interface IntentPressOptions {
  slop?: number
  maxPressMs?: number
  allowModified?: boolean
  allowTextSelection?: boolean
  allowNonPrimary?: boolean
  preventDefault?: boolean
  clickGuard?: boolean
  enabled?: boolean
}

export interface IntentPressHandlers {
  onPointerDown: (ev: Event) => void
  onClickCapture: (ev: Event) => void
  destroy: () => void
  setEnabled: (enabled: boolean) => void
}
