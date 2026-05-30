import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  MessageSquareText,
  PencilLine,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Star,
  UserCircle2,
  Users
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';
import ProfileAvatar from '../components/ProfileAvatar';
import { paymentsAPI, tasksAPI } from '../services/api';

const quickActions = [
  {
    title: 'Post a New Task',
    description: 'Create a detailed request and start receiving interest from available minions.',
    icon: PlusCircle,
    href: '/post-task',
    accent: 'from-minion-yellow to-minion-yellow-light',
    textColor: 'text-slate-950'
  },
  {
    title: 'Manage My Tasks',
    description: 'Track active work, review progress, and stay on top of client actions.',
    icon: ClipboardList,
    href: '/my-tasks',
    accent: 'from-minion-blue to-minion-blue-light',
    textColor: 'text-white'
  },
  {
    title: 'Browse Minions',
    description: 'Explore skilled helpers by specialty, ratings, and location before you hire.',
    icon: Users,
    href: '/browse-minions',
    accent: 'from-emerald-500 to-teal-500',
    textColor: 'text-white'
  }
];

const recommendedMinions = [
  {
    name: 'Amina W.',
    specialty: 'Home Cleaning Specialist',
    rating: 4.9,
    location: 'Westlands, Nairobi',
    image: '/MinionMaid.jpg'
  },
  {
    name: 'Brian K.',
    specialty: 'Errands and Delivery Pro',
    rating: 4.8,
    location: 'Kilimani, Nairobi',
    image: '/MinionMaid.jpg'
  },
  {
    name: 'Faith M.',
    specialty: 'Moving and Packing Help',
    rating: 4.9,
    location: 'Karen, Nairobi',
    image: '/MinionMaid.jpg'
  }
];

const taskStatuses = [
  { label: 'Pending', value: 0, tone: 'bg-yellow-100 text-yellow-800 border-yellow-200', helper: 'Waiting for minions to apply' },
  { label: 'Assigned', value: 0, tone: 'bg-blue-100 text-minion-blue border-blue-200', helper: 'A minion has been chosen' },
  { label: 'In Progress', value: 0, tone: 'bg-violet-100 text-violet-800 border-violet-200', helper: 'Work is actively underway' },
  { label: 'Completed', value: 0, tone: 'bg-emerald-100 text-emerald-800 border-emerald-200', helper: 'Finished tasks ready for review' },
  { label: 'Cancelled', value: 0, tone: 'bg-rose-100 text-rose-800 border-rose-200', helper: 'Tasks that were closed early' }
];

const recentActivity = [
  {
    title: 'No recent task updates yet',
    description: 'Once you post tasks and receive activity, updates will appear here in a clean timeline.',
    tone: 'empty'
  },
  {
    title: 'Tip: strong task briefs get better matches',
    description: 'Include budget, location, timing, and exact expectations to attract reliable minions faster.',
    tone: 'tip'
  },
  {
    title: 'Your notifications feed stays connected',
    description: 'Application alerts, payment updates, and task events are all available from the notification center.',
    tone: 'info'
  }
];

const smartTips = [
  'Be specific about what success looks like so minions know exactly what to deliver.',
  'Set a fair budget and preferred completion window to improve response quality.',
  'Review ratings, specialties, and location before assigning a helper.',
  'Use task updates and notifications to keep communication clear from start to finish.'
];

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
      className={`group rounded-[28px] bg-gradient-to-br ${action.accent} p-[1px] text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl`}
    >
      <div className="h-full rounded-[27px] bg-white/94 p-6 backdrop-blur">
        <div className={`inline-flex rounded-2xl bg-gradient-to-br ${action.accent} p-3 ${action.textColor} shadow-md`}>
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
    <div className={`rounded-[28px] bg-gradient-to-br ${accent} p-[1px] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl`}>
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

