export function englishVoices() {
  if (!('speechSynthesis' in window)) return []
  return speechSynthesis.getVoices().filter((voice) => /^en(?:-|_)/i.test(voice.lang))
}

export function speakWord(word: string, options: { voiceURI?: string; slow?: boolean } = {}) {
  if (!('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  utterance.rate = options.slow ? 0.65 : 0.85
  const voices = englishVoices()
  const voice = voices.find((item) => item.voiceURI === options.voiceURI)
    ?? voices.find((item) => item.lang.startsWith('en-US'))
    ?? voices[0]
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
  return true
}
