import { Modal } from "./Modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import AccountPage from "./AccountPage";
import { ThemeSwitcher } from "../themeSwitcher/ThemeSwitcher";
import { useAppContext } from "~/providers/AppProvider";
import ApiKeysModal from "./ApiKeysModal";
import { AsyncButton } from "../AsyncButton";
import ExportModal from "./ExportModal";

interface Props {
    open: boolean
    setOpen: Function
}

export default function SettingsModal({ open, setOpen }: Props) {

    const { user } = useAppContext()

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
                <TabsContent value="About" className={contentClasses}>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold text-[var(--color-fg)]">About Koito</h2>
                            <p className="text-[var(--color-fg-secondary)]">
                                A modern, self-hosted music analytics platform for tracking your listening habits across services.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                            <h3 className="font-semibold text-[var(--color-fg)] mb-2">Version Info</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-[var(--color-fg-secondary)]">Version:</span>
                                <span className="text-[var(--color-fg)] font-mono">1.0.0-beta</span>
                                <span className="text-[var(--color-fg-secondary)]">Build:</span>
                                <span className="text-[var(--color-fg)] font-mono">Development</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-[var(--color-fg)]">Credits</h3>
                            <p className="text-sm text-[var(--color-fg-secondary)]">
                                Developed with ❤️ by the open source community.
                            </p>
                            <a
                                href="https://github.com/saturnxdev/Koito"
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