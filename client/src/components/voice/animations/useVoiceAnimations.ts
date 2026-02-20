import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export const useVoiceAnimations = () => {
  const triggerSuccess = useCallback((options?: confetti.Options) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
      ...options
    });
  }, []);

  const triggerError = useCallback(() => {
    // Shake animation via class manipulation
    const element = document.querySelector('[data-shake-target]');
    if (element) {
      element.classList.add('animate-shake');
      setTimeout(() => element.classList.remove('animate-shake'), 500);
    }
  }, []);

  return { triggerSuccess, triggerError };
};
