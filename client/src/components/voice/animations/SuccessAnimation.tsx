import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SuccessAnimationProps {
  isVisible: boolean;
  message?: string;
  onComplete: () => void;
  showConfetti?: boolean;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  isVisible,
  message = 'UPDATED SUCCESSFULLY',
  onComplete,
  showConfetti = false
}) => {
  useEffect(() => {
    if (isVisible && showConfetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });
    }
  }, [isVisible, showConfetti]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.1, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 rounded-xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2"
          >
            <CheckCircle className="text-green-600 w-10 h-10" />
          </motion.div>
          <span className="text-sm font-bold text-green-700 tracking-tight">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
