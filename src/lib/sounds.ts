// src/lib/sounds.ts

type SoundType = 
  | 'correct' 
  | 'wrong' 
  | 'click' 
  | 'streak' 
  | 'levelup' 
  | 'purchase' 
  | 'start_lesson' 
  | 'lesson_finish' 
  | 'lock' 
  | 'claim' 
  | 'error' 
  | 'ai_message';

export function playAudio(soundName: SoundType) {
  if (typeof window === 'undefined') return; // Executa apenas no cliente

  try {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = 0.5; // Ajuste o volume de 0.0 a 1.0 conforme necessário
    audio.play().catch((err) => {
      console.warn('Erro ao tentar reproduzir o áudio:', err);
    });
  } catch (error) {
    console.error('Falha ao inicializar o áudio:', error);
  }
}


export function vibrateDevice(pattern: number | number[] = 200) {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    // Vibra o dispositivo pelo tempo ou padrão especificado (em milissegundos)
    navigator.vibrate(pattern);
  } catch (error) {
    console.error('Falha ao tentar vibrar o dispositivo:', error);
  }
}