import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

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
      }, 100); // Match fade-out duration
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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-100 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
    >
      <div
        ref={modalRef}
        className={`glass-card rounded-2xl shadow-2xl p-6 w-full relative max-h-3/4 overflow-y-auto transition-all duration-100 border border-[var(--color-bg-tertiary)]/50 hide-scrollbar ${isClosing ? 'animate-fade-out-scale' : 'animate-fade-in-scale'
          } ${className || ''}`}
        style={{ maxWidth: maxW ?? 600, height: h ?? '' }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 color-fg-tertiary hover:cursor-pointer"
        >
          🞪
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
