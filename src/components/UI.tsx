import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center group">
      {children}
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className={cn("ml-1 p-0.5 text-gray-400 hover:text-blue-600 transition-colors", className)}
        aria-label="Informação"
      >
        <Info size={14} />
      </button>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-xl pointer-events-none"
          >
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className, 
  children, 
  onClick,
  loading,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-900 text-white hover:bg-blue-800 shadow-sm',
    secondary: 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm',
    outline: 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg font-medium',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      onClick={onClick}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      ) : icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  key?: React.Key;
}

export function Card({ className, children, onClick }: CardProps) {
  return (
    <div 
      className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 md:p-6", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function Badge({ 
  children, 
  variant = 'neutral',
  className
}: { 
  children: React.ReactNode; 
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'teal';
  className?: string;
}) {
  const variants = {
    neutral: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    teal: 'bg-teal-100 text-teal-700',
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}
