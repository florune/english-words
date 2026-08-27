export function dayKey(time = Date.now()) {
  const date = new Date(time)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(time - offset).toISOString().slice(0, 10)
}

export function daysBetween(newer: string, older: string) {
  return Math.round((Date.parse(newer) - Date.parse(older)) / 86_400_000)
}
