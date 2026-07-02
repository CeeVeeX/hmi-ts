/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Directive, DirectiveBinding } from 'vue'
import { onBeforeUnmount } from 'vue'
import type { IntentPressEvent, IntentPressOptions } from './types'
import { createIntentPress } from './index'

export const useIntentPress = (
  onIntent: (ev: IntentPressEvent) => void,
  options: IntentPressOptions = {},
) => {
  const ctl = createIntentPress(onIntent, options)
  onBeforeUnmount(() => ctl.destroy())
  return ctl
}

type ElWithCtl = HTMLElement & { __intentCtl?: ReturnType<typeof createIntentPress> }

export const vIntentPress: Directive<
  HTMLElement,
  | ((ev: IntentPressEvent) => void)
  | { handler: (ev: IntentPressEvent) => void; options?: IntentPressOptions }
> = {
  mounted(el: ElWithCtl, binding: DirectiveBinding<any>) {
    const value = binding.value
    const handler = typeof value === 'function' ? value : value?.handler
    const options: IntentPressOptions =
      typeof value === 'object' && value?.options ? value.options : {}

    const ctl = createIntentPress(handler, options)
    el.__intentCtl = ctl

    el.addEventListener('pointerdown', ctl.onPointerDown, { passive: true })
    el.addEventListener('click', ctl.onClickCapture, { capture: true })
  },
  unmounted(el: ElWithCtl) {
    el.__intentCtl?.destroy()
    delete el.__intentCtl
  },
}
