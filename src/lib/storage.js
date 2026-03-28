// Safe in private browsing — never throws
export const safeStore = (key, value) => {
  try { localStorage.setItem(key, value) } catch {}
}

export const safeGet = (key) => {
  try { return localStorage.getItem(key) } catch { return null }
}
