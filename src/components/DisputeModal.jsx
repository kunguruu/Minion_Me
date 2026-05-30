import React from 'react';
import { disputeReasonOptions } from '../lib/disputes';

function DisputeModal({
  open,
  taskTitle,
  form,
  submitting,
  onClose,
  onChange,
  onSubmit
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 w-full max-w-2xl rounded-[28px] border border-minion-blue/20 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Raise Dispute</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">{taskTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Share the issue clearly so the admin team can review the task lifecycle and step in quickly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close dispute form"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Reason</span>
            <select
              value={form.reason}
              onChange={(event) => onChange('reason', event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
            >
              {disputeReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
              rows={5}
              placeholder="Give a short factual summary of what happened."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-minion-blue"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-2xl bg-minion-yellow px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-minion-yellow-light disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Submitting...' : 'Submit Dispute'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DisputeModal;
