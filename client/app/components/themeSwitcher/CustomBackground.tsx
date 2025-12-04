import { useState, useEffect, useRef } from "react";
import { ChevronDown, Image, Film, AlertTriangle, Upload, X, Info } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";

export function CustomBackground() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [backgroundType, setBackgroundType] = useState<'none' | 'image' | 'video'>('none');
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const { getPreference, savePreference } = usePreferences();

    // Load from server preferences on mount
    useEffect(() => {
        const storedType = getPreference('customBackgroundType', 'none') as 'none' | 'image' | 'video';
        const storedUrl = getPreference('customBackgroundUrl', '');
        setBackgroundType(storedType);
        setBackgroundUrl(storedUrl);
        if (storedUrl) {
            setPreviewUrl(storedUrl);
            applyBackground(storedType, storedUrl);
        }
    }, [getPreference]);

    const applyBackground = (type: 'none' | 'image' | 'video', url: string) => {
        const root = document.documentElement;
        const existingVideo = document.getElementById('custom-background-video');

        if (type === 'none' || !url) {
            root.style.removeProperty('--custom-background-image');
            if (existingVideo) existingVideo.remove();
            return;
        }

        if (type === 'image') {
            root.style.setProperty('--custom-background-image', `url(${url})`);
            if (existingVideo) existingVideo.remove();
        } else if (type === 'video') {
            root.style.removeProperty('--custom-background-image');
            if (existingVideo) existingVideo.remove();

            const video = document.createElement('video');
            video.id = 'custom-background-video';
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.src = url;
            video.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        object-fit: cover;
        z-index: -1;
        pointer-events: none;
        opacity: 0.3;
      `;
            document.body.prepend(video);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
            alert('Please upload an image or video file.');
            return;
        }

        // Check file size (warn if > 5MB)
        if (file.size > 5 * 1024 * 1024) {
            if (!confirm('This file is larger than 5MB and may impact performance. Continue?')) {
                return;
            }
        }

        setUploading(true);

        // Convert to base64 for storage
        const reader = new FileReader();
        reader.onload = async (event) => {
            const url = event.target?.result as string;
            const type = isVideo ? 'video' : 'image';

            setBackgroundType(type);
            setBackgroundUrl(url);
            setPreviewUrl(url);

            // Save to server
            await savePreference('customBackgroundType', type);
            await savePreference('customBackgroundUrl', url);

            applyBackground(type, url);
            setUploading(false);
        };
        reader.onerror = () => {
            setUploading(false);
            alert('Failed to read file.');
        };
        reader.readAsDataURL(file);
    };

    const clearBackground = async () => {
        setBackgroundType('none');
        setBackgroundUrl('');
        setPreviewUrl('');

        // Clear from server
        await savePreference('customBackgroundType', 'none');
        await savePreference('customBackgroundUrl', '');

        applyBackground('none', '');
    };

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-bg-tertiary)]">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] group-hover:bg-[var(--color-accent)]/10 transition-colors">
                        <Image size={18} className="text-[var(--color-accent)]" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-[var(--color-fg)]">Custom Background</h3>
                        <p className="text-xs text-[var(--color-fg-secondary)]">Upload personalized background image or video</p>
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-[var(--color-fg-secondary)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30">
                        <AlertTriangle size={16} className="text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-[var(--color-fg)]">Performance Warning</p>
                            <p className="text-[10px] text-[var(--color-fg-secondary)]">
                                Large files may slow down performance. Videos especially can impact battery life.
                            </p>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-info)]/10 border border-[var(--color-info)]/30">
                        <Info size={16} className="text-[var(--color-info)] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-[var(--color-fg)]">Recommended Formats</p>
                            <ul className="text-[10px] text-[var(--color-fg-secondary)] list-disc list-inside">
                                <li>Images: WebP, JPEG (max 1920x1080, under 2MB)</li>
                                <li>Videos: MP4 H.264 (max 1080p, under 5MB, 10-30 sec loops)</li>
                            </ul>
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div className="space-y-3">
                        {previewUrl ? (
                            <div className="relative">
                                <div className="aspect-video w-full rounded-lg overflow-hidden bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)]">
                                    {backgroundType === 'video' ? (
                                        <video src={previewUrl} autoPlay loop muted className="w-full h-full object-cover opacity-60" />
                                    ) : (
                                        <img src={previewUrl} alt="Background preview" className="w-full h-full object-cover opacity-60" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="px-3 py-1 bg-black/50 rounded-full text-xs text-white backdrop-blur-sm">
                                            {backgroundType === 'video' ? <Film size={14} className="inline mr-1" /> : <Image size={14} className="inline mr-1" />}
                                            {backgroundType.charAt(0).toUpperCase() + backgroundType.slice(1)} Background Active
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={clearBackground}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/80 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]/50 cursor-pointer transition-colors bg-[var(--color-bg)] ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Upload size={24} className="text-[var(--color-fg-tertiary)] mb-2" />
                                <span className="text-sm font-medium text-[var(--color-fg)]">
                                    {uploading ? 'Uploading...' : 'Upload Background'}
                                </span>
                                <span className="text-xs text-[var(--color-fg-secondary)]">Image or looping video</span>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {previewUrl && (
                        <label className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-tertiary)]/50 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Upload size={14} />
                            <span className="text-sm">{uploading ? 'Uploading...' : 'Replace Background'}</span>
                            <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                    )}

                    <p className="text-[10px] text-[var(--color-fg-tertiary)] text-center">
                        Custom backgrounds enhance glassmorphism effects. Settings sync across all your devices.
                    </p>
                </div>
            )}
        </div>
    );
}
