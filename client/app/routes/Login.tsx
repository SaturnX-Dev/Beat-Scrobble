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
    // Check if session exists via API (or just rely on backend redirecting 401s, 
    // but for a smooth UX we might want to check here or just let the user login).
    // Ideally, if we are already logged in, go to dashboard.
    // We can try a quick fetch to /api/web/v1/user/me, but that might be slow.
    // For now, let's assume if they hit /login, they want to login.
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
            const res = await fetch(`http://localhost:4110/apis/web/v1${endpoint}`, {
                method: "POST",
                body: params,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            if (res.ok) {
                if (intent === "signup") {
                    return redirect("/onboarding");
                }
                return redirect(redirectTo);
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
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[100px] animate-pulse-slow delay-1000" />
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md p-8 m-4">

                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8 space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4 transform hover:scale-105 transition-transform duration-300">
                        <FaMusic className="text-white text-3xl" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Beat Scrobble
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Your music, your data, your insights.
                    </p>
                </div>

                {/* Glass Card */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                    {/* Toggle Switch */}
                    <div className="flex mb-8 bg-black/30 rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex - 1 py - 2 text - sm font - medium rounded - md transition - all duration - 200 ${isLogin
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300'
                                } `}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex - 1 py - 2 text - sm font - medium rounded - md transition - all duration - 200 ${!isLogin
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300'
                                } `}
                        >
                            Signup
                        </button>
                    </div>

                    <Form method="post" className="space-y-5">
                        <input type="hidden" name="intent" value={isLogin ? "login" : "signup"} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-purple-400 transition-colors">
                                    <FaUser />
                                </div>
                                <input
                                    required
                                    type="text"
                                    name="username"
                                    placeholder="Enter your username"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-purple-400 transition-colors">
                                    <FaLock />
                                </div>
                                <input
                                    required
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                />
                            </div>
                        </div>

                        {isLogin && (
                            <div className="flex items-center justify-between text-xs">
                                <label className="flex items-center space-x-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                                    <input type="checkbox" name="remember" className="rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500/50" />
                                    <span>Remember me</span>
                                </label>
                                <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">Forgot password?</a>
                            </div>
                        )}

                        {actionData?.error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {actionData.error}
                            </div>
                        )}

                        <button
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/30 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                <div className="mt-8 text-center text-xs text-gray-600">
                    <p>Protected by reCAPTCHA maybe. <br /> © 2025 SaturnX-Dev.</p>
                </div>

            </div>
        </div>
    );
}
