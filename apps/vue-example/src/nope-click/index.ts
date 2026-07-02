/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CancelReason,
  IntentPressEvent,
  IntentPressHandlers,
  IntentPressOptions,
  PointerType,
} from './types'

import {
  containsPoint,
  getClientXY,
  getDPR,
  getPointerType,
  getScrollParents,
  getSelectionFingerprint,
  hasModifiers,
  isPrimaryButton,
  isProbablyInteractive,
} from './dom'

import { canUseDOM, cancelIdle, queueMicrotaskSafe, requestIdle } from './scheduler'

type OnIntent = (ev: IntentPressEvent) => void

type ActiveInteraction = {
  pointerType: PointerType
  pointerId: number | null
  startedAt: number
  startX: number
  startY: number
  targetEl: Element | null
  currentTargetEl: Element | null
  selectionAtStart: string
  scrollParents: Element[]
  cleanupIdleHandle: number | null
  abortController: AbortController
}

const DEFAULT_MAX_GUARD_MS = 650

const computeSlop = (pointerType: PointerType, dpr: number): number => {
  const base = pointerType === 'touch' ? 12 : pointerType === 'pen' ? 8 : 4
  const scale = Math.min(1.5, Math.max(1, dpr / 2))
  return base * scale
}

const toIntentEvent = (
  phase: IntentPressEvent['phase'],
  ev: Event,
  pointerType: PointerType,
  reason?: CancelReason,
): IntentPressEvent => {
  const anyEv = ev as any
  const { x, y } = getClientXY(ev)

  return {
    phase,
    pointerType,
    target: ev.target ?? null,
    currentTarget: anyEv.currentTarget ?? null,
    clientX: x,
    clientY: y,
    timeStamp: typeof ev.timeStamp === 'number' ? ev.timeStamp : Date.now(),
    altKey: !!anyEv.altKey,
    ctrlKey: !!anyEv.ctrlKey,
    metaKey: !!anyEv.metaKey,
    shiftKey: !!anyEv.shiftKey,
    button: typeof anyEv.button === 'number' ? anyEv.button : undefined,
    originalEvent: ev,
    reason,
  }
}

