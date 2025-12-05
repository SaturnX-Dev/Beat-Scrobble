import { logout, updateUser } from "api/api"
import { useState, useEffect, useRef } from "react"
import { AsyncButton } from "../AsyncButton"
import { useAppContext } from "~/providers/AppProvider"
import { usePreferences } from "~/hooks/usePreferences"
import { User, Lock, Globe, Share2, Palette, Sparkles, ChevronDown, Upload, Image, X } from "lucide-react"

export default function Account() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const { user, setUsername: setCtxUsername } = useAppContext()
    const { getPreference, savePreference, preferences } = usePreferences()

    // Profile image
    const [profileImage, setProfileImage] = useState<string | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Background image
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
    const [uploadingBgImage, setUploadingBgImage] = useState(false)
    const bgFileInputRef = useRef<HTMLInputElement>(null)

    // Expandable sections
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        account: true,
        sharing: false,
        publicProfile: false,
    })

    // Sharing settings
    const [hostname, setHostname] = useState('')
    const [shareEnabled, setShareEnabled] = useState(false)

    // Public profile settings
    const [publicTheme, setPublicTheme] = useState('')
    const [showCometAI, setShowCometAI] = useState(true)

    useEffect(() => {
        setHostname(getPreference('share_hostname', window.location.origin))
        setShareEnabled(getPreference('profile_share_enabled', false))
        setPublicTheme(getPreference('public_profile_theme', 'dark'))
        setShowCometAI(getPreference('public_profile_show_ai', true))
        setShowCometAI(getPreference('public_profile_show_ai', true))
        setProfileImage(getPreference('profile_image', null))
        setBackgroundImage(getPreference('background_image', null))
    }, [getPreference, preferences])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB.')
            return
        }

        setUploadingImage(true)
        setError('')

        try {
            // Convert to base64
            const reader = new FileReader()
            reader.onload = async (event) => {
                const base64 = event.target?.result as string

                try {
                    const res = await fetch('/apis/web/v1/user/profile-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: base64 })
                    })

                    if (res.ok) {
                        const data = await res.json()
                        setProfileImage(data.path)
                        setSuccess('Profile image updated!')
                    } else {
                        const err = await res.json()
                        setError(err.error || 'Failed to upload image')
                    }
                } catch (err) {
                    setError('Failed to upload image')
                }

                setUploadingImage(false)
            }
            reader.onerror = () => {
                setError('Failed to read file')
                setUploadingImage(false)
            }
            reader.readAsDataURL(file)
        } catch (err) {
            setError('Failed to upload image')
            setUploadingImage(false)
        }
    }

    const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB.')
            return
        }

        setUploadingBgImage(true)
        setError('')

        try {
            // Convert to base64
            const reader = new FileReader()
            reader.onload = async (event) => {
                const base64 = event.target?.result as string

                try {
                    const res = await fetch('/apis/web/v1/user/background-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: base64 })
                    })

                    if (res.ok) {
                        const data = await res.json()
                        setBackgroundImage(data.path)
                        setSuccess('Background image updated!')
                    } else {
                        const err = await res.json()
                        setError(err.error || 'Failed to upload image')
                    }
                } catch (err) {
                    setError('Failed to upload image')
                }

                setUploadingBgImage(false)
            }
            reader.onerror = () => {
                setError('Failed to read file')
                setUploadingBgImage(false)
            }
            reader.readAsDataURL(file)
        } catch (err) {
            setError('Failed to upload image')
            setUploadingBgImage(false)
        }
    }

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const logoutHandler = () => {
        setLoading(true)
        logout()
            .then(r => {
                if (r.ok) {
                    window.location.reload()
                } else {
                    r.json().then(r => setError(r.error))
                }
            }).catch(err => setError(err))
        setLoading(false)
    }

    const updateHandler = () => {
        setError('')
        setSuccess('')
        if (password != "" && confirmPw === "") {
            setError("confirm your new password before submitting")
            return
        }
        setError('')
        setSuccess('')
        setLoading(true)
        updateUser(username, password)
            .then(r => {
                if (r.ok) {
                    setSuccess("sucessfully updated user")
                    if (username != "") {
                        setCtxUsername(username)
                    }
                    setUsername('')
                    setPassword('')
                    setConfirmPw('')
                } else {
                    r.json().then((r) => setError(r.error))
                }
            }).catch(err => setError(err))
        setLoading(false)
    }

    const SectionHeader = ({ icon: Icon, title, section, description }: { icon: any, title: string, section: string, description: string }) => (
        <button
            onClick={() => toggleSection(section)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]/30 transition-all group"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] group-hover:bg-[var(--color-primary)]/10 transition-colors">
                    <Icon size={20} className="text-[var(--color-primary)]" />
                </div>
                <div className="text-left">
                    <h3 className="font-semibold text-[var(--color-fg)]">{title}</h3>
                    <p className="text-xs text-[var(--color-fg-secondary)]">{description}</p>
                </div>
            </div>
            <ChevronDown
                size={20}
                className={`text-[var(--color-fg-secondary)] transition-transform duration-200 ${expandedSections[section] ? 'rotate-180' : ''}`}
            />
        </button>
    )

    const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: () => void }) => (
        <button
            onClick={onChange}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
                }`}
        >
            <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    )

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold text-[var(--color-fg)] mb-2">Profile Settings</h2>
                <p className="text-[var(--color-fg-secondary)] text-sm">
                    Manage your account, sharing settings, and public profile appearance
                </p>
            </div>

            {/* Account Settings */}
            <div className="flex flex-col gap-3">
                <SectionHeader
                    icon={User}
                    title="Account"
                    section="account"
                    description={`Logged in as ${user?.username || 'Guest'}`}
                />

                {expandedSections.account && (
                    <div className="ml-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 border border-[var(--color-bg-tertiary)] space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-[var(--color-fg)]">Current User</p>
                                <p className="text-sm text-[var(--color-fg-secondary)]">{user?.username}</p>
                            </div>
                            <AsyncButton loading={loading} onClick={logoutHandler}>Logout</AsyncButton>
                        </div>

                        <hr className="border-[var(--color-bg-tertiary)]" />

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-[var(--color-fg-secondary)]">Update Username</h4>
                            <div className="flex gap-2">
                                <input
                                    name="beat-scrobble-update-username"
                                    type="text"
                                    placeholder="New username"
                                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                                <AsyncButton loading={loading} onClick={updateHandler}>Update</AsyncButton>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-[var(--color-fg-secondary)]">Update Password</h4>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    name="beat-scrobble-update-password"
                                    type="password"
                                    placeholder="New password"
                                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <input
                                    name="beat-scrobble-confirm-password"
                                    type="password"
                                    placeholder="Confirm password"
                                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                                    value={confirmPw}
                                    onChange={(e) => setConfirmPw(e.target.value)}
                                />
                                <AsyncButton loading={loading} onClick={updateHandler}>Update</AsyncButton>
                            </div>
                        </div>

                        {/* Profile Image Upload */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-[var(--color-fg-secondary)]">Profile Image</h4>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center overflow-hidden border-2 border-[var(--color-bg-tertiary)]">
                                        {profileImage ? (
                                            <img
                                                src={profileImage}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Image size={24} className="text-[var(--color-fg-tertiary)]" />
                                        )}
                                    </div>
                                    {profileImage && (
                                        <button
                                            onClick={() => {
                                                savePreference('profile_image', null)
                                                setProfileImage(null)
                                            }}
                                            className="absolute -top-1 -right-1 p-1 rounded-full bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/80 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        className={`px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-fg)] rounded-lg text-sm hover:bg-[var(--color-primary)]/20 transition-colors ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Upload size={14} className="inline mr-2" />
                                        {uploadingImage ? 'Uploading...' : profileImage ? 'Change Image' : 'Upload Image'}
                                    </button>
                                    <p className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                                        Saved on server, syncs across devices. Max 5MB.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Background Image Upload */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-[var(--color-fg-secondary)]">Background Image</h4>
                            <div className="flex flex-col gap-3">
                                <div className="relative w-full h-32 rounded-xl bg-[var(--color-bg-tertiary)] overflow-hidden border-2 border-[var(--color-bg-tertiary)] group">
                                    {backgroundImage ? (
                                        <img
                                            src={backgroundImage}
                                            alt="Background"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Image size={32} className="text-[var(--color-fg-tertiary)]" />
                                        </div>
                                    )}

                                    {backgroundImage && (
                                        <button
                                            onClick={() => {
                                                savePreference('background_image', null)
                                                setBackgroundImage(null)
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/80 transition-colors shadow-md"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-[var(--color-fg-tertiary)]">
                                        Displayed on your public profile header. Max 10MB.
                                    </p>
                                    <div>
                                        <input
                                            ref={bgFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBgImageUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => bgFileInputRef.current?.click()}
                                            disabled={uploadingBgImage}
                                            className={`px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-fg)] rounded-lg text-sm hover:bg-[var(--color-primary)]/20 transition-colors ${uploadingBgImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Upload size={14} className="inline mr-2" />
                                            {uploadingBgImage ? 'Uploading...' : backgroundImage ? 'Change Banner' : 'Upload Banner'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {success && <p className="text-sm text-[var(--color-success)]">{success}</p>}
                        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
                    </div>
                )}
            </div>

            {/* Sharing Settings */}
            <div className="flex flex-col gap-3">
                <SectionHeader
                    icon={Share2}
                    title="Sharing"
                    section="sharing"
                    description="Configure how others can view your profile"
                />

                {expandedSections.sharing && (
                    <div className="ml-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 border border-[var(--color-bg-tertiary)] space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Hostname */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Globe size={16} className="text-[var(--color-primary)]" />
                                <label className="text-sm font-medium text-[var(--color-fg)]">Public URL Hostname</label>
                            </div>
                            <input
                                type="text"
                                value={hostname}
                                onChange={(e) => setHostname(e.target.value)}
                                onBlur={() => savePreference('share_hostname', hostname)}
                                placeholder="https://beat-scrobble.example.com"
                                className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                            />
                            <p className="text-xs text-[var(--color-fg-tertiary)]">
                                The base URL for sharing your profile
                            </p>
                        </div>

                        {/* Enable Public Profile */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)]">
                            <div>
                                <p className="font-medium text-[var(--color-fg)]">Enable Public Profile</p>
                                <p className="text-xs text-[var(--color-fg-secondary)]">Allow others to view your stats via shared link</p>
                            </div>
                            <Toggle
                                enabled={shareEnabled}
                                onChange={() => {
                                    const newValue = !shareEnabled
                                    setShareEnabled(newValue)
                                    savePreference('profile_share_enabled', newValue)
                                }}
                            />
                        </div>

                        {shareEnabled && (
                            <div className="p-3 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
                                <p className="text-sm text-[var(--color-fg)]">
                                    Your profile is shareable at: <code className="bg-[var(--color-bg)] px-2 py-0.5 rounded">{hostname}/u/{user?.username || 'username'}</code>
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Public Profile Settings */}
            <div className="flex flex-col gap-3">
                <SectionHeader
                    icon={Palette}
                    title="Public Profile Appearance"
                    section="publicProfile"
                    description="Customize how visitors see your profile"
                />

                {expandedSections.publicProfile && (
                    <div className="ml-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 border border-[var(--color-bg-tertiary)] space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Theme Selector */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Palette size={16} className="text-[var(--color-primary)]" />
                                <label className="text-sm font-medium text-[var(--color-fg)]">Public Profile Theme</label>
                            </div>
                            <select
                                value={publicTheme}
                                onChange={(e) => {
                                    setPublicTheme(e.target.value)
                                    savePreference('public_profile_theme', e.target.value)
                                }}
                                className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                                <option value="slate">Slate</option>
                                <option value="rose">Rose</option>
                                <option value="ocean">Ocean</option>
                                <option value="forest">Forest</option>
                                <option value="sunset">Sunset</option>
                                <option value="purple">Purple</option>
                            </select>
                            <p className="text-xs text-[var(--color-fg-tertiary)]">
                                Theme used when visitors view your public profile
                            </p>
                        </div>

                        {/* Show Comet AI */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)]">
                            <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-[var(--color-accent)]" />
                                <div>
                                    <p className="font-medium text-[var(--color-fg)]">Show Comet AI Critique</p>
                                    <p className="text-xs text-[var(--color-fg-secondary)]">Allow visitors to see your AI critique</p>
                                </div>
                            </div>
                            <Toggle
                                enabled={showCometAI}
                                onChange={() => {
                                    const newValue = !showCometAI
                                    setShowCometAI(newValue)
                                    savePreference('public_profile_show_ai', newValue)
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}