import { type LucideIcon, Music } from "lucide-react";
import { Link } from "react-router";

interface Props {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    actionLabel?: string;
    actionLink?: string;
    className?: string;
}

export default function EmptyState({
    icon: Icon = Music,
    title = "No items found",
    description,
    actionLabel,
    actionLink,
    className
}: Props) {
    return (
        <div className={`w-full py-12 flex flex-col items-center justify-center text-center p-6 bg-[var(--color-bg-secondary)]/30 rounded-2xl border-2 border-dashed border-[var(--color-bg-tertiary)]/50 ${className || ''}`}>
            <div className="w-16 h-16 bg-[var(--color-bg-tertiary)]/30 rounded-full flex items-center justify-center mb-4 text-[var(--color-fg-tertiary)]">
                <Icon size={32} strokeWidth={1.5} />
            </div>

            <h3 className="text-[var(--color-fg)] font-medium text-lg mb-1">{title}</h3>

            {description && (
                <p className="text-[var(--color-fg-secondary)] text-sm max-w-xs mb-6">
                    {description}
                </p>
            )}

            {actionLabel && actionLink && (
                <Link
                    to={actionLink}
                    className="px-5 py-2.5 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-primary)] text-[var(--color-fg)] rounded-full text-sm font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
                >
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
