import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Filter, RefreshCw, Search, ShieldCheck, ShieldX, Trash2, UserCog, UserRoundCheck, UserRoundX } from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';

const filterOptions = [
  { value: 'all', label: 'All users' },
  { value: 'verified', label: 'Verified users' },
  { value: 'unverified', label: 'Unverified users' },
  { value: 'active', label: 'Active users' },
  { value: 'deactivated', label: 'Deactivated users' },
  { value: 'client', label: 'Clients' },
  { value: 'minion', label: 'Minions' }
];

const roleTone = {
  admin: 'bg-slate-900 text-white',
  client: 'bg-blue-100 text-minion-blue',
  minion: 'bg-amber-100 text-amber-900'
};

const verificationTone = {
  true: 'bg-emerald-100 text-emerald-800',
  false: 'bg-yellow-100 text-yellow-800'
};

const accountTone = {
  true: 'bg-emerald-100 text-emerald-800',
  false: 'bg-rose-100 text-rose-700'
};

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function Badge({ tone, children }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${tone}`}>
      {children}
    </span>
  );
}

function ConfirmationModal({ user, pending, onClose, onConfirm }) {
  if (!user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="absolute inset-0" onClick={pending ? undefined : onClose} aria-hidden="true" />
      <section className="relative z-10 w-full max-w-xl rounded-[32px] border border-rose-200 bg-white p-6 shadow-2xl">
        <div className="inline-flex rounded-2xl bg-rose-100 p-3 text-rose-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">Permanent Delete</p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
          Delete {user.first_name} {user.last_name} permanently?
        </h2>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          This is a last-resort action. Deactivation is safer because it removes the account from normal platform activity without erasing the user record.
        </p>
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          This action cannot be undone. If this account has platform history, the server may block deletion and ask you to keep it deactivated instead.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(user)}
            disabled={pending}
            className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </section>
    </div>
  );
}

function AdminUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionKey, setActionKey] = useState('');
  const [confirmingUser, setConfirmingUser] = useState(null);

  const deferredSearch = useDeferredValue(search);

  const loadUsers = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await adminAPI.getUsers();
      setUsers(response.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return users.filter((account) => {
      const matchesSearch = !normalizedSearch || [
        account.first_name,
        account.last_name,
        account.email
      ].join(' ').toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (filter === 'verified') return account.email_verified;
      if (filter === 'unverified') return !account.email_verified;
      if (filter === 'active') return account.is_active;
      if (filter === 'deactivated') return !account.is_active;
      if (filter === 'client') return account.role === 'client';
      if (filter === 'minion') return account.role === 'minion';
      return true;
    });
  }, [deferredSearch, filter, users]);

  const summary = useMemo(() => ({
    total: users.length,
    verified: users.filter((account) => account.email_verified).length,
    active: users.filter((account) => account.is_active).length,
    deactivated: users.filter((account) => !account.is_active).length
  }), [users]);

  const runAction = async (account, action) => {
    const key = `${action}:${account.id}`;
    setActionKey(key);

    try {
      let response;
      if (action === 'verify') response = await adminAPI.verifyUser(account.id);
      if (action === 'unverify') response = await adminAPI.unverifyUser(account.id);
      if (action === 'deactivate') response = await adminAPI.deactivateUser(account.id);
      if (action === 'reactivate') response = await adminAPI.reactivateUser(account.id);
      if (action === 'delete') response = await adminAPI.deleteUser(account.id);

      notify({
        type: 'success',
        title: 'Admin action saved',
        message: response?.message || 'User updated successfully.'
      });

      if (action === 'delete') {
        setConfirmingUser(null);
      }

      await loadUsers(true);
    } catch (err) {
      notify({
        type: 'error',
        title: 'Action failed',
        message: err.response?.data?.message || 'Failed to update this user.'
      });
    } finally {
      setActionKey('');
    }
  };

  if (!user?.id || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="rounded-[28px] bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-black text-slate-900">Admin access required</h1>
          <p className="mt-3 text-slate-600">Only admins can manage platform users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ConfirmationModal
        user={confirmingUser}
        pending={actionKey === `delete:${confirmingUser?.id}`}
        onClose={() => setConfirmingUser(null)}
        onConfirm={(account) => runAction(account, 'delete')}
      />

      <div className="bg-linear-to-r from-minion-blue to-minion-blue-light shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-minion-yellow">Minion Me Control Room</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Admin Users</h1>
              <p className="mt-4 text-base text-blue-50 sm:text-lg">
                Verify accounts, deactivate access safely, and reserve permanent deletion for truly clean records.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="rounded-full border-2 border-white/35 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
              >
                Back to Admin
              </button>
              <button
                type="button"
                onClick={() => loadUsers(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full border-2 border-minion-yellow/70 bg-white px-5 py-3 font-semibold text-minion-blue transition hover:bg-minion-yellow-light disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh users'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Users" value={summary.total} helper="Full account register" />
          <StatCard label="Verified" value={summary.verified} helper="Ready for trusted access" />
          <StatCard label="Active" value={summary.active} helper="Visible in normal platform activity" />
          <StatCard label="Deactivated" value={summary.deactivated} helper="Hidden until reactivated" />
        </section>

        <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">User Command Center</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">User management and account controls</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Search by name or email, filter status quickly, and apply account controls with clear visual signals for role, verification, and access state.
              </p>
            </div>

            <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Deactivation is the default safety action. Permanent deletion is intentionally isolated behind a warning modal.
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by full name or email"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Filter className="h-4 w-4 text-minion-blue" />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-minion-yellow border-t-minion-blue" />
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
          ) : (
            <>
              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Showing <span className="font-bold text-slate-900">{filteredUsers.length}</span> of <span className="font-bold text-slate-900">{users.length}</span> users.
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="pb-4 pr-6 font-semibold">Full name</th>
                      <th className="pb-4 pr-6 font-semibold">Email</th>
                      <th className="pb-4 pr-6 font-semibold">Phone</th>
                      <th className="pb-4 pr-6 font-semibold">Role</th>
                      <th className="pb-4 pr-6 font-semibold">Verification</th>
                      <th className="pb-4 pr-6 font-semibold">Account status</th>
                      <th className="pb-4 pr-6 font-semibold">Created at</th>
                      <th className="pb-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((account) => {
                      const isSelf = account.id === user.id;
                      const fullName = `${account.first_name} ${account.last_name}`;

                      return (
                        <tr key={account.id} className="border-b border-slate-100 align-top">
                          <td className="py-4 pr-6">
                            <p className="font-semibold text-slate-900">{fullName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {account.location || 'No location set'}
                            </p>
                          </td>
                          <td className="py-4 pr-6 text-slate-600">{account.email}</td>
                          <td className="py-4 pr-6 text-slate-600">{account.phone || 'No phone'}</td>
                          <td className="py-4 pr-6">
                            <Badge tone={roleTone[account.role] || 'bg-slate-100 text-slate-700'}>
                              {account.role}
                            </Badge>
                          </td>
                          <td className="py-4 pr-6">
                            <Badge tone={verificationTone[String(account.email_verified)]}>
                              {account.email_verified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </td>
                          <td className="py-4 pr-6">
                            <div className="flex flex-col gap-2">
                              <Badge tone={accountTone[String(account.is_active)]}>
                                {account.is_active ? 'Active' : 'Deactivated'}
                              </Badge>
                              {!account.is_active && account.deactivated_at ? (
                                <span className="text-xs text-slate-500">
                                  {new Date(account.deactivated_at).toLocaleString()}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-4 pr-6 text-slate-600">{new Date(account.created_at).toLocaleString()}</td>
                          <td className="py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              {account.email_verified ? (
                                <button
                                  type="button"
                                  onClick={() => runAction(account, 'unverify')}
                                  disabled={Boolean(actionKey)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-yellow-200 px-3 py-2 text-xs font-semibold text-yellow-800 transition hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  <ShieldX className="h-3.5 w-3.5" />
                                  {actionKey === `unverify:${account.id}` ? 'Saving...' : 'Unverify'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => runAction(account, 'verify')}
                                  disabled={Boolean(actionKey)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  {actionKey === `verify:${account.id}` ? 'Saving...' : 'Verify'}
                                </button>
                              )}

                              {account.is_active ? (
                                <button
                                  type="button"
                                  onClick={() => runAction(account, 'deactivate')}
                                  disabled={Boolean(actionKey) || isSelf}
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <UserRoundX className="h-3.5 w-3.5" />
                                  {actionKey === `deactivate:${account.id}` ? 'Saving...' : 'Deactivate'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => runAction(account, 'reactivate')}
                                  disabled={Boolean(actionKey)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-minion-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  <UserRoundCheck className="h-3.5 w-3.5" />
                                  {actionKey === `reactivate:${account.id}` ? 'Saving...' : 'Reactivate'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setConfirmingUser(account)}
                                disabled={Boolean(actionKey) || isSelf}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Permanently
                              </button>
                            </div>

                            <div className="mt-3 flex justify-end">
                              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                                <UserCog className="h-3.5 w-3.5" />
                                {isSelf ? 'Self-protection enabled' : `${account.posted_tasks || 0} tasks, ${account.applications_sent || 0} applications`}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
                  No users match the current search and filter.
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminUsers;
