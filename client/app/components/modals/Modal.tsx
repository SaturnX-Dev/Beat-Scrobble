import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  children,
  maxW,
  h,
  className
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: number;
  h?: number;
  className?: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Show/hide logic
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, 200); // Slower fade-out for premium feel
      return () => clearTimeout(timeout);
    }
  }, [isOpen, shouldRender]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
    >
      <div
        ref={modalRef}
        className={`glass-card rounded-3xl shadow-2xl p-6 w-full relative max-h-[85vh] overflow-y-auto transition-all duration-300 ease-out border border-[var(--color-bg-tertiary)]/50 hide-scrollbar ${isClosing ? 'animate-fade-out-scale' : 'animate-fade-in-scale'
          } ${className || ''}`}
        style={{ maxWidth: maxW ?? 600, height: h ?? '' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[var(--color-bg)]/20 hover:bg-[var(--color-fg)]/10 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-all duration-300 ease-out active:scale-95 backdrop-blur-sm z-50 border border-transparent hover:border-[var(--color-fg)]/10"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
