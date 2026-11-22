/**
 * Web Speech Audio Cues Service
 *
 * Provides real-time spoken feedback during runs (e.g. at every kilometer split)
 * using the native browser SpeechSynthesis API (100% offline, zero latency, zero backend).
 */

export const speakKilometerSplit = (
  km,
  lapSeconds,
  lang = "id",
  activity = "run",
) => {
  if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech

    const mins = Math.floor(lapSeconds / 60);
    const secs = lapSeconds % 60;

    let text = "";
    if (activity === "ride") {
      // Cycling cues announce average speed instead of running pace.
      const kmh = lapSeconds > 0 ? (3600 / lapSeconds).toFixed(1) : "0";
      text =
        lang === "en"
          ? `Kilometer ${km}. Average speed ${kmh} kilometers per hour.`
          : `Kilometer ${km}. Kecepatan rata-rata ${kmh} kilometer per jam.`;
    } else if (lang === "en") {
      const secText = secs > 0 ? ` ${secs} seconds` : "";
      text = `Kilometer ${km}. Pace ${mins} minutes${secText}.`;
    } else {
      const secText = secs > 0 ? ` ${secs} detik` : "";
      text = `Kilometer ${km}. Pace ${mins} menit${secText}.`;
    }

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "id-ID";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick appropriate voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const prefix = lang === "en" ? "en" : "id";
      const targetVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(prefix),
      );
      if (targetVoice) {
        utterance.voice = targetVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
};
