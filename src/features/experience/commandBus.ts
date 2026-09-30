/** Tiny event bus so any component can open the command palette / assistant. */
export const OPEN_PALETTE_EVENT = 'ss:open-palette';
export const OPEN_ASSISTANT_EVENT = 'ss:open-assistant';

export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

export function openAssistant(): void {
  window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
}
