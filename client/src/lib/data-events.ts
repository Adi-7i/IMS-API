export const DATA_CHANGED = 'retailops:data-changed'
export function notifyDataChanged() { window.dispatchEvent(new Event(DATA_CHANGED)) }
