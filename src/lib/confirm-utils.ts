/**
 * Custom confirm dialog using a promise-based approach.
 * Falls back to window.confirm if the custom dialog is not available.
 */
let confirmResolver: ((value: boolean) => void) | null = null;

export function showConfirm(message: string): Promise<boolean> {
  // Fallback to native confirm
  return Promise.resolve(window.confirm(message));
}

export async function confirmAction(message: string): Promise<boolean> {
  return showConfirm(message);
}
