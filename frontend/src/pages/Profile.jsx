import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';

export default function Profile() {
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [plan, setPlan] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
    fetchPlan();
  }, [user]);

  const fetchPlan = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/plan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      }
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email }),
      });
      
      if (res.ok) {
        showMessage('Profile updated successfully');
        // Update local user state
        const updatedUser = await res.json();
        useAuthStore.setState({ user: updatedUser });
      } else {
        const err = await res.json();
        showMessage(err.detail || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showMessage('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showMessage('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showMessage('New password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        showMessage('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        showMessage(err.detail || 'Failed to change password', 'error');
      }
    } catch (err) {
      showMessage('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();

    if (!deletePassword) {
      showMessage('Please enter your password to confirm', 'error');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete your account and all associated data (auctions, items, settings).\n\nThis action cannot be undone.\n\nAre you sure you want to continue?'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (res.ok) {
        showMessage('Account deleted successfully. Redirecting...', 'success');
        // Log out and redirect to home
        setTimeout(() => {
          useAuthStore.getState().logout();
          window.location.href = '/';
        }, 1500);
      } else {
        let errorMsg = 'Failed to delete account';
        try {
          const err = await res.json();
          errorMsg = err.detail || `Error ${res.status}: ${res.statusText}`;
        } catch (parseErr) {
          errorMsg = `Error ${res.status}: ${res.statusText}`;
        }
        showMessage(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Delete account error:', err);
      showMessage(`Network error: ${err.message}. Is the backend running?`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadgeColor = (planName) => {
    switch (planName?.toLowerCase()) {
      case 'pro': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'starter': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'team': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-surface-500/20 text-surface-400 border-surface-500/30';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-surface-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
        Profile
      </h1>
      <p className="text-surface-400 text-sm mb-6">Manage your account settings and subscription</p>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl border ${
          message.type === 'error' 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : 'bg-green-500/10 border-green-500/30 text-green-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Info Card */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">👤 Account Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Email</label>
              <p className="text-surface-200">{user.email}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Member Since</label>
              <p className="text-surface-200">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Current Plan</label>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPlanBadgeColor(plan?.plan_name)}`}>
                  {plan?.plan_name || 'Free'}
                </span>
                {plan?.plan !== 'pro' && (
                  <a 
                    href="/billing" 
                    className="text-xs text-brand-400 hover:text-brand-300"
                  >
                    Upgrade →
                  </a>
                )}
              </div>
            </div>

            {plan && (
              <div className="pt-4 border-t border-surface-700/30">
                <label className="text-xs font-medium text-surface-400 mb-2 block">Plan Limits</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-surface-800/50 rounded-lg p-2">
                    <span className="text-surface-500">Max Items</span>
                    <p className="text-surface-200 font-medium">
                      {plan.limits?.max_items === -1 ? 'Unlimited' : plan.limits?.max_items}
                    </p>
                  </div>
                  <div className="bg-surface-800/50 rounded-lg p-2">
                    <span className="text-surface-500">Auction Houses</span>
                    <p className="text-surface-200 font-medium">
                      {plan.limits?.max_auction_houses === -1 ? 'Unlimited' : plan.limits?.max_auction_houses}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Update Profile Form */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">✏️ Update Profile</h2>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Name</label>
              <input
                type="text"
                className="input-field w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Email</label>
              <input
                type="email"
                className="input-field w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>

          {/* Delete Account Section */}
          <div className="mt-8 pt-6 border-t border-red-500/20">
            <h3 className="text-md font-semibold text-red-400 mb-2">🗑️ Delete Account</h3>
            <p className="text-xs text-surface-500 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
              >
                Delete My Account
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-red-400 mb-1 block">
                    Enter your password to confirm deletion
                  </label>
                  <input
                    type="password"
                    className="input-field w-full border-red-500/30 focus:border-red-500/50"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your current password"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    {loading ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                    className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Change Password Form */}
        <div className="glass-card p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">🔒 Change Password</h2>
          
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Current Password</label>
              <input
                type="password"
                className="input-field w-full"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">New Password</label>
              <input
                type="password"
                className="input-field w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Confirm New Password</label>
              <input
                type="password"
                className="input-field w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
