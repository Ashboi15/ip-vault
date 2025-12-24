import React, { useState } from 'react';

const LoginPage = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isRegistering ? 'register' : 'login';
        const body = isRegistering ? { username, email, password } : { username, password };

        try {
            const response = await fetch(`http://localhost:5001/api/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            if (isRegistering) {
                // Auto login after register or ask to login
                alert("Registration successful! Please login.");
                setIsRegistering(false);
            } else {
                // Login success
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin(data.user);
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden p-8">
                <div className="text-center mb-8">
                    <div className="inline-block p-4 rounded-full bg-gray-900 mb-4 border border-purple-500/30">
                        <i className="fas fa-cube text-4xl text-purple-500"></i>
                    </div>
                    <h2 className="text-3xl font-extrabold text-white">
                        {isRegistering ? "Create Account" : "Welcome Back"}
                    </h2>
                    <p className="mt-2 text-gray-400">
                        {isRegistering ? "Join the IP Vault Protocol" : "Sign in to access your vault"}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-lg mb-6 text-sm flex items-center">
                        <i className="fas fa-exclamation-triangle mr-2"></i> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="Enter username"
                        />
                    </div>

                    {isRegistering && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                placeholder="name@example.com"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : (isRegistering ? "Sign Up" : "Sign In")}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
