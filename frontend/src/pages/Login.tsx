import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, Shield, User as UserIcon, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, signup, showToast } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || (isSignUp && !email)) {
      showToast('error', 'Please fill all required fields.');
      return;
    }

    setLoading(true);

    // Simulate server call
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (isSignUp) {
      signup(username, email, role);
      setIsSignUp(false); // Move to login
      setLoading(false);
    } else {
      // Mock login credentials check
      const mockUser = {
        id: username.toLowerCase() === 'admin' ? 1 : 2,
        username: username,
        email: `${username.toLowerCase()}@smartkirana.com`,
        role: username.toLowerCase() === 'admin' ? 'admin' as const : role
      };
      
      login(username, 'mock_jwt_token_xyz', mockUser);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.05), transparent 40%), var(--bg-app)',
      padding: '1.5rem'
    }}>
      <div className="card card-glow" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        background: 'rgba(16, 18, 26, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
      }}>
        {/* Branding */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <ShoppingCart size={32} color="#6366f1" style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' }} />
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #ffffff 40%, #c7d2fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SmartKirana
          </h1>
        </div>
        
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {isSignUp ? 'Create store operator account' : 'Sign in to access your dashboard'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Username */}
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="operator_name (try 'admin')"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                required
              />
            </div>
          </div>

          {/* Email (only sign up) */}
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@store.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  required
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                required
              />
            </div>
          </div>

          {/* Role selection Toggle */}
          <div className="form-group">
            <label className="form-label">Operator Role</label>
            <div style={{ display: 'flex', gap: '0.5rem', background: '#131520', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                className={`btn btn-sm ${role === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, border: 'none', background: role === 'staff' ? 'var(--primary)' : 'transparent', color: role === 'staff' ? '#fff' : 'var(--color-text)' }}
                onClick={() => setRole('staff')}
              >
                Staff Operator
              </button>
              <button
                type="button"
                className={`btn btn-sm ${role === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, border: 'none', background: role === 'admin' ? 'var(--primary)' : 'transparent', color: role === 'admin' ? '#fff' : 'var(--color-text)' }}
                onClick={() => setRole('admin')}
              >
                Store Admin
              </button>
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Access Terminal'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button 
                onClick={() => setIsSignUp(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New staff member?{' '}
              <button 
                onClick={() => setIsSignUp(true)} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
              >
                Register Here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
