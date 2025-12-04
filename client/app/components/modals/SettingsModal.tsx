import { Modal } from "./Modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import AccountPage from "./AccountPage";
import { ThemeSwitcher } from "../themeSwitcher/ThemeSwitcher";
import { useAppContext } from "~/providers/AppProvider";
import ApiKeysModal from "./ApiKeysModal";
import { AsyncButton } from "../AsyncButton";
import ExportModal from "./ExportModal";
import { usePreferences } from "~/hooks/usePreferences";
import { useState, useEffect } from "react";
import { Globe, Share2 } from "lucide-react";

interface Props {
    open: boolean
    setOpen: Function
}

export default function SettingsModal({ open, setOpen }: Props) {

    const { user } = useAppContext()
    const { getPreference, savePreference } = usePreferences();
    const [hostname, setHostname] = useState('');
    const [shareEnabled, setShareEnabled] = useState(false);

    useEffect(() => {
        setHostname(getPreference('share_hostname', window.location.origin));
        setShareEnabled(getPreference('profile_share_enabled', false));
    }, [getPreference]);

    const triggerClasses = "px-4 py-2 w-full hover-bg-secondary rounded-md text-start data-[state=active]:bg-[var(--color-bg-secondary)]"
    const contentClasses = "w-full px-2 mt-8 sm:mt-0 sm:px-10 overflow-y-auto"

    return (
        <Modal h={800} isOpen={open} onClose={() => setOpen(false)} maxW={1000} className="!backdrop-blur-none !bg-[var(--color-bg)]/95">
            <Tabs
                defaultValue="Appearance"
                orientation="vertical" // still vertical, but layout is responsive via Tailwind
                className="flex flex-col sm:flex-row h-full gap-4"
            >
                <TabsList className="flex flex-row sm:flex-col gap-1 w-full sm:w-48 sm:min-w-[12rem] rounded-md bg-[var(--color-bg-secondary)] p-2 flex-shrink-0">
                    <TabsTrigger className={triggerClasses} value="Appearance">Appearance</TabsTrigger>
                    <TabsTrigger className={triggerClasses} value="Account">Account</TabsTrigger>
                    {user && (
                        <>
                            <TabsTrigger className={triggerClasses} value="API Keys">
                                API Keys
                            </TabsTrigger>
                            <TabsTrigger className={triggerClasses} value="Export">Export</TabsTrigger>
                            <TabsTrigger className={triggerClasses} value="Sharing">Sharing</TabsTrigger>
                        </>
                    )}
                    <TabsTrigger className={triggerClasses} value="About">About</TabsTrigger>
                </TabsList>

                <TabsContent value="Account" className={contentClasses}>
                    <AccountPage />
                </TabsContent>
                <TabsContent value="Appearance" className={contentClasses}>
                    <ThemeSwitcher />
                </TabsContent>
                <TabsContent value="API Keys" className={contentClasses}>
                    <ApiKeysModal />
                </TabsContent>
                <TabsContent value="Export" className={contentClasses}>
                    <ExportModal />
                </TabsContent>
                <TabsContent value="Sharing" className={contentClasses}>
                    <div className="flex flex-col gap-6">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--color-fg)] mb-2">Sharing</h2>
                            <p className="text-[var(--color-fg-secondary)] text-sm">
                                Configure how others can view your profile
                            </p>
                        </div>

                        {/* Hostname Configuration */}
                        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)]">
                                    <Globe size={20} className="text-[var(--color-primary)]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--color-fg)]">Public URL Hostname</h3>
                                    <p className="text-xs text-[var(--color-fg-secondary)]">The base URL for sharing your profile</p>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={hostname}
                                onChange={(e) => setHostname(e.target.value)}
                                onBlur={() => savePreference('share_hostname', hostname)}
                                placeholder="https://beat-scrobble.example.com"
                                className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                            />
                            <p className="text-xs text-[var(--color-fg-tertiary)] mt-2">
                                Enter the domain where your Beat Scrobble instance is publicly accessible
                            </p>
                        </div>

                        {/* Profile Sharing Toggle */}
                        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)]">
                                        <Share2 size={20} className="text-[var(--color-accent)]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[var(--color-fg)]">Enable Public Profile</h3>
                                        <p className="text-xs text-[var(--color-fg-secondary)]">
                                            Allow others to view your stats via shared link
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const newValue = !shareEnabled;
                                        setShareEnabled(newValue);
                                        savePreference('profile_share_enabled', newValue);
                                    }}
                                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${shareEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
                                        }`}
                                >
                                    <div
                                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${shareEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {shareEnabled && (
                            <div className="p-4 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
                                <p className="text-sm text-[var(--color-fg)]">
                                    Your profile is shareable at: <code className="bg-[var(--color-bg)] px-2 py-0.5 rounded">{hostname}/u/{user?.username || 'username'}</code>
                                </p>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="About" className={contentClasses}>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold text-[var(--color-fg)]">About Beat Scrobble</h2>
                            <p className="text-[var(--color-fg-secondary)]">
                                A modern, self-hosted music analytics platform for tracking your listening habits across services.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                            <h3 className="font-semibold text-[var(--color-fg)] mb-2">Version Info</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-[var(--color-fg-secondary)]">Version:</span>
                                <span className="text-[var(--color-fg)] font-mono">0.1.0-alpha</span>
                                <span className="text-[var(--color-fg-secondary)]">Build:</span>
                                <span className="text-[var(--color-fg)] font-mono">Development</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-[var(--color-fg)]">Credits</h3>
                            <p className="text-sm text-[var(--color-fg-secondary)]">
                                Developed with ❤️ by saturnxdev.
                            </p>
                            <a
                                href="https://github.com/saturnxdev/Beat Scrobble"
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-[var(--color-primary)] hover:underline"
                            >
                                View on GitHub
                            </a>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Modal>
    )
}