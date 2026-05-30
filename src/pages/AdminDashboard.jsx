import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CreditCard,
  Filter,
  Search,
  ShieldAlert,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';
import { adminAPI, disputesAPI } from '../services/api';
import { disputeStatusLabels, disputeStatusTone, formatDisputeReason } from '../lib/disputes';

const formatCurrency = (value) => `KSh ${Number(value || 0).toLocaleString()}`;

const statusTone = {
  open: 'bg-blue-100 text-minion-blue',
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-minion-blue-dark',
  in_progress: 'bg-yellow-100 text-amber-900',
  completed: 'bg-slate-200 text-slate-800',
  paid: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-amber-100 text-amber-900',
  cancelled: 'bg-rose-100 text-rose-800',
  archived: 'bg-slate-300 text-slate-800',
  success: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800'
};

const priorityTone = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-minion-blue',
  high: 'bg-yellow-100 text-yellow-800',
  urgent: 'bg-rose-100 text-rose-700'
};

const categoryOptions = ['Cleaning', 'Plumbing', 'Electrical', 'Gardening', 'Delivery', 'Moving', 'Carpentry', 'Painting', 'Repairs', 'Errands', 'Tutoring', 'Beauty & Grooming', 'Other'];
const taskStatusOptions = ['open', 'pending', 'assigned', 'in_progress', 'completed', 'paid', 'paused', 'cancelled', 'archived'];
const taskPriorityOptions = ['low', 'normal', 'high', 'urgent'];

const createTaskDraft = (task) => ({
  title: task?.title || '',
  description: task?.description || '',
  category: task?.category || 'Other',
  location: task?.location || '',
  budget: task?.budget ?? '',
  status: task?.status || 'open',
  priority: task?.priority || 'normal',
  minionId: task?.minion_id ?? ''
});

const formatTimelineTimestamp = (value) => {
  if (!value) {
    return 'Unknown time';
  }

  return new Date(value).toLocaleString();
};

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

function KpiCard({ title, value, context, trend, accent }) {
  return (
    <div className={`rounded-[28px] bg-linear-to-br ${accent} p-px shadow-sm`}>
      <div className="h-full rounded-[27px] bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
        <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{value}</p>
        <p className="mt-3 text-sm text-slate-500">{context}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-minion-blue">{trend}</p>
      </div>
    </div>
  );
}

function AttentionCard({ item, onAction }) {
  const Icon = item.icon;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-2xl bg-minion-yellow/20 p-3 text-minion-blue">
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">{item.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
        </div>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700">{item.value}</span>
      </div>

      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-minion-blue transition hover:text-minion-blue-dark"
      >
        {item.actionLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function TableToolbar({ searchValue, onSearchChange, filterValue, onFilterChange, filterOptions, searchPlaceholder }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-sm">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
        />
      </div>
      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <Filter className="h-4 w-4 text-minion-blue" />
        <select
          value={filterValue}
          onChange={onFilterChange}
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
  );
}

function ReviewModal({ review, onClose }) {
  if (!review) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 w-full max-w-2xl rounded-[32px] border border-minion-blue/20 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-blue">Review Panel</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{review.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{review.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close review panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm leading-7 text-slate-700">
          {review.content}
        </div>
      </section>
    </div>
  );
}

