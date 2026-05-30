import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  MapPin,
  MessageSquareText,
  PencilLine,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Wallet
} from 'lucide-react';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';
import { assignmentsAPI, paymentsAPI, tasksAPI } from '../services/api';

const formatCurrency = (value) => `KSh ${Number(value || 0).toLocaleString()}`;

const paymentStatusStyles = {
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  failed: 'bg-red-100 text-red-800 border-red-200'
};

const availabilityLabels = {
  available: 'Available',
  busy: 'Busy',
  offline: 'Offline'
};

function CountUp({ value, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId;
    const start = performance.now();
    const duration = 1000;

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-blue">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ActionCard({ action, onClick }) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[28px] bg-linear-to-br ${action.accent} p-px text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl`}
    >
      <div className="h-full rounded-[27px] bg-white/94 p-6 backdrop-blur">
        <div className={`inline-flex rounded-2xl bg-linear-to-br ${action.accent} p-3 ${action.textColor} shadow-md`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-xl font-bold text-slate-900">{action.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{action.description}</p>
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-minion-blue">
          Open
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}

function StatCard({ title, value, helper, icon, accent, prefix = '', suffix = '' }) {
  const StatIcon = icon;

  return (
    <div className={`rounded-[28px] bg-linear-to-br ${accent} p-px shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl`}>
      <div className="h-full rounded-[27px] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              <CountUp value={value} prefix={prefix} suffix={suffix} />
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3 text-minion-blue">
            <StatIcon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, onNavigate }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-minion-blue px-3 py-1 text-xs font-bold text-white">
          {job.category || 'General'}
        </span>
        <span className="text-lg font-black text-minion-yellow-dark">{formatCurrency(job.budget)}</span>
      </div>

      <h3 className="mt-4 text-xl font-bold text-slate-900">{job.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{job.description || 'Task details will appear here.'}</p>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-minion-blue" />
          {job.location || 'Location not specified'}
        </p>
        <p className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-minion-blue" />
          Client: {job.client_name || 'Client'}
        </p>
      </div>

      <button
        type="button"
        onClick={onNavigate}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-minion-blue px-4 py-2 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
      >
        View matching jobs
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function PaymentCard({ payment }) {
  const tone = paymentStatusStyles[payment.status] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:border-minion-yellow hover:shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">{payment.title}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${tone}`}>
              {payment.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Client: {payment.client_name} • {payment.category || 'Other'} • {payment.location || 'Location not specified'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Receipt: {payment.mpesa_receipt_number || 'Not assigned yet'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Recorded: {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : new Date(payment.created_at).toLocaleString()}
          </p>
          {payment.result_desc ? <p className="mt-3 text-sm text-slate-500">Note: {payment.result_desc}</p> : null}
        </div>

        <div className="rounded-[22px] bg-minion-yellow/20 px-5 py-4 text-right">
          <p className="text-sm font-semibold text-slate-600">Amount</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(payment.amount)}</p>
        </div>
      </div>
    </div>
  );
}

function MinionDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { unreadCount, history } = useNotification();
  const [earnings, setEarnings] = useState({
    summary: {
      active_jobs: 0,
      completed_jobs: 0,
      total_earned: 0,
      pending_earnings: 0,
      successful_payments: 0,
      pending_payments: 0,
      failed_payments: 0
    },
    payments: []
  });
  const [applications, setApplications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [earningsFilter, setEarningsFilter] = useState('all');
  const [availabilityState, setAvailabilityState] = useState(user?.availability ? 'available' : 'busy');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [earningsResponse, applicationsResponse, tasksResponse] = await Promise.all([
          paymentsAPI.getMinionEarnings(),
          assignmentsAPI.getMinionApplications(user?.id),
          tasksAPI.getAll()
        ]);

        setEarnings(earningsResponse.data);
        setApplications(applicationsResponse.data);
        setTasks(tasksResponse.data);
        setError('');
      } catch (err) {
        console.error('Error loading minion dashboard:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadDashboard();
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const skillList = (user?.skills || '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  const completionFields = [
    Boolean(user?.profile_photo_url),
    Boolean(user?.phone),
    Boolean(user?.location),
    Boolean(user?.skills),
    Boolean(user?.availability)
  ];
  const profileCompletion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  const overviewCounts = {
    applied: applications.filter((app) => app.status === 'pending').length,
    assigned: applications.filter((app) => app.status === 'accepted' && app.task_status === 'assigned').length,
    inProgress: applications.filter((app) => app.status === 'accepted' && app.task_status === 'in_progress').length,
    awaitingPayment: applications.filter((app) => app.status === 'accepted' && app.task_status === 'completed').length,
    completed: applications.filter((app) => app.status === 'accepted' && app.task_status === 'paid').length
  };

  const jobKeywords = skillList.map((skill) => skill.toLowerCase());
  const recommendedJobs = tasks
    .filter((task) => task.status === 'open')
    .filter((task) => {
      const haystack = `${task.category || ''} ${task.title || ''} ${task.description || ''}`.toLowerCase();
      const locationMatch = !user?.location || (task.location || '').toLowerCase().includes(user.location.toLowerCase());
      const skillMatch = jobKeywords.length === 0 || jobKeywords.some((keyword) => haystack.includes(keyword));
      return locationMatch || skillMatch;
    })
    .slice(0, 3);

  const filteredPayments = earnings.payments.filter((payment) => {
    if (earningsFilter === 'all') return true;
    return payment.status === earningsFilter;
  });

  const recentActivity = [
    ...earnings.payments.slice(0, 2).map((payment) => ({
      id: `payment-${payment.id}`,
      title: `${payment.title} payment update`,
      description: `${payment.status === 'success' ? 'Payment received' : `Payment marked ${payment.status}`}: ${formatCurrency(payment.amount)}`,
      createdAt: payment.paid_at || payment.created_at
    })),
    ...history.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title || 'Activity update',
      description: item.message,
      createdAt: item.createdAt
    }))
  ]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const earningsChart = [
    { label: 'Paid', value: earnings.summary.successful_payments, color: 'bg-emerald-500' },
    { label: 'Pending', value: earnings.summary.pending_payments, color: 'bg-yellow-400' },
    { label: 'Failed', value: earnings.summary.failed_payments, color: 'bg-red-400' }
  ];
  const chartMax = Math.max(...earningsChart.map((item) => item.value), 1);

  const quickActions = [
    {
      title: 'Find Gigs',
      description: 'Browse fresh opportunities that fit your location, skills, and availability.',
      icon: Search,
      href: '/find-gigs',
      accent: 'from-minion-blue to-minion-blue-light',
      textColor: 'text-white'
    },
    {
      title: 'My Accepted Tasks',
      description: 'Track assignments, update progress, and stay on top of client expectations.',
      icon: ClipboardList,
      href: '/my-jobs',
      accent: 'from-minion-yellow to-minion-yellow-light',
      textColor: 'text-slate-950'
    },
    {
      title: 'Notifications',
      description: 'Check important task, payment, and platform updates in one place.',
      icon: Bell,
      href: '/notifications',
      accent: 'from-emerald-500 to-green-500',
      textColor: 'text-white'
    }
  ];

  const stats = [
    {
      title: 'Active Jobs',
      value: earnings.summary.active_jobs,
      helper: 'Current assigned or in-progress work connected to your account.',
      icon: Briefcase,
      accent: 'from-blue-200 to-blue-100'
    },
    {
      title: 'Completed',
      value: earnings.summary.completed_jobs,
      helper: 'Finished tasks that helped build your earning history and reputation.',
      icon: CheckCircle2,
      accent: 'from-emerald-200 to-emerald-100'
    },
    {
      title: 'Total Earned',
      value: earnings.summary.total_earned,
      helper: 'Recorded payouts from completed client work.',
      icon: Wallet,
      accent: 'from-yellow-200 to-yellow-100',
      prefix: 'KSh '
    }
  ];

  const availabilityTone =
    availabilityState === 'available'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : availabilityState === 'busy'
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';

  const profileFields = [
    { label: 'Email', value: user?.email || 'Not provided', icon: MessageSquareText },
    { label: 'Phone', value: user?.phone || 'Add a phone number', icon: UserCircle2 },
    { label: 'Location', value: user?.location || 'Add your location', icon: MapPin },
    { label: 'Availability', value: user?.availability || 'Set your availability', icon: Clock3 }
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf4_0%,#ffffff_28%,#f7fbff_100%)] text-slate-900">
      <div className="bg-linear-to-r from-minion-yellow to-minion-yellow-light shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <ProfileAvatar user={user} size="md" className="ring-1 ring-black/10" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-minion-blue">Minion Dashboard</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Welcome back, {user?.first_name || 'there'}!
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
                  Manage your work, stay visible to clients, and keep your earnings momentum moving forward.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setAvailabilityState((current) =>
                    current === 'available' ? 'busy' : current === 'busy' ? 'offline' : 'available'
                  )
                }
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${availabilityTone}`}
              >
                <BadgeCheck className="h-4 w-4" />
                {availabilityLabels[availabilityState]}
              </button>
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-slate-900 shadow-sm transition hover:bg-white"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-minion-blue px-1.5 py-0.5 text-center text-xs font-black text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[32px] border border-minion-yellow/20 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-bottom-4 duration-700 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <ProfileAvatar user={user} size="lg" className="ring-1 ring-slate-200" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-minion-blue">Your Profile</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {user?.first_name} {user?.last_name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A complete profile helps you match faster, stand out to clients, and win more suitable jobs.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-minion-yellow px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-950">
                      {user?.role || 'minion'}
                    </span>
                    {skillList.length > 0 ? (
                      skillList.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-minion-blue">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        Add skills to improve matches
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/minion/profile/edit')}
                className="inline-flex items-center gap-2 rounded-2xl border border-minion-blue px-4 py-3 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
              >
                <PencilLine className="h-4 w-4" />
                Edit Profile
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {profileFields.map((field) => {
                const Icon = field.icon;

                return (
                  <div key={field.label} className="rounded-[24px] bg-slate-50 p-5">
                    <div className="inline-flex rounded-xl bg-white p-2 text-minion-blue shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{field.label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{field.value}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="rounded-[32px] bg-linear-to-br from-minion-blue to-minion-blue-light p-6 text-white shadow-[0_18px_55px_rgba(0,87,183,0.18)] animate-in fade-in slide-in-from-right-4 duration-700 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-yellow">Profile Strength</p>
            <h2 className="mt-3 text-2xl font-black">{profileCompletion}% complete</h2>
            <p className="mt-3 text-sm leading-6 text-blue-50">
              Better profiles lead to better trust, stronger client responses, and more relevant task recommendations.
            </p>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-minion-yellow transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>

            <div className="mt-6 space-y-3">
              {[
                user?.phone ? 'Phone number added' : 'Add a phone number',
                user?.location ? 'Location added' : 'Add your location',
                user?.skills ? 'Skills listed' : 'Add your skills'
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                  <CheckCircle2 className="h-5 w-5 text-minion-yellow" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <SectionHeader
            eyebrow="Quick Actions"
            title="Keep your workflow moving"
            description="Everything important is grouped into action cards so you can jump straight into work, updates, or new opportunities."
          />

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {quickActions.map((action) => (
              <ActionCard key={action.title} action={action} onClick={() => navigate(action.href)} />
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 sm:p-8">
            <SectionHeader
              eyebrow="Recommended Jobs"
              title="Fresh opportunities that fit your profile"
              description="These are pulled from open tasks and matched loosely against your skills and location."
              action={
                <button
                  type="button"
                  onClick={() => navigate('/find-gigs')}
                  className="inline-flex items-center gap-2 rounded-xl border border-minion-blue px-4 py-2 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
                >
                  Find more gigs
                </button>
              }
            />

            {recommendedJobs.length === 0 ? (
              <div className="mt-8 rounded-[28px] border-2 border-dashed border-slate-200 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-minion-blue">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">No tailored jobs yet</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Add more specific skills and keep checking Find Gigs to uncover new opportunities in your area.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/find-gigs')}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-minion-yellow px-5 py-3 font-semibold text-slate-950 transition hover:bg-minion-yellow-light"
                >
                  Explore open tasks
                </button>
              </div>
            ) : (
              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                {recommendedJobs.map((job) => (
                  <JobCard key={job.id} job={job} onNavigate={() => navigate('/find-gigs')} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-700 sm:p-8">
            <SectionHeader
              eyebrow="Jobs Overview"
              title="A quick look at where your work stands"
              description="Applications and assigned jobs are grouped into practical status buckets."
            />

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Applied', value: overviewCounts.applied, tone: 'bg-yellow-100 text-yellow-800 border-yellow-200', helper: 'Jobs waiting on client review' },
                { label: 'Assigned', value: overviewCounts.assigned, tone: 'bg-blue-100 text-minion-blue border-blue-200', helper: 'Jobs officially assigned to you' },
                { label: 'In Progress', value: overviewCounts.inProgress, tone: 'bg-violet-100 text-violet-800 border-violet-200', helper: 'Active work currently underway' },
                { label: 'Awaiting Payment', value: overviewCounts.awaitingPayment, tone: 'bg-amber-100 text-amber-800 border-amber-200', helper: 'Completed work waiting for payout' },
                { label: 'Completed', value: overviewCounts.completed, tone: 'bg-emerald-100 text-emerald-800 border-emerald-200', helper: 'Paid and finished jobs' }
              ].map((status) => (
                <div key={status.label} className="rounded-[24px] border border-slate-200 p-4 transition hover:border-minion-yellow">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${status.tone}`}>
                    {status.label}
                  </span>
                  <p className="mt-4 text-3xl font-black text-slate-900">{status.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{status.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 sm:p-8">
            <SectionHeader
              eyebrow="Earnings"
              title="Track payouts with a clearer workflow"
              description="Filter payment history, scan the breakdown, and keep an eye on what is still pending."
              action={
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 rounded-xl border border-minion-blue px-4 py-2 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
                >
                  Refresh
                </button>
              }
            />

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-minion-yellow border-t-minion-blue" />
              </div>
            ) : error ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                {error}
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-700">Paid Out</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{formatCurrency(earnings.summary.total_earned)}</p>
                  </div>
                  <div className="rounded-2xl bg-yellow-50 p-4">
                    <p className="text-sm font-semibold text-yellow-700">Pending Earnings</p>
                    <p className="mt-2 text-3xl font-black text-yellow-800">{formatCurrency(earnings.summary.pending_earnings)}</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-700">Successful Payments</p>
                    <p className="mt-2 text-3xl font-black text-blue-800">{earnings.summary.successful_payments}</p>
                  </div>
                  <div className="rounded-2xl bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-700">Failed Payments</p>
                    <p className="mt-2 text-3xl font-black text-red-800">{earnings.summary.failed_payments}</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  {[
                    ['all', `All (${earnings.payments.length})`],
                    ['success', `Paid (${earnings.summary.successful_payments})`],
                    ['pending', `Pending (${earnings.summary.pending_payments})`],
                    ['failed', `Failed (${earnings.summary.failed_payments})`]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEarningsFilter(value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        earningsFilter === value
                          ? 'bg-minion-blue text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="mt-8 rounded-[28px] border-2 border-dashed border-slate-200 p-10 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CreditCard className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900">No payments in this filter</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      As you complete tasks and clients record payouts, payment activity will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 space-y-4">
                    {filteredPayments.map((payment) => (
                      <PaymentCard key={payment.id} payment={payment} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-700 sm:p-8">
              <SectionHeader
                eyebrow="Earnings Chart"
                title="Payment status breakdown"
                description="A simple visual snapshot of how payouts are currently distributed."
              />

              <div className="mt-8 space-y-4">
                {earningsChart.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.value / chartMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-700 sm:p-8">
              <SectionHeader
                eyebrow="Recent Activity"
                title="Latest task and payment updates"
                description="Stay oriented even on quieter days with a combined timeline of key events."
              />

              {recentActivity.length === 0 ? (
                <div className="mt-8 rounded-[28px] border-2 border-dashed border-slate-200 p-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-minion-blue">
                    <Clock3 className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-900">No recent activity yet</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Apply for gigs or complete jobs to build up your activity feed.
                  </p>
                </div>
              ) : (
                <div className="mt-8 space-y-4">
                  {recentActivity.map((item, index) => (
                    <div key={item.id} className="flex gap-4 rounded-[24px] bg-slate-50 p-5">
                      <div className={`mt-1 h-3 w-3 rounded-full ${index % 3 === 0 ? 'bg-minion-blue' : index % 3 === 1 ? 'bg-minion-yellow' : 'bg-emerald-500'}`} />
                      <div>
                        <h3 className="font-bold text-slate-900">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] bg-linear-to-br from-minion-blue to-minion-blue-light p-6 text-white shadow-[0_18px_55px_rgba(0,87,183,0.18)] animate-in fade-in slide-in-from-left-4 duration-700 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-yellow">Tips for Success</p>
            <h2 className="mt-3 text-2xl font-black">Small habits that lead to more trust and more work</h2>
            <div className="mt-6 space-y-4">
              {[
                'Keep your profile specific so recommended jobs align with your real skills.',
                'Respond quickly to assignments and notifications to build reliability.',
                'Update task progress clearly so clients feel confident during the job.',
                'Mark work complete promptly so payment can move through the workflow.'
              ].map((tip) => (
                <div key={tip} className="flex gap-3 rounded-[24px] bg-white/10 p-4 backdrop-blur">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-minion-yellow" />
                  <p className="text-sm leading-6 text-blue-50">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-minion-yellow/30 bg-[linear-gradient(180deg,#fffdf4_0%,#ffffff_100%)] p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-700 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-blue">Intentional Empty State</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">Need more momentum? Start with the jobs that fit you best.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              A lively dashboard matters most when activity is still growing. Keep your profile polished, apply consistently, and let your completion history build over time.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-white p-5 shadow-sm">
                <TrendingUp className="h-6 w-6 text-minion-blue" />
                <h3 className="mt-4 font-bold text-slate-900">Build reputation</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Consistent updates and clear communication make clients more likely to trust you again.</p>
              </div>
              <div className="rounded-[24px] bg-white p-5 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-minion-blue" />
                <h3 className="mt-4 font-bold text-slate-900">Protect your flow</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Check jobs overview and payment filters often so nothing stalls without you noticing.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/find-gigs')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-minion-yellow px-5 py-3 font-semibold text-slate-950 transition hover:bg-minion-yellow-light"
              >
                Find Gigs
              </button>
              <button
                type="button"
                onClick={() => navigate('/my-jobs')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-minion-blue px-5 py-3 font-semibold text-minion-blue transition hover:bg-blue-50"
              >
                Review My Jobs
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default MinionDashboard;
