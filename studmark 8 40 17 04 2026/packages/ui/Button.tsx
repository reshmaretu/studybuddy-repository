import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export const Button = ({ className, variant = 'primary', ...props }: ButtonProps) => {
    const variants = {
        primary: 'bg-(--text-main) text-(--bg-dark) hover:scale-105',
        secondary: 'bg-(--bg-dark)/50 text-(--text-muted) hover:text-(--text-main)',
        outline: 'border border-(--border-color) hover:bg-(--bg-card)',
        ghost: 'hover:bg-(--bg-card)'
    };

    return (
        <button 
            className={cn(
                "px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-30",
                variants[variant],
                className
            )}
            {...props}
        />
    );
};
