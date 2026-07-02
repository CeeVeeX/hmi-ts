/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PointerType } from './types'

export const getPointerType = (ev: Event): PointerType => {
  const anyEv = ev as any

  if (typeof anyEv.pointerType === 'string') {
    const pt = anyEv.pointerType as string
    if (pt === 'mouse' || pt === 'touch' || pt === 'pen') return pt
    return 'unknown'
  }

  if ('touches' in anyEv || 'changedTouches' in anyEv) return 'touch'
  if ('button' in anyEv) return 'mouse'
  return 'unknown'
}

export const getClientXY = (ev: Event): { x: number; y: number } => {
  const anyEv = ev as any

  if (typeof anyEv.clientX === 'number' && typeof anyEv.clientY === 'number') {
    return { x: anyEv.clientX, y: anyEv.clientY }
  }

  const t = anyEv.changedTouches?.[0] ?? anyEv.touches?.[0]
  if (t && typeof t.clientX === 'number' && typeof t.clientY === 'number') {
    return { x: t.clientX, y: t.clientY }
  }

  return { x: 0, y: 0 }
}

export const isPrimaryButton = (ev: Event): boolean => {
  const anyEv = ev as any
  if (typeof anyEv.button === 'number') return anyEv.button === 0
  return true
}

export const hasModifiers = (ev: Event): boolean => {
  const anyEv = ev as any
  return !!(anyEv.altKey || anyEv.ctrlKey || anyEv.metaKey || anyEv.shiftKey)
}

export const isProbablyInteractive = (el: Element | null): boolean => {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'a' || tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea')
    return true
  const role = el.getAttribute('role')
  return role === 'button' || role === 'link' || role === 'checkbox' || role === 'menuitem'
}

export const getSelectionFingerprint = (): string => {
  if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return ''
  const sel = window.getSelection()
  if (!sel) return ''
  if (sel.rangeCount === 0) return ''
  if (sel.isCollapsed) return 'collapsed'
  const textLen = (sel.toString?.() ?? '').length
  return `range:${sel.anchorOffset}:${sel.focusOffset}:${textLen}`
}

export const isScrollable = (el: Element): boolean => {
  const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : (null as any)
  if (!style) return false
  const overflowY = style.overflowY
  const overflowX = style.overflowX
  const canScrollY =
    (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight
  const canScrollX =
    (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth
  return !!(canScrollX || canScrollY)
}

export const getScrollParents = (start: Element | null): Element[] => {
  const parents: Element[] = []
  let el: Element | null = start

  while (el && el !== document.documentElement) {
    if (isScrollable(el)) parents.push(el)
    el = el.parentElement
  }

  if (typeof document !== 'undefined' && document.scrollingElement)
    parents.push(document.scrollingElement)
  return parents
}

export const containsPoint = (root: Element, x: number, y: number): boolean => {
  if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function')
    return true
  const hit = document.elementFromPoint(x, y)
  if (!hit) return false
  return root === hit || root.contains(hit)
}

export const getDPR = (): number => {
  if (typeof window === 'undefined') return 1
  const dpr = Number(window.devicePixelRatio || 1)
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1
}