function TaskCommandCenterModal({
  task,
  draft,
  minionOptions,
  disputes,
  disputeLoading,
  disputeNote,
  disputeSaving,
  auditEntries,
  auditLoading,
  saving,
  onClose,
  onDraftChange,
  onSave,
  onAction,
  onDisputeNoteChange,
  onDisputeAction
}) {
  if (!task || !draft) {
    return null;
  }

  const assignedMinion = minionOptions.find((option) => option.id === Number(task.minion_id));
  const currentDispute = disputes.find((entry) => ['open', 'under_review'].includes(entry.status)) || disputes[0] || null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 py-4 sm:px-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-minion-blue/20 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-linear-to-r from-minion-blue to-minion-blue-light px-6 py-5 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-minion-yellow">Task Command Center</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">{task.title}</h2>
              <p className="mt-3 text-sm leading-6 text-blue-50">
                Update task details, adjust assignment, and apply admin-only workflow actions from one responsive workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close task command center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusTone[task.status] || 'bg-white/20 text-white'}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${priorityTone[task.priority] || 'bg-white/20 text-white'}`}>
              {task.priority} priority
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-50">
              Client: {task.client_name || 'Unknown'}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-50">
              Minion: {task.minion_name || 'Unassigned'}
            </span>
            {task.has_active_dispute ? (
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${disputeStatusTone[task.active_dispute_status] || 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                Dispute {disputeStatusLabels[task.active_dispute_status] || 'Open'}
              </span>
            ) : null}
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Task Details</p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Task Title</span>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(event) => onDraftChange('title', event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Description</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) => onDraftChange('description', event.target.value)}
                      rows={6}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">Category</span>
                    <select
                      value={draft.category}
                      onChange={(event) => onDraftChange('category', event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                    >
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">Location</span>
                    <input
                      type="text"
                      value={draft.location}
                      onChange={(event) => onDraftChange('location', event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">Budget</span>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      value={draft.budget}
                      onChange={(event) => onDraftChange('budget', event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">Status</span>
                    <select
                      value={draft.status}
                      onChange={(event) => onDraftChange('status', event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                    >
                      {taskStatusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">Priority</span>
                    <select
                      value={draft.priority}
                      onChange={(event) => onDraftChange('priority', event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                    >
                      {taskPriorityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Assignment</p>
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <p><span className="font-semibold text-slate-900">Currently assigned:</span> {assignedMinion ? `${assignedMinion.first_name} ${assignedMinion.last_name}` : 'No minion assigned yet'}</p>
                  <p><span className="font-semibold text-slate-900">Suggested invite:</span> {task.invited_minion_id ? `Minion #${task.invited_minion_id}` : 'No direct invite set'}</p>
                </div>

                <label className="mt-4 block">
                  <span className="text-sm font-semibold text-slate-700">Choose Minion</span>
                  <select
                    value={draft.minionId}
                    onChange={(event) => onDraftChange('minionId', event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                  >
                    <option value="">Unassigned</option>
                    {minionOptions.map((minion) => (
                      <option key={minion.id} value={minion.id}>
                        {minion.first_name} {minion.last_name} • {minion.location || 'No location'}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onAction('assign')}
                    disabled={saving}
                    className="rounded-2xl bg-minion-blue px-4 py-3 text-sm font-semibold text-white transition hover:bg-minion-blue-light disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Assign Minion
                  </button>
                  <button
                    type="button"
                    onClick={() => onAction('reassign')}
                    disabled={saving}
                    className="rounded-2xl border border-minion-blue px-4 py-3 text-sm font-semibold text-minion-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Reassign Minion
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Admin Actions</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => onAction('in_progress')} disabled={saving} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70">Mark In Progress</button>
                  <button type="button" onClick={() => onAction('completed')} disabled={saving} className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70">Mark Completed</button>
                  <button type="button" onClick={() => onAction('paused')} disabled={saving} className="rounded-2xl border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-70">Pause Task</button>
                  <button type="button" onClick={() => onAction('cancelled')} disabled={saving} className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70">Cancel Task</button>
                  <button type="button" onClick={() => onAction('open')} disabled={saving} className="rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-minion-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70">Reopen Task</button>
                  <button type="button" onClick={() => onAction('archived')} disabled={saving} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70">Archive Task</button>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                <p><span className="font-semibold text-slate-900">Created:</span> {task.created_at ? new Date(task.created_at).toLocaleString() : 'Unknown'}</p>
                <p><span className="font-semibold text-slate-900">Assigned:</span> {task.assigned_at ? new Date(task.assigned_at).toLocaleString() : 'Not assigned'}</p>
                <p><span className="font-semibold text-slate-900">Completed:</span> {task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Not completed'}</p>
                <p><span className="font-semibold text-slate-900">Archived:</span> {task.archived_at ? new Date(task.archived_at).toLocaleString() : 'Not archived'}</p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Dispute</p>
                    <p className="mt-2 text-sm text-slate-600">Admins can review the active dispute, record notes, and resolve the task path from here.</p>
                  </div>
                  {currentDispute ? (
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${disputeStatusTone[currentDispute.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {disputeStatusLabels[currentDispute.status] || currentDispute.status}
                    </span>
                  ) : null}
                </div>

                {disputeLoading ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Loading dispute details...</div>
                ) : !currentDispute ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No disputes have been raised for this task.</div>
                ) : (
                  <>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        <p><span className="font-semibold text-slate-900">Raised by:</span> {currentDispute.raised_by_name || 'Unknown'}</p>
                        <p><span className="font-semibold text-slate-900">Reason:</span> {formatDisputeReason(currentDispute.reason)}</p>
                        <p><span className="font-semibold text-slate-900">Date raised:</span> {formatTimelineTimestamp(currentDispute.created_at)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        <p className="font-semibold text-slate-900">Description</p>
                        <p className="mt-2">{currentDispute.description || 'No description provided.'}</p>
                      </div>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-slate-700">Admin Note</span>
                      <textarea
                        value={disputeNote}
                        onChange={(event) => onDisputeNoteChange(event.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
                      />
                    </label>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => onDisputeAction('under_review')} disabled={disputeSaving} className="rounded-2xl border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-70">Mark Under Review</button>
                      <button type="button" onClick={() => onDisputeAction('resolved')} disabled={disputeSaving} className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70">Resolve Dispute</button>
                      <button type="button" onClick={() => onDisputeAction('rejected')} disabled={disputeSaving} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70">Reject Dispute</button>
                      <button type="button" onClick={() => onDisputeAction('reassign_task')} disabled={disputeSaving} className="rounded-2xl border border-minion-blue px-4 py-3 text-sm font-semibold text-minion-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70">Reassign Task</button>
                      <button type="button" onClick={() => onDisputeAction('cancel_task')} disabled={disputeSaving} className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2">Cancel Task</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Admin Audit Timeline</p>
                <p className="mt-2 text-sm text-slate-600">Newest activity appears first and is visible only inside this admin command center.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                {auditEntries.length} events
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {auditLoading ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Loading task activity...
                </div>
              ) : auditEntries.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No audit activity has been recorded for this task yet.
                </div>
              ) : (
                auditEntries.map((entry) => (
                  <div key={entry.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-minion-blue">{entry.action_label}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">Actor:</span> {entry.actor_name || 'System'}
                        </p>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {formatTimelineTimestamp(entry.created_at)}
                      </p>
                    </div>
                    {entry.notes ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{entry.notes}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Changes save directly to the task record and are restricted to admin users.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-2xl bg-minion-yellow px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-minion-yellow-light disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Task Updates'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { notify } = useNotification();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDraft, setTaskDraft] = useState(null);
  const [taskDisputes, setTaskDisputes] = useState([]);
  const [taskDisputesLoading, setTaskDisputesLoading] = useState(false);
  const [taskDisputeNote, setTaskDisputeNote] = useState('');
  const [taskDisputeSaving, setTaskDisputeSaving] = useState(false);
  const [taskAuditEntries, setTaskAuditEntries] = useState([]);
  const [taskAuditLoading, setTaskAuditLoading] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const loadAdminData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [overviewResponse, usersResponse, tasksResponse, paymentsResponse] = await Promise.all([
        adminAPI.getOverview(),
        adminAPI.getUsers(),
        adminAPI.getTasks(),
        adminAPI.getPayments()
      ]);

      setOverview(overviewResponse.data);
      setUsers(usersResponse.data);
      setTasks(tasksResponse.data);
      setPayments(paymentsResponse.data);
      setError('');
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError(err.response?.data?.message || 'Failed to load admin panel.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const minionOptions = users.filter((account) => account.role === 'minion' && account.email_verified && account.is_active);

  const loadTaskAudit = async (taskId) => {
    setTaskAuditLoading(true);
    try {
      const response = await adminAPI.getTaskAudit(taskId);
      setTaskAuditEntries(response.data || []);
    } catch (err) {
      setTaskAuditEntries([]);
      notify({
        type: 'error',
        title: 'Audit Load Failed',
        message: err.response?.data?.message || 'Failed to load the task audit timeline.'
      });
    } finally {
      setTaskAuditLoading(false);
    }
  };

  const loadTaskDisputes = async (taskId, options = {}) => {
    if (!options.silent) {
      setTaskDisputesLoading(true);
    }

    try {
      const response = await disputesAPI.getTaskDisputes(taskId);
      const disputes = response.data || [];
      setTaskDisputes(disputes);
      setTaskDisputeNote((disputes.find((entry) => ['open', 'under_review'].includes(entry.status)) || disputes[0] || {}).admin_note || '');
    } catch (err) {
      setTaskDisputes([]);
      setTaskDisputeNote('');
      notify({
        type: 'error',
        title: 'Dispute Load Failed',
        message: err.response?.data?.message || 'Failed to load dispute details.'
      });
    } finally {
      if (!options.silent) {
        setTaskDisputesLoading(false);
      }
    }
  };

  const openTaskCommandCenter = async (task) => {
    try {
      setTaskAuditEntries([]);
      setTaskAuditLoading(true);
      setTaskDisputes([]);
      setTaskDisputesLoading(true);
      const [taskResponse, auditResponse, disputeResponse] = await Promise.all([
        adminAPI.getTaskById(task.id),
        adminAPI.getTaskAudit(task.id),
        disputesAPI.getTaskDisputes(task.id)
      ]);
      setSelectedTask(taskResponse.data);
      setTaskDraft(createTaskDraft(taskResponse.data));
      setTaskAuditEntries(auditResponse.data || []);
      const disputes = disputeResponse.data || [];
      setTaskDisputes(disputes);
      setTaskDisputeNote((disputes.find((entry) => ['open', 'under_review'].includes(entry.status)) || disputes[0] || {}).admin_note || '');
    } catch (err) {
      setTaskAuditEntries([]);
      setTaskDisputes([]);
      setTaskDisputeNote('');
      notify({
        type: 'error',
        title: 'Task Load Failed',
        message: err.response?.data?.message || 'Failed to load task details.'
      });
    } finally {
      setTaskAuditLoading(false);
      setTaskDisputesLoading(false);
    }
  };

  const closeTaskCommandCenter = () => {
    setSelectedTask(null);
    setTaskDraft(null);
    setTaskDisputes([]);
    setTaskDisputeNote('');
    setTaskDisputeSaving(false);
    setTaskAuditEntries([]);
    setTaskAuditLoading(false);
    setTaskSaving(false);
  };

  const handleTaskDraftChange = (field, value) => {
    setTaskDraft((current) => ({
      ...current,
      [field]: field === 'minionId'
        ? value
        : value
    }));
  };

  const applyUpdatedTask = (updatedTask) => {
    setTasks((current) => current.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
    setSelectedTask(updatedTask);
    setTaskDraft(createTaskDraft(updatedTask));
  };

  const persistTaskUpdate = async (payload, successMessage) => {
    if (!selectedTask) {
      return;
    }

    try {
      setTaskSaving(true);
      const response = await adminAPI.updateTask(selectedTask.id, payload);
      applyUpdatedTask(response.data);
      await loadTaskAudit(selectedTask.id);
      await loadTaskDisputes(selectedTask.id, { silent: true });
      await loadAdminData(true);
      notify({
        type: 'success',
        title: 'Task Updated',
        message: successMessage || response.message || 'Task changes saved successfully.'
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Task Update Failed',
        message: err.response?.data?.message || 'Failed to update task.'
      });
    } finally {
      setTaskSaving(false);
    }
  };

  const persistDisputeUpdate = async (payload, successMessage) => {
    const currentDispute = taskDisputes.find((entry) => ['open', 'under_review'].includes(entry.status)) || taskDisputes[0];

    if (!selectedTask || !currentDispute) {
      return;
    }

    try {
      setTaskDisputeSaving(true);
      const response = await disputesAPI.updateAdminDispute(currentDispute.id, {
        ...payload,
        adminNote: taskDisputeNote
      });
      const [taskResponse] = await Promise.all([
        adminAPI.getTaskById(selectedTask.id),
        loadTaskDisputes(selectedTask.id, { silent: true }),
        loadTaskAudit(selectedTask.id),
        loadAdminData(true)
      ]);
      applyUpdatedTask(taskResponse.data);
      notify({
        type: 'success',
        title: 'Dispute Updated',
        message: successMessage || response.message || 'Dispute changes saved successfully.'
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Dispute Update Failed',
        message: err.response?.data?.message || 'Failed to update dispute.'
      });
    } finally {
      setTaskDisputeSaving(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskDraft || !selectedTask) {
      return;
    }

    await persistTaskUpdate(
      {
        title: taskDraft.title,
        description: taskDraft.description,
        category: taskDraft.category,
        location: taskDraft.location,
        budget: Number(taskDraft.budget),
        status: taskDraft.status,
        priority: taskDraft.priority
      },
      `Saved updates for "${taskDraft.title}".`
    );
  };

  const handleTaskAction = async (action) => {
    if (!selectedTask || !taskDraft) {
      return;
    }

    const selectedMinionId = taskDraft.minionId ? Number(taskDraft.minionId) : null;
    const destructivePrompts = {
      paused: 'Pause this task? The task will remain in the system but should be treated as temporarily stopped.',
      cancelled: 'Cancel this task? This action is disruptive and should only be used when the task cannot continue.',
      archived: 'Archive this task? Archived tasks are meant for historical record keeping.',
      reassign: 'Reassign this task to the selected minion? This will overwrite the current assignment.',
      open: 'Reopen this task? This will move it back to an open state and clear the current assignment.'
    };

    if (destructivePrompts[action] && !window.confirm(destructivePrompts[action])) {
      return;
    }

    if ((action === 'assign' || action === 'reassign') && !selectedMinionId) {
      notify({
        type: 'error',
        title: 'Minion Required',
        message: 'Select a minion before assigning or reassigning this task.'
      });
      return;
    }

    const actionPayloads = {
      assign: {
        minionId: selectedMinionId,
        status: 'assigned'
      },
      reassign: {
        minionId: selectedMinionId,
        status: 'assigned'
      },
      in_progress: {
        minionId: selectedTask.minion_id || selectedMinionId || null,
        status: 'in_progress'
      },
      completed: {
        minionId: selectedTask.minion_id || selectedMinionId || null,
        status: 'completed'
      },
      paused: {
        status: 'paused'
      },
      cancelled: {
        status: 'cancelled'
      },
      open: {
        status: 'open',
        minionId: null
      },
      archived: {
        status: 'archived'
      }
    };

    const successMessages = {
      assign: 'Task assigned to the selected minion.',
      reassign: 'Task reassigned successfully.',
      in_progress: 'Task moved to in progress.',
      completed: 'Task marked as completed.',
      paused: 'Task paused successfully.',
      cancelled: 'Task cancelled successfully.',
      open: 'Task reopened and returned to the open queue.',
      archived: 'Task archived successfully.'
    };

    await persistTaskUpdate(actionPayloads[action], successMessages[action]);
  };

  const handleDisputeAction = async (action) => {
    const currentDispute = taskDisputes.find((entry) => ['open', 'under_review'].includes(entry.status)) || taskDisputes[0];

    if (!currentDispute || !selectedTask) {
      return;
    }

    const selectedMinionId = taskDraft?.minionId ? Number(taskDraft.minionId) : null;
    const prompts = {
      rejected: 'Reject this dispute? The issue will be closed without changing the task assignment.',
      cancel_task: 'Cancel this task as part of dispute resolution? This will stop the task workflow.',
      reassign_task: 'Reassign this task while resolving the dispute? The selected minion will become the new assignee.'
    };

    if (prompts[action] && !window.confirm(prompts[action])) {
      return;
    }

    if (action === 'reassign_task' && !selectedMinionId) {
      notify({
        type: 'error',
        title: 'Minion Required',
        message: 'Select a minion before reassigning the task through dispute resolution.'
      });
      return;
    }

    const payloads = {
      under_review: {
        status: 'under_review'
      },
      resolved: {
        status: 'resolved',
        resolutionAction: 'resolved'
      },
      rejected: {
        status: 'rejected',
        resolutionAction: 'reject_dispute'
      },
      reassign_task: {
        status: 'resolved',
        resolutionAction: 'reassign_task',
        minionId: selectedMinionId
      },
      cancel_task: {
        status: 'resolved',
        resolutionAction: 'cancel_task'
      }
    };

    const successMessages = {
      under_review: 'Dispute moved into review.',
      resolved: 'Dispute resolved successfully.',
      rejected: 'Dispute rejected successfully.',
      reassign_task: 'Dispute resolved and task reassigned.',
      cancel_task: 'Dispute resolved and task cancelled.'
    };

    await persistDisputeUpdate(payloads[action], successMessages[action]);
  };

  if (!user?.id || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#ffe08a,transparent_45%),linear-gradient(135deg,#0f172a,#1d4ed8_70%,#60a5fa)] px-4">
        <div className="max-w-md rounded-[28px] bg-white/95 p-8 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">Restricted</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Admin access required</h1>
          <p className="mt-3 text-slate-600">This workspace is only available to authenticated admin accounts.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 rounded-full bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  const unverifiedUsers = overview ? overview.users.total_users - overview.users.verified_users : 0;
  const stalledTasks = overview ? overview.tasks.open_tasks + overview.tasks.pending_tasks : 0;
  const pendingPayments = overview ? overview.payments.pending_payments : 0;
  const finishedTasks = overview ? overview.tasks.completed_tasks + overview.tasks.paid_tasks : 0;
  const closureTotal = overview ? finishedTasks + overview.tasks.cancelled_tasks : 0;
  const completionRate = closureTotal > 0
    ? Math.round((finishedTasks / closureTotal) * 100)
    : 0;

  const kpis = overview
    ? [
        {
          title: 'Platform Accounts',
          value: overview.users.total_users,
          context: `${overview.users.total_clients} clients and ${overview.users.total_minions} minions`,
          trend: `${unverifiedUsers} awaiting verification`,
          accent: 'from-blue-200 to-blue-100'
        },
        {
          title: 'Active Task Pipeline',
          value: overview.tasks.open_tasks + overview.tasks.assigned_tasks + overview.tasks.in_progress_tasks,
          context: `${overview.tasks.assigned_tasks} assigned and ${overview.tasks.in_progress_tasks} in progress`,
          trend: `${stalledTasks} need closer review`,
          accent: 'from-yellow-200 to-yellow-100'
        },
        {
          title: 'Completion Rate',
          value: `${completionRate}%`,
          context: `${finishedTasks} completed or paid tasks recorded`,
          trend: `${overview.tasks.cancelled_tasks} cancellations to monitor`,
          accent: 'from-emerald-200 to-emerald-100'
        },
        {
          title: 'Revenue Overview',
          value: formatCurrency(overview.revenue.total_revenue),
          context: `${overview.payments.successful_payments} successful payments`,
          trend: `${formatCurrency(overview.revenue.average_payment)} average payment`,
          accent: 'from-sky-200 to-indigo-100'
        }
      ]
    : [];

  const attentionItems = [
    {
      title: 'Pending Payments',
      value: pendingPayments,
      description: 'Transactions that are still pending completion and may need payment review.',
      actionLabel: 'Review payment queue',
      icon: CreditCard,
      action: () => setPaymentFilter('pending')
    },
    {
      title: 'Unverified Users',
      value: unverifiedUsers,
      description: 'Accounts that have not completed verification and may need follow-up.',
      actionLabel: 'Review user verification',
      icon: ShieldAlert,
      action: () => setUserFilter('unverified')
    },
    {
      title: 'Unassigned or Stalled Tasks',
      value: stalledTasks,
      description: 'Open and pending tasks that could affect marketplace responsiveness.',
      actionLabel: 'Manage task queue',
      icon: AlertTriangle,
      action: () => setTaskFilter('attention')
    }
  ];

  const filteredUsers = users.filter((account) => {
    const matchesSearch = `${account.first_name} ${account.last_name} ${account.email} ${account.location || ''}`
      .toLowerCase()
      .includes(userSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (userFilter === 'all') return true;
    if (userFilter === 'unverified') return !account.email_verified;
    return account.role === userFilter;
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = `${task.title} ${task.client_name || ''} ${task.minion_name || ''} ${task.location || ''} ${task.category || ''}`
      .toLowerCase()
      .includes(taskSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (taskFilter === 'all') return true;
    if (taskFilter === 'attention') return ['open', 'pending'].includes(task.status);
    return task.status === taskFilter;
  });

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = `${payment.task_title || ''} ${payment.client_name || ''} ${payment.minion_name || ''} ${payment.mpesa_receipt_number || ''}`
      .toLowerCase()
      .includes(paymentSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (paymentFilter === 'all') return true;
    return payment.status === paymentFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <ReviewModal review={selectedReview} onClose={() => setSelectedReview(null)} />
      <TaskCommandCenterModal
        task={selectedTask}
        draft={taskDraft}
        minionOptions={minionOptions}
        disputes={taskDisputes}
        disputeLoading={taskDisputesLoading}
        disputeNote={taskDisputeNote}
        disputeSaving={taskDisputeSaving}
        auditEntries={taskAuditEntries}
        auditLoading={taskAuditLoading}
        saving={taskSaving}
        onClose={closeTaskCommandCenter}
        onDraftChange={handleTaskDraftChange}
        onSave={handleSaveTask}
        onAction={handleTaskAction}
        onDisputeNoteChange={setTaskDisputeNote}
        onDisputeAction={handleDisputeAction}
      />

      <div className="bg-linear-to-r from-minion-blue to-minion-blue-light shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-minion-yellow">Minion Me Control Room</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">Admin Panel</h1>
              <p className="mt-4 max-w-2xl text-base text-blue-50 sm:text-lg">
                Signed in as {user.first_name} {user.last_name}. Review platform health, payments, and operations from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/admin/users')}
                className="rounded-full border-2 border-white/35 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
              >
                Users
              </button>
              <button
                onClick={() => navigate('/admin/disputes')}
                className="rounded-full border-2 border-white/35 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
              >
                Disputes
              </button>
              <button
                onClick={() => loadAdminData(true)}
                disabled={refreshing}
                className="rounded-full border-2 border-minion-yellow/70 bg-white px-5 py-3 font-semibold text-minion-blue transition hover:bg-minion-yellow-light disabled:cursor-not-allowed disabled:opacity-70"
              >
                {refreshing ? 'Refreshing...' : 'Refresh data'}
              </button>
              <button
                onClick={handleLogout}
                className="rounded-full bg-rose-500 px-5 py-3 font-semibold text-white transition hover:bg-rose-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-minion-yellow border-t-minion-blue" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-4 text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && overview && (
          <div className="space-y-8">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => (
                <KpiCard key={kpi.title} {...kpi} />
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  eyebrow="Needs Attention"
                  title="Operational alerts worth reviewing first"
                  description="These counts surface the areas most likely to affect payment flow, account trust, and task throughput."
                />

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {attentionItems.map((item) => (
                    <AttentionCard key={item.title} item={item} onAction={item.action} />
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] bg-linear-to-br from-minion-yellow to-minion-yellow-light p-6 shadow-sm">
                <SectionHeader
                  eyebrow="Revenue Overview"
                  title="Payment health at a glance"
                  description="Track successful payments, pending volume, and average value without repeating the broader KPI story."
                />

                <div className="mt-8 space-y-4">
                  <div className="rounded-[24px] bg-white/70 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-minion-blue">Total revenue</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(overview.revenue.total_revenue)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-[24px] bg-white/70 p-5 shadow-sm">
                      <p className="text-sm font-semibold text-minion-blue">Pending payments</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{overview.payments.pending_payments}</p>
                    </div>
                    <div className="rounded-[24px] bg-white/70 p-5 shadow-sm">
                      <p className="text-sm font-semibold text-minion-blue">Successful payments</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{overview.payments.successful_payments}</p>
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-white/70 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-minion-blue">Average payment</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(overview.revenue.average_payment)}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  eyebrow="Recent Users"
                  title="New accounts entering the platform"
                  description="Professional summary cards keep recent user activity visible without exposing unnecessary detail."
                />

                <div className="mt-8 space-y-4">
                  {overview.recentUsers.map((recentUser) => (
                    <div key={recentUser.id} className="flex items-center justify-between rounded-[24px] border border-slate-200 p-4">
                      <div>
                        <p className="font-bold text-slate-900">
                          {recentUser.first_name} {recentUser.last_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">Joined {new Date(recentUser.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-minion-blue px-3 py-1 text-xs font-bold uppercase text-white">
                          {recentUser.role}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">
                          {recentUser.email_verified ? 'Verified' : 'Needs verification'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  eyebrow="Recent Tasks"
                  title="Newest task activity"
                  description="Keep fresh marketplace work visible with cleaner task cards and more consistent task badges."
                />

                <div className="mt-8 space-y-4">
                  {overview.recentTasks.map((task) => (
                    <div key={task.id} className="rounded-[24px] border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{task.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {task.client_name || 'Unknown client'} • {task.location || 'No location'}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusTone[task.status] || 'bg-slate-100 text-slate-800'}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-emerald-700">{formatCurrency(task.budget)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  eyebrow="Users Directory"
                  title="Accounts and verification status"
                  description="Search and filter the full user list with clearer spacing, stronger headers, and quick review actions."
                />

                <div className="mt-6">
                  <TableToolbar
                    searchValue={userSearch}
                    onSearchChange={(event) => setUserSearch(event.target.value)}
                    filterValue={userFilter}
                    onFilterChange={(event) => setUserFilter(event.target.value)}
                    searchPlaceholder="Search users by name, email, or location"
                    filterOptions={[
                      { value: 'all', label: 'All users' },
                      { value: 'client', label: 'Clients' },
                      { value: 'minion', label: 'Minions' },
                      { value: 'admin', label: 'Admins' },
                      { value: 'unverified', label: 'Unverified only' }
                    ]}
                  />
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="pb-4 pr-6 font-semibold">Name</th>
                        <th className="pb-4 pr-6 font-semibold">Role</th>
                        <th className="pb-4 pr-6 font-semibold">Email</th>
                        <th className="pb-4 pr-6 font-semibold">Location</th>
                        <th className="pb-4 pr-6 font-semibold">Verification</th>
                        <th className="pb-4 pr-6 font-semibold">Activity</th>
                        <th className="pb-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((account) => (
                        <tr key={account.id} className="border-b border-slate-100 align-top">
                          <td className="py-4 pr-6 font-semibold text-slate-900">
                            {account.first_name} {account.last_name}
                          </td>
                          <td className="py-4 pr-6">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">
                              {account.role}
                            </span>
                          </td>
                          <td className="py-4 pr-6 text-slate-600">{account.email}</td>
                          <td className="py-4 pr-6 text-slate-600">{account.location || 'Not set'}</td>
                          <td className="py-4 pr-6">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${account.email_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-800'}`}>
                              {account.email_verified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-4 pr-6 text-slate-600">
                            {account.role === 'client'
                              ? `${account.posted_tasks} tasks posted`
                              : `${account.applications_sent} applications sent`}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {!account.email_verified && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedReview({
                                      title: 'Verify User',
                                      description: `${account.first_name} ${account.last_name} still needs verification review.`,
                                      content: `${account.email} has not completed verification yet. Use this view to follow up with the account and confirm why activation is still pending.`
                                    })
                                  }
                                  className="rounded-xl border border-yellow-200 px-3 py-2 text-xs font-semibold text-yellow-800 transition hover:bg-yellow-50"
                                >
                                  Verify User
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedReview({
                                    title: 'User Details',
                                    description: `${account.first_name} ${account.last_name} account summary`,
                                    content: `${account.first_name} ${account.last_name} is registered as a ${account.role}. Email: ${account.email}. Location: ${account.location || 'Not set'}. Verification: ${account.email_verified ? 'Verified' : 'Pending'}.`
                                  })
                                }
                                className="rounded-xl border border-minion-blue px-3 py-2 text-xs font-semibold text-minion-blue transition hover:bg-blue-50"
                              >
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  eyebrow="Task Register"
                  title="Detailed task operations"
                  description="Search task records, isolate statuses that need review, and keep budget figures readable at a glance."
                />

                <div className="mt-6">
                  <TableToolbar
                    searchValue={taskSearch}
                    onSearchChange={(event) => setTaskSearch(event.target.value)}
                    filterValue={taskFilter}
                    onFilterChange={(event) => setTaskFilter(event.target.value)}
                    searchPlaceholder="Search tasks by title, people, location, or category"
                    filterOptions={[
                      { value: 'all', label: 'All tasks' },
                      { value: 'attention', label: 'Needs attention' },
                      { value: 'open', label: 'Open' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'assigned', label: 'Assigned' },
                      { value: 'in_progress', label: 'In progress' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'paid', label: 'Paid' },
                      { value: 'paused', label: 'Paused' },
                      { value: 'archived', label: 'Archived' },
                      { value: 'cancelled', label: 'Cancelled' }
                    ]}
                  />
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="pb-4 pr-6 font-semibold">Task</th>
                        <th className="pb-4 pr-6 font-semibold">Status</th>
                        <th className="pb-4 pr-6 font-semibold">Client</th>
                        <th className="pb-4 pr-6 font-semibold">Assigned Minion</th>
                        <th className="pb-4 pr-6 font-semibold">Location</th>
                        <th className="pb-4 pr-6 text-right font-semibold">Budget</th>
                        <th className="pb-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task) => (
                        <tr key={task.id} className="border-b border-slate-100 align-top">
                          <td className="py-4 pr-6">
                            <p className="font-semibold text-slate-900">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{task.category || 'Other'}</p>
                          </td>
                          <td className="py-4 pr-6">
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusTone[task.status] || 'bg-slate-100 text-slate-800'}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              {task.has_active_dispute ? (
                                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${disputeStatusTone[task.active_dispute_status] || 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                  Dispute
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-4 pr-6 text-slate-600">{task.client_name || 'Unknown'}</td>
                          <td className="py-4 pr-6 text-slate-600">{task.minion_name || 'Unassigned'}</td>
                          <td className="py-4 pr-6 text-slate-600">{task.location || 'No location'}</td>
                          <td className="py-4 pr-6 text-right font-semibold tabular-nums text-emerald-700">{formatCurrency(task.budget)}</td>
                          <td className="py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openTaskCommandCenter(task)}
                              className="rounded-xl border border-minion-blue px-3 py-2 text-xs font-semibold text-minion-blue transition hover:bg-blue-50"
                            >
                              Manage Task
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  eyebrow="Payment Register"
                  title="Detailed payment operations"
                  description="Search and filter payment records with clearer status badges and aligned currency values."
                />

                <div className="mt-6">
                  <TableToolbar
                    searchValue={paymentSearch}
                    onSearchChange={(event) => setPaymentSearch(event.target.value)}
                    filterValue={paymentFilter}
                    onFilterChange={(event) => setPaymentFilter(event.target.value)}
                    searchPlaceholder="Search payments by task, people, or receipt"
                    filterOptions={[
                      { value: 'all', label: 'All payments' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'success', label: 'Successful' },
                      { value: 'failed', label: 'Failed' }
                    ]}
                  />
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="pb-4 pr-6 font-semibold">Task</th>
                        <th className="pb-4 pr-6 font-semibold">Status</th>
                        <th className="pb-4 pr-6 font-semibold">Client</th>
                        <th className="pb-4 pr-6 font-semibold">Minion</th>
                        <th className="pb-4 pr-6 font-semibold">Receipt</th>
                        <th className="pb-4 pr-6 text-right font-semibold">Amount</th>
                        <th className="pb-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="border-b border-slate-100 align-top">
                          <td className="py-4 pr-6 font-semibold text-slate-900">{payment.task_title || `Task #${payment.task_id}`}</td>
                          <td className="py-4 pr-6">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusTone[payment.status] || 'bg-slate-100 text-slate-800'}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-4 pr-6 text-slate-600">{payment.client_name || 'Unknown'}</td>
                          <td className="py-4 pr-6 text-slate-600">{payment.minion_name || 'Unassigned'}</td>
                          <td className="py-4 pr-6 text-slate-600">{payment.mpesa_receipt_number || 'No receipt yet'}</td>
                          <td className="py-4 pr-6 text-right font-semibold tabular-nums text-emerald-700">{formatCurrency(payment.amount)}</td>
                          <td className="py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedReview({
                                  title: 'Review Payment',
                                  description: `Payment record for ${payment.task_title || `Task #${payment.task_id}`}`,
                                  content: `Status: ${payment.status}. Amount: ${formatCurrency(payment.amount)}. Client: ${payment.client_name || 'Unknown'}. Minion: ${payment.minion_name || 'Unassigned'}. Receipt: ${payment.mpesa_receipt_number || 'No receipt yet'}.`
                                })
                              }
                              className="rounded-xl border border-minion-blue px-3 py-2 text-xs font-semibold text-minion-blue transition hover:bg-blue-50"
                            >
                              Review Payment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
