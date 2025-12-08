import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface NotificationModalProps {
    type: "success" | "error" | "info";
    title: string;
    message: string;
    onClose: () => void;
}

export default function NotificationModal({ type, title, message, onClose }: NotificationModalProps) {
    const isSuccess = type === "success";
    const Icon = isSuccess ? CheckCircle2 : AlertCircle;
    const iconColor = isSuccess ? "text-green-500" : "text-red-500";
    const bgIconColor = isSuccess ? "bg-green-500/20" : "bg-red-500/20";
    const buttonColor = isSuccess ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700";

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[var(--color-bg-tertiary)] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full ${bgIconColor} flex items-center justify-center`}>
                        <Icon size={24} className={iconColor} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[var(--color-fg)]">{title}</h3>
                        <p className="text-sm text-[var(--color-fg-secondary)]">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className={`flex-1 px-4 py-3 rounded-xl ${buttonColor} text-white font-medium transition-all shadow-lg`}
                    >
                        Great!
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