export const createIntentPress = (
  onIntent: OnIntent,
  options: IntentPressOptions = {},
): IntentPressHandlers => {
  let enabled = options.enabled ?? true
  let destroyed = false

  const safeNoop: IntentPressHandlers = {
    onPointerDown: () => void 0,
    onClickCapture: () => void 0,
    destroy: () => void 0,
    setEnabled: () => void 0,
  }

  if (!canUseDOM()) return safeNoop

  let active: ActiveInteraction | null = null

  let lastGuardToken: { ts: number; x: number; y: number } | null = null

  const scheduleCleanup = (interaction: ActiveInteraction): void => {
    if (interaction.cleanupIdleHandle != null) return

    interaction.cleanupIdleHandle = requestIdle(() => {
      interaction.scrollParents.length = 0
      interaction.cleanupIdleHandle = null
    }, 300)
  }

  const cancelActive = (reason: CancelReason, originalEvent: Event): void => {
    if (!active) return

    const interaction = active
    active = null

    try {
      onIntent(toIntentEvent('cancel', originalEvent, interaction.pointerType, reason))
    } catch {
      // ignore userland errors
    }

    interaction.abortController.abort()

    if (interaction.cleanupIdleHandle != null) cancelIdle(interaction.cleanupIdleHandle)
    scheduleCleanup(interaction)
  }

  const commitIntent = (originalEvent: Event, interaction: ActiveInteraction): void => {
    const pointerType = interaction.pointerType
    const intentEv = toIntentEvent('intent', originalEvent, pointerType)

    const { x, y } = getClientXY(originalEvent)
    lastGuardToken = { ts: Date.now(), x, y }

    interaction.abortController.abort()
    if (interaction.cleanupIdleHandle != null) cancelIdle(interaction.cleanupIdleHandle)
    scheduleCleanup(interaction)

    queueMicrotaskSafe(() => {
      onIntent(intentEv)
    })
  }

  const shouldPreventDefaultOnDown = (currentTargetEl: Element | null): boolean => {
    if (!options.preventDefault) return false
    return !isProbablyInteractive(currentTargetEl)
  }

  const attachScrollListeners = (interaction: ActiveInteraction): void => {
    const onScroll = (e: Event) => cancelActive('scrolled', e)

    for (const p of interaction.scrollParents) {
      p.addEventListener('scroll', onScroll, {
        capture: true,
        passive: true,
        signal: interaction.abortController.signal,
      })
    }
    window.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
      signal: interaction.abortController.signal,
    })
  }

  const attachMoveUpCancel = (interaction: ActiveInteraction): void => {
    const slop = options.slop ?? computeSlop(interaction.pointerType, getDPR())
    const maxPressMs = options.maxPressMs ?? 0

    const onMove = (e: Event) => {
      if (!active || active !== interaction) return
      const { x, y } = getClientXY(e)
      const dx = x - interaction.startX
      const dy = y - interaction.startY
      if (dx * dx + dy * dy > slop * slop) cancelActive('moved', e)
    }

    const onCancel = (e: Event) => cancelActive('canceled', e)

    const onLostCapture = (e: Event) => cancelActive('lost-capture', e)

    const onUp = (e: Event) => {
      if (!active || active !== interaction) return

      if (maxPressMs > 0 && Date.now() - interaction.startedAt > maxPressMs) {
        cancelActive('timeout', e)
        return
      }

      if (!(options.allowTextSelection ?? false)) {
        const nowSel = getSelectionFingerprint()
        if (nowSel !== interaction.selectionAtStart && nowSel !== 'collapsed') {
          cancelActive('selection', e)
          return
        }
      }

      const { x, y } = getClientXY(e)
      const root = interaction.currentTargetEl ?? interaction.targetEl
      if (root && !containsPoint(root, x, y)) {
        cancelActive('hit-test', e)
        return
      }

      // commit
      active = null
      commitIntent(e, interaction)
    }

    window.addEventListener('pointermove', onMove, {
      passive: true,
      signal: interaction.abortController.signal,
    })
    window.addEventListener('pointerup', onUp, {
      passive: true,
      signal: interaction.abortController.signal,
    })
    window.addEventListener('pointercancel', onCancel, {
      passive: true,
      signal: interaction.abortController.signal,
    })
    window.addEventListener('lostpointercapture', onLostCapture as any, {
      passive: true,
      signal: interaction.abortController.signal,
    })
    window.addEventListener('resize', onCancel, {
      passive: true,
      signal: interaction.abortController.signal,
    })
  }

  const onPointerDown = (ev: Event): void => {
    if (destroyed || !enabled) return

    // If a previous interaction is still alive, kill it to avoid leaks.
    if (active) cancelActive('unmounted', ev)

    const pointerType = getPointerType(ev)
    const anyEv = ev as any

    const currentTargetEl: Element | null =
      anyEv.currentTarget && (anyEv.currentTarget as Element).nodeType === 1
        ? (anyEv.currentTarget as Element)
        : null

    const targetEl: Element | null =
      ev.target && (ev.target as Element).nodeType === 1 ? (ev.target as Element) : null

    const allowNonPrimary = options.allowNonPrimary ?? false
    if (!allowNonPrimary && !isPrimaryButton(ev)) {
      // no active interaction to cancel; just emit cancel for observability
      try {
        onIntent(toIntentEvent('cancel', ev, pointerType, 'non-primary'))
      } catch {}
      return
    }

    const allowModified = options.allowModified ?? false
    if (!allowModified && hasModifiers(ev)) {
      try {
        onIntent(toIntentEvent('cancel', ev, pointerType, 'modified'))
      } catch {}
      return
    }

    if (shouldPreventDefaultOnDown(currentTargetEl)) {
      try {
        ;(ev as any).preventDefault?.()
      } catch {}
    }

    const { x, y } = getClientXY(ev)

    const interaction: ActiveInteraction = {
      pointerType,
      pointerId: typeof anyEv.pointerId === 'number' ? anyEv.pointerId : null,
      startedAt: Date.now(),
      startX: x,
      startY: y,
      targetEl,
      currentTargetEl,
      selectionAtStart: (options.allowTextSelection ?? false) ? '' : getSelectionFingerprint(),
      scrollParents: getScrollParents(currentTargetEl ?? targetEl),
      cleanupIdleHandle: null,
      abortController: new AbortController(),
    }

    active = interaction

    try {
      const ct = currentTargetEl as any
      if (ct && typeof ct.setPointerCapture === 'function' && interaction.pointerId != null) {
        ct.setPointerCapture(interaction.pointerId)
      }
    } catch {
      // Safari oddities: ignore
    }

    try {
      onIntent(toIntentEvent('start', ev, pointerType))
    } catch {}

    attachScrollListeners(interaction)
    attachMoveUpCancel(interaction)
  }

  const onClickCapture = (ev: Event): void => {
    if (destroyed) return
    const clickGuard = options.clickGuard ?? true
    if (!clickGuard || !lastGuardToken) return

    const now = Date.now()
    if (now - lastGuardToken.ts > DEFAULT_MAX_GUARD_MS) return

    const { x, y } = getClientXY(ev)
    const dx = x - lastGuardToken.x
    const dy = y - lastGuardToken.y
    const dist2 = dx * dx + dy * dy

    if (dist2 <= 20 * 20) {
      try {
        ;(ev as any).preventDefault?.()
        ;(ev as any).stopPropagation?.()
      } catch {}
    }
  }

  const destroy = (): void => {
    if (destroyed) return
    destroyed = true
    if (active) cancelActive('unmounted', new Event('destroy'))
    active = null
    lastGuardToken = null
  }

  const setEnabled = (v: boolean): void => {
    enabled = v
    if (!enabled && active) cancelActive('disabled', new Event('disabled'))
  }

  return { onPointerDown, onClickCapture, destroy, setEnabled }
}

export type {
  IntentPressHandlers,
  IntentPressOptions,
  IntentPressEvent,
  CancelReason,
} from './types'
