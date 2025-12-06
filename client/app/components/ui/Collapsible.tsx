import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";

interface CollapsibleProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
    icon?: ReactNode;
    subtitle?: string;
}

export function Collapsible({ title, children, defaultOpen = false, icon, subtitle }: CollapsibleProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-[var(--color-bg-tertiary)] rounded-xl overflow-hidden md:bg-[var(--color-bg-secondary)]/50 transition-all">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-bg-tertiary)]/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {icon && <div className="text-[var(--color-primary)]">{icon}</div>}
                    <div>
                        <h3 className="text-sm font-bold text-[var(--color-fg)]">{title}</h3>
                        {subtitle && <p className="text-xs text-[var(--color-fg-secondary)]">{subtitle}</p>}
                    </div>
                </div>
                <div className={`text-[var(--color-fg-secondary)] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                    <ChevronDown size={18} />
                </div>
            </button>
            <div
                className={`transition-all duration-300 ease-in-out border-t border-[var(--color-bg-tertiary)] ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 border-none"
                    }`}
            >
                <div className="p-4 sm:p-6 space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
