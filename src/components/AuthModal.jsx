import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Sheet } from '../ui';

const AuthModal = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const { signIn, signUp } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                onClose();
            } else {
                await signUp(email, password);
                // Stay open so the confirmation message is visible.
                setMessage('Check your email for the confirmation link.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onClose={onClose} title={isLogin ? 'Sign In' : 'Create Account'} className="form-sheet">
            <form onSubmit={handleSubmit} className="form-stack">
                <div className="form-group">
                    <label className="form-field">
                        <span className="sr-only">Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            autoComplete="email"
                            required
                        />
                    </label>
                    <label className="form-field">
                        <span className="sr-only">Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            required
                            minLength={6}
                        />
                    </label>
                </div>

                {error && <p className="form-note is-error" role="alert">{error}</p>}
                {message && <p className="form-note is-success" role="status">{message}</p>}

                <button type="submit" disabled={loading} className="ui-button ui-button--accent form-submit">
                    {loading ? <Loader2 size={18} className="animate-spin" aria-label="Signing in" /> : (isLogin ? 'Sign In' : 'Create Account')}
                </button>

                <button
                    type="button"
                    className="ui-text-button form-switch"
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError(null);
                        setMessage(null);
                    }}
                >
                    {isLogin ? 'Create an account' : 'I already have an account'}
                </button>
            </form>
        </Sheet>
    );
};

export default AuthModal;
