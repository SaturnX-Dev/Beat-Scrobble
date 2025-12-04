import { useState } from "react";
import { AsyncButton } from "../AsyncButton";
import { ChevronDown, Download, Upload, Archive } from "lucide-react";

type ExportMode = 'full' | 'legacy';

export default function ExportModal() {
    const [loading, setLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [exportMode, setExportMode] = useState<ExportMode>('full');
    const [showModeDropdown, setShowModeDropdown] = useState(false);

    const handleExport = () => {
        setLoading(true);
        setError('');
        setSuccess('');

        fetch(`/apis/web/v1/export`, {
            method: "GET"
        })
            .then(res => {
                if (res.ok) {
                    res.blob()
                        .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = exportMode === 'full'
                                ? "beat-scrobble_backup.json"
                                : "beat-scrobble_export_legacy.json";
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                            setLoading(false);
                            setSuccess('Backup downloaded successfully!');
                        });
                } else {
                    res.json().then(r => setError(r.error));
                    setLoading(false);
                }
            }).catch(err => {
                setError(err.message || 'Export failed');
                setLoading(false);
            });
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        setError('');
        setSuccess('');

        try {
            const text = await file.text();
            const res = await fetch('/apis/web/v1/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: text,
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(data.message || 'Settings restored successfully!');
            } else {
                setError('Import failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            setError('Import failed: Network error');
        } finally {
            setImportLoading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <Archive className="text-[var(--color-primary)]" size={24} />
                <h2 className="text-xl font-bold">Backup</h2>
            </div>

            <p className="text-sm text-[var(--color-fg-secondary)]">
                Create a full backup of your settings, themes, and listening history. You can restore this backup later to recover your data.
            </p>

            {/* Export Mode Selector */}
            <div className="relative">
                <button
                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors w-full justify-between"
                >
                    <span>
                        {exportMode === 'full' ? (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
                                Full Backup (Settings + Themes + History)
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[var(--color-fg-tertiary)]"></span>
                                Legacy Export (History Only)
                            </span>
                        )}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showModeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] rounded-lg overflow-hidden z-10 shadow-lg">
                        <button
                            onClick={() => { setExportMode('full'); setShowModeDropdown(false); }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors ${exportMode === 'full' ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
                        >
                            <div className="font-medium">Full Backup</div>
                            <div className="text-xs text-[var(--color-fg-secondary)]">Settings, themes, and listening history (v2)</div>
                        </button>
                        <button
                            onClick={() => { setExportMode('legacy'); setShowModeDropdown(false); }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors ${exportMode === 'legacy' ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
                        >
                            <div className="font-medium">Legacy Export</div>
                            <div className="text-xs text-[var(--color-fg-secondary)]">Listening history only (v1 format)</div>
                        </button>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
                <AsyncButton
                    loading={loading}
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-dim)] transition-colors"
                >
                    <Download size={16} />
                    {exportMode === 'full' ? 'Download Backup' : 'Download Legacy Export'}
                </AsyncButton>

                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] font-semibold hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer ${importLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload size={16} />
                    {importLoading ? 'Restoring...' : 'Restore from Backup'}
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImport}
                        disabled={importLoading}
                    />
                </label>
            </div>

            {/* Notes */}
            <div className="text-xs text-[var(--color-fg-tertiary)] space-y-1">
                <p>• Full Backup includes your settings, themes, and complete listening history.</p>
                <p>• Restore will only apply settings and themes. Scrobble import is not yet supported.</p>
                <p>• Legacy export is provided for compatibility with older import tools.</p>
            </div>

            {/* Messages */}
            {error && <p className="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 px-3 py-2 rounded-lg">{error}</p>}
            {success && <p className="text-sm text-[var(--color-success)] bg-[var(--color-success)]/10 px-3 py-2 rounded-lg">{success}</p>}
        </div>
    );
}