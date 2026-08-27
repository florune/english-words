export function speakWord(word: string) {
  if (!('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  utterance.rate = 0.85
  const voice = speechSynthesis.getVoices().find((item) => item.lang.startsWith('en-US'))
    ?? speechSynthesis.getVoices().find((item) => item.lang.startsWith('en'))
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
  return true
}
