import { Form, Link, useActionData, useNavigation, useSearchParams, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { useState } from "react";
import { FaMusic, FaUser, FaLock, FaSignInAlt, FaUserPlus } from "react-icons/fa";

export const meta = () => {
    return [
        { title: "Login - Beat Scrobble" },
        { name: "description", content: "Login to your Beat Scrobble instance" },
    ];
};

export async function clientLoader({ request }: LoaderFunctionArgs) {
    return null;
}

export async function clientAction({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");
    const redirectTo = (formData.get("redirectTo") as string) || "/";
    const username = formData.get("username");
    const password = formData.get("password");
    const remember = formData.get("remember");

    const params = new URLSearchParams();
    params.append("username", username as string);
    params.append("password", password as string);
    if (remember) params.append("remember_me", "true");

    if (intent === "login" || intent === "signup") {
        const endpoint = intent === "login" ? "/login" : "/signup";
        try {
            const res = await fetch(`/apis/web/v1${endpoint}`, {
                method: "POST",
                body: params,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                credentials: "include",
            });

            if (res.ok) {
                if (intent === "signup") {
                    window.location.href = "/onboarding";
                    return null;
                }
                window.location.href = redirectTo;
                return null;
            } else {
                let errText = await res.text();
                try {
                    const json = JSON.parse(errText);
                    if (json.error) errText = json.error;
                } catch { }
                return { error: errText || "Invalid credentials" };
            }
        } catch (e) {
            console.error(e);
            return { error: "Connection error" };
        }
    }

    return { error: "Invalid intent" };
}

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const navigation = useNavigation();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirectTo") || "/";
    const actionData = useActionData();

    const isSubmitting = navigation.state === "submitting";

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[var(--color-bg)]">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-primary)]/20 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--color-accent)]/20 blur-[100px] animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md p-8 m-4">

                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8 space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300" style={{ boxShadow: '0 10px 40px var(--color-primary)' }}>
                        <FaMusic className="text-white text-3xl" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-fg)] to-[var(--color-fg-secondary)]">
                        Beat Scrobble
                    </h1>
                    <p className="text-[var(--color-fg-secondary)] text-sm">
                        Your music, your data, your insights.
                    </p>
                </div>

                {/* Glass Card */}
                <div className="glass-card rounded-2xl p-8 shadow-2xl">

                    {/* Toggle Switch */}
                    <div className="flex mb-8 bg-[var(--color-bg)]/50 rounded-lg p-1 border border-[var(--color-bg-tertiary)]">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${isLogin
                                ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-fg)] shadow-sm'
                                : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${!isLogin
                                ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-fg)] shadow-sm'
                                : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
                                }`}
                        >
                            Signup
                        </button>
                    </div>

                    <Form method="post" className="space-y-5">
                        <input type="hidden" name="intent" value={isLogin ? "login" : "signup"} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--color-fg-secondary)] uppercase tracking-wider ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-fg-tertiary)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                    <FaUser />
                                </div>
                                <input
                                    required
                                    type="text"
                                    name="username"
                                    placeholder="Enter your username"
                                    className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-xl py-3 pl-10 pr-4 text-[var(--color-fg)] placeholder-[var(--color-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-[var(--color-fg-secondary)] uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-fg-tertiary)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                    <FaLock />
                                </div>
                                <input
                                    required
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-xl py-3 pl-10 pr-4 text-[var(--color-fg)] placeholder-[var(--color-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]/50 transition-all"
                                />
                            </div>
                        </div>

                        {isLogin && (
                            <div className="flex items-center justify-between text-xs">
                                <label className="flex items-center space-x-2 cursor-pointer text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors">
                                    <input type="checkbox" name="remember" className="rounded bg-[var(--color-bg-tertiary)] border-[var(--color-bg-tertiary)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/50" />
                                    <span>Remember me</span>
                                </label>
                            </div>
                        )}

                        {actionData?.error && (
                            <div className="p-3 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] text-sm text-center">
                                {actionData.error}
                            </div>
                        )}

                        <button
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ boxShadow: '0 10px 40px var(--color-primary)' }}
                        >
                            {isSubmitting ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? <FaSignInAlt /> : <FaUserPlus />}
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                </>
                            )}
                        </button>
                    </Form>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-[var(--color-fg-tertiary)]">
                    <p>© 2025 SaturnX-Dev.</p>
                </div>

            </div>
        </div>
    );
}
