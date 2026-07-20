export function cancelSpeech() {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

export function speakText(text) {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;

  const cleaned = String(text ?? '').trim();
  if (!cleaned) return;

  try {
    cancelSpeech();

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'en-US';
    utterance.rate = 1; // natural speed
    utterance.pitch = 1; // natural pitch

    // Try to pick an English voice if available (async in many browsers).
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices?.() || [];
      const english = voices.find((v) => String(v.lang || '').toLowerCase().startsWith('en-'));
      if (english) utterance.voice = english;
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;

    window.speechSynthesis.speak(utterance);
  } catch {
    // No-op: speech is best-effort and can be blocked by browser policies.
  }
}

