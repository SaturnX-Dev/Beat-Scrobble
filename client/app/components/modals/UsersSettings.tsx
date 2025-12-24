import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, createUser, adminUpdateUser, adminDeleteUser, type User } from "api/api";
import { useState } from "react";
import { AsyncButton } from "../AsyncButton";
import { Trash, Edit, Check, X, Shield, Plus, Key } from "lucide-react";
import { useAppContext } from "~/providers/AppContext";

export default function UsersSettings() {
    const { user: currentUser } = useAppContext();
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");

    const { data: users, isLoading } = useQuery({
        queryKey: ["admin-users"],
        queryFn: getAllUsers,
    });

    const createMutation = useMutation({
        mutationFn: () => createUser(username, password, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            setIsCreating(false);
            resetForm();
        },
        onError: (err: Error) => setError(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: (opts: { id: number, role?: string, password?: string }) => adminUpdateUser(opts.id, opts),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            setEditingUser(null);
            resetForm();
        },
        onError: (err: Error) => setError(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: adminDeleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (err: Error) => setError(err.message),
    });

    const resetForm = () => {
        setUsername("");
        setPassword("");
        setRole("user");
        setError(null);
    };

    const handleCreate = () => {
        if (!username || !password) {
            setError("Username and password are required");
            return;
        }
        createMutation.mutate();
    };

    const handleUpdate = () => {
        if (!editingUser) return;
        const opts: any = { id: editingUser.id };
        if (role !== editingUser.role) opts.role = role;
        if (password) opts.password = password;

        if (Object.keys(opts).length === 1) {
            setEditingUser(null);
            return;
        }
        updateMutation.mutate(opts);
    };

    if (isLoading) return <div className="p-4">Loading users...</div>;

    return (
        <div className="flex flex-col gap-6 pb-8">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">User Management</h2>
                <button
                    onClick={() => { setIsCreating(true); resetForm(); }}
                    className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-3 py-2 rounded-md hover:bg-[var(--color-primary-dim)] transition-colors"
                >
                    <Plus size={16} /> Add User
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* Create User Form */}
            {isCreating && (
                <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-bg-tertiary)] animate-fade-in">
                    <h3 className="font-semibold mb-3">Create New User</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-[var(--color-fg-secondary)] uppercase">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-[var(--color-fg-secondary)] uppercase">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-[var(--color-fg-secondary)] uppercase">Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-2 text-sm"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsCreating(false)} className="px-3 py-1 rounded-md hover:bg-[var(--color-bg-tertiary)]">Cancel</button>
                        <AsyncButton loading={createMutation.isPending} onClick={handleCreate}>Create</AsyncButton>
                    </div>
                </div>
            )}

            {/* User List */}
            <div className="flex flex-col gap-2">
                {users?.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)] transition-colors border border-[var(--color-bg-tertiary)]">
                        {editingUser?.id === u.id ? (
                            // Edit Mode
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                                <span className="font-medium text-[var(--color-fg)]">{u.username}</span>
                                <input
                                    type="password"
                                    placeholder="New password (optional)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-1 text-sm"
                                />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-1 text-sm"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        ) : (
                            // View Mode
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                    {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--color-fg)]">{u.username}</span>
                                        {u.role === 'admin' && (
                                            <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Shield size={10} /> Admin
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-[var(--color-fg-secondary)]">ID: {u.id}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {editingUser?.id === u.id ? (
                                <>
                                    <AsyncButton loading={updateMutation.isPending} onClick={handleUpdate} className="!p-2 text-green-400 hover:text-green-300">
                                        <Check size={18} />
                                    </AsyncButton>
                                    <button onClick={() => setEditingUser(null)} className="p-2 text-gray-400 hover:text-gray-300">
                                        <X size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setEditingUser(u);
                                            setRole(u.role);
                                            setPassword("");
                                            setError(null);
                                        }}
                                        className="p-2 text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors"
                                        title="Edit User"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    {/* Prevent deleting self */}
                                    {currentUser?.id !== u.id && (
                                        <AsyncButton
                                            loading={deleteMutation.isPending && deleteMutation.variables === u.id}
                                            onClick={() => deleteMutation.mutate(u.id)}
                                            confirm
                                            className="!p-2 text-[var(--color-fg-secondary)] hover:text-red-500 transition-colors"
                                        >
                                            <Trash size={18} />
                                        </AsyncButton>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
