'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

interface SuccessPopupProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export function SuccessPopup({ message, isOpen, onClose, duration = 3000 }: SuccessPopupProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, duration]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all">
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Success!
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