function RecommendedMinionCard({ minion, onBrowse }) {
  return (
    <article className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="relative h-52 overflow-hidden">
        <img
          src={minion.image}
          alt={minion.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-slate-950/70 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-minion-blue">
          Recommended
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{minion.name}</h3>
            <p className="mt-1 text-sm font-medium text-minion-blue">{minion.specialty}</p>
          </div>
          <div className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-amber-900">
            {minion.rating} <Star className="mb-0.5 ml-1 inline h-4 w-4 fill-current" />
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 text-minion-blue" />
          {minion.location}
        </p>

        <button
          type="button"
          onClick={onBrowse}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-minion-blue px-4 py-2 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
        >
          View Minions
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function ClientDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { unreadCount } = useNotification();
  const [dashboardTasks, setDashboardTasks] = useState([]);
  const [paymentHistoryByTask, setPaymentHistoryByTask] = useState({});

  useEffect(() => {
    const loadDashboardSnapshot = async () => {
      if (!user?.id) {
        setDashboardTasks([]);
        setPaymentHistoryByTask({});
        return;
      }

      try {
        const tasksResponse = await tasksAPI.getAll();
        const myTasks = (tasksResponse.data || []).filter((task) => task.client_id === user.id);
        setDashboardTasks(myTasks);

        if (myTasks.length === 0) {
          setPaymentHistoryByTask({});
          return;
        }

        const paymentEntries = await Promise.all(
          [...new Set(myTasks.map((task) => task.id))].map(async (taskId) => {
            try {
              const paymentResponse = await paymentsAPI.getTaskPayment(taskId);
              return [taskId, paymentResponse.data?.payment || null];
            } catch {
              return [taskId, null];
            }
          })
        );

        setPaymentHistoryByTask(Object.fromEntries(paymentEntries));
      } catch (err) {
        console.error('Error loading client dashboard snapshot:', err);
      }
    };

    loadDashboardSnapshot();
  }, [user?.id]);

  const profileFields = [
    {
      label: 'Email',
      value: user?.email || 'Not provided',
      icon: MessageSquareText
    },
    {
      label: 'Phone',
      value: user?.phone || 'Add a phone number',
      icon: UserCircle2
    },
    {
      label: 'Location',
      value: user?.location || 'Add your location',
      icon: MapPin
    }
  ];

  const activeTaskCount = dashboardTasks.filter((task) => ['open', 'pending', 'assigned', 'in_progress'].includes(task.status)).length;
  const completedTaskCount = dashboardTasks.filter((task) => ['completed', 'paid'].includes(task.status)).length;
  const pendingTaskCount = dashboardTasks.filter((task) => task.status === 'pending').length;
  const assignedTaskCount = dashboardTasks.filter((task) => task.status === 'assigned').length;
  const inProgressTaskCount = dashboardTasks.filter((task) => task.status === 'in_progress').length;
  const cancelledTaskCount = dashboardTasks.filter((task) => task.status === 'cancelled').length;
  const totalSpent = Object.values(paymentHistoryByTask).reduce((sum, payment) => {
    if (!payment || payment.status !== 'success') {
      return sum;
    }

    return sum + Number(payment.amount || 0);
  }, 0);

  const stats = [
    {
      title: 'Active Tasks',
      value: activeTaskCount,
      helper: activeTaskCount > 0
        ? 'These tasks are still live and need your attention.'
        : 'No live tasks yet. Post your first request to start getting matched.',
      icon: ClipboardList,
      accent: 'from-blue-200 to-blue-100'
    },
    {
      title: 'Completed',
      value: completedTaskCount,
      helper: completedTaskCount > 0
        ? 'Finished work is showing up here as tasks get completed.'
        : 'Finished work will appear here once your first task is completed.',
      icon: CheckCircle2,
      accent: 'from-emerald-200 to-emerald-100'
    },
    {
      title: 'Total Spent',
      value: totalSpent,
      helper: totalSpent > 0
        ? 'This includes successful payments recorded against your tasks.'
        : 'Your client spend summary will update as payments are recorded.',
      icon: Briefcase,
      accent: 'from-yellow-200 to-yellow-100',
      prefix: 'KSh '
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = `${user?.first_name || 'Client'} ${user?.last_name || ''}`.trim();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_32%,#fffdf4_100%)] text-slate-900">
      <div className="bg-linear-to-r from-minion-blue to-minion-blue-light shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <ProfileAvatar user={user} size="md" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-minion-yellow">Client Dashboard</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Welcome back, {user?.first_name || 'there'}!</h1>
                <p className="mt-2 max-w-2xl text-sm text-blue-50 sm:text-base">
                  Keep track of your tasks, discover trusted minions, and turn your to-do list into completed work.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-minion-yellow px-1.5 py-0.5 text-center text-xs font-black text-slate-950">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white px-5 py-3 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[32px] border border-minion-blue/15 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-bottom-4 duration-700 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                {user?.profile_photo_url ? (
                  <img
                    src={user.profile_photo_url}
                    alt={`${displayName} profile`}
                    className="h-16 w-16 rounded-2xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-minion-yellow/20 text-minion-blue">
                    <UserCircle2 className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-minion-blue">Your Profile</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{displayName}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Keep your contact details current so minions can coordinate quickly and complete tasks smoothly.
                  </p>
                  <div className="mt-4 inline-flex rounded-full bg-minion-blue px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                    {user?.role || 'client'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/client/profile/edit')}
                className="inline-flex items-center gap-2 rounded-2xl border border-minion-blue px-4 py-3 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
              >
                <PencilLine className="h-4 w-4" />
                Edit Profile
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

          <aside className="rounded-[32px] bg-linear-to-br from-minion-yellow to-minion-yellow-light p-6 text-slate-950 shadow-[0_18px_55px_rgba(255,215,0,0.18)] animate-in fade-in slide-in-from-right-4 duration-700 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-blue">Dashboard Snapshot</p>
            <h2 className="mt-3 text-2xl font-black">Ready to get something done?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              New clients look best when the dashboard stays helpful even before the first task. Start with a clear request and Minion Me will do the rest.
            </p>

            <div className="mt-6 space-y-3">
              {[
                  dashboardTasks.length > 0 ? `${dashboardTasks.length} task${dashboardTasks.length === 1 ? '' : 's'} posted` : 'Post a detailed task brief',
                  activeTaskCount > 0 ? `${activeTaskCount} active task${activeTaskCount === 1 ? '' : 's'} in motion` : 'Compare helpers by ratings and specialty',
                  totalSpent > 0 ? `KSh ${totalSpent.toLocaleString()} recorded in payments` : 'Track progress from request to payout'
                ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/65 px-4 py-3 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-minion-blue" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate('/post-task')}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Post your first task
              <ArrowRight className="h-4 w-4" />
            </button>
          </aside>
        </div>

        <section className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <SectionHeader
            eyebrow="Quick Actions"
            title="Everything you need to move a task forward"
            description="These action cards are designed to help you start fast, stay organized, and find the right help without friction."
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

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 sm:p-8">
            <SectionHeader
              eyebrow="Recent Activity"
              title="Task updates and helpful nudges"
              description="A lively feed keeps the dashboard useful even before your task history fills up."
              action={
                <button
                  type="button"
                  onClick={() => navigate('/notifications')}
                  className="inline-flex items-center gap-2 rounded-xl border border-minion-blue px-4 py-2 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
                >
                  View notifications
                </button>
              }
            />

            <div className="mt-8 space-y-4">
              {recentActivity.map((item, index) => (
                <div key={item.title} className="flex gap-4 rounded-[24px] bg-slate-50 p-5">
                  <div className={`mt-1 h-3 w-3 rounded-full ${index === 0 ? 'bg-minion-yellow' : index === 1 ? 'bg-minion-blue' : 'bg-emerald-500'}`} />
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-700 sm:p-8">
            <SectionHeader
              eyebrow="Tasks Overview"
              title="A simple status snapshot"
              description="Once you start posting, these status groups help you scan progress at a glance."
            />

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {taskStatuses.map((status) => (
                <div key={status.label} className="rounded-[24px] border border-slate-200 p-4 transition hover:border-minion-yellow">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${status.tone}`}>
                    {status.label}
                  </span>
                  <p className="mt-4 text-3xl font-black text-slate-900">
                    {
                      {
                        Pending: pendingTaskCount,
                        Assigned: assignedTaskCount,
                        'In Progress': inProgressTaskCount,
                        Completed: completedTaskCount,
                        Cancelled: cancelledTaskCount
                      }[status.label] ?? status.value
                    }
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{status.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 sm:p-8">
          <SectionHeader
            eyebrow="Recommended Minions"
            title="Suggested helpers for popular client needs"
            description="These reusable cards spotlight the kind of trusted help clients often want first."
            action={
              <button
                type="button"
                onClick={() => navigate('/browse-minions')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-minion-blue transition hover:text-minion-blue-dark"
              >
                Browse all minions
                <ArrowRight className="h-4 w-4" />
              </button>
            }
          />

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {recommendedMinions.map((minion) => (
              <RecommendedMinionCard
                key={minion.name}
                minion={minion}
                onBrowse={() => navigate('/browse-minions')}
              />
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] bg-linear-to-br from-minion-blue to-minion-blue-light p-6 text-white shadow-[0_18px_55px_rgba(0,87,183,0.18)] animate-in fade-in slide-in-from-left-4 duration-700 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-yellow">Smart Tips</p>
            <h2 className="mt-3 text-2xl font-black">Small changes that lead to better task outcomes</h2>
            <div className="mt-6 space-y-4">
              {smartTips.map((tip) => (
                <div key={tip} className="flex gap-3 rounded-[24px] bg-white/10 p-4 backdrop-blur">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-minion-yellow" />
                  <p className="text-sm leading-6 text-blue-50">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-minion-yellow/30 bg-[linear-gradient(180deg,#fffdf4_0%,#ffffff_100%)] p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-700 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-blue">Strong Empty State</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">No tasks yet? Start with a great first request.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The best early dashboard experience is a clear next step. Post your first task and begin building your history, spend, activity, and trusted minion relationships.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-white p-5 shadow-sm">
                <Clock3 className="h-6 w-6 text-minion-blue" />
                <h3 className="mt-4 font-bold text-slate-900">Need help quickly?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Create a task with timing details so minions can respond faster.</p>
              </div>
              <div className="rounded-[24px] bg-white p-5 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-minion-blue" />
                <h3 className="mt-4 font-bold text-slate-900">Want better matches?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use location, budget, and a detailed description to attract the right help.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/post-task')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-minion-yellow px-5 py-3 font-semibold text-slate-950 transition hover:bg-minion-yellow-light"
              >
                Post a Task
              </button>
              <button
                type="button"
                onClick={() => navigate('/browse-minions')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-minion-blue px-5 py-3 font-semibold text-minion-blue transition hover:bg-blue-50"
              >
                Explore Minions
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ClientDashboard;
