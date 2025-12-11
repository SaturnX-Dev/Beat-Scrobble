
import React, { useEffect, useState } from 'react';

const RelaySettings = () => {
    const [enabled, setEnabled] = useState(false);
    const [url, setUrl] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('/apis/web/v1/user/preferences')
            .then(res => res.json())
            .then(data => {
                setEnabled(data.relay_enabled || false);
                setUrl(data.relay_url || '');
                setToken(data.relay_token || '');
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch preferences", err);
                setLoading(false);
            });
    }, []);

    const handleSave = () => {
        setSaving(true);
        setMessage('');

        const payload = {
            relay_enabled: enabled,
            relay_url: url,
            relay_token: token
        };

        fetch('/apis/web/v1/user/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                setSaving(false);
                if (data.success) {
                    setMessage('Settings saved successfully');
                } else {
                    setMessage('Failed to save settings');
                }
                setTimeout(() => setMessage(''), 3000);
            })
            .catch(err => {
                setSaving(false);
                setMessage('Error saving settings');
                console.error(err);
            });
    };

    if (loading) {
        return <div className="text-[var(--color-fg-secondary)] p-4">Loading settings...</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-[var(--color-fg)]">Relay / Proxy Mode</h2>
                <p className="text-[var(--color-fg-secondary)]">
                    Automatically forward your scrobbles to another ListenBrainz-compatible server (e.g., ListenBrainz.org, Maloja, or another Beat Scrobble instance).
                    <br />
                    <span className="text-xs opacity-70">
                        Acts as a "Server-Side Memory" proxy: we save the scrobble here first, then send it there.
                    </span>
                </p>
            </div>

            <div className="p-6 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] flex flex-col gap-6">

                {/* Enable Switch */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <label className="font-semibold text-[var(--color-fg)]">Enable Relay</label>
                        <span className="text-sm text-[var(--color-fg-secondary)]">Turn on forwarding</span>
                    </div>
                    <button
                        onClick={() => setEnabled(!enabled)}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2
                            ${enabled ? 'bg-[var(--color-primary)]' : 'bg-gray-600'}
                        `}
                    >
                        <span
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${enabled ? 'translate-x-6' : 'translate-x-1'}
                            `}
                        />
                    </button>
                </div>

                {/* URL Input */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[var(--color-fg)]">Target Base URL</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://api.listenbrainz.org/1"
                        className="w-full px-3 py-2 rounded-md bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <p className="text-xs text-[var(--color-fg-secondary)]">
                        The base API URL. We will append <code>/submit-listens</code> to this.
                    </p>
                </div>

                {/* Token Input */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[var(--color-fg)]">Authorization Token</label>
                    <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Your User Token"
                        className="w-full px-3 py-2 rounded-md bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4 pt-4 border-t border-[var(--color-bg-tertiary)]">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-md bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                    {message && (
                        <span className={`text-sm ${message.includes('Error') || message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                            {message}
                        </span>
                    )}
                </div>

            </div>
        </div>
    );
};

export default RelaySettings;
