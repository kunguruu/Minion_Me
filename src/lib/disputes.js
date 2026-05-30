export const disputeReasonOptions = [
  { value: 'scope_change', label: 'Scope changed' },
  { value: 'work_quality', label: 'Work quality issue' },
  { value: 'delay_or_no_show', label: 'Delay or no-show' },
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'communication_issue', label: 'Communication issue' },
  { value: 'other', label: 'Other' }
];

export const disputeStatusLabels = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  rejected: 'Rejected'
};

export const disputeStatusTone = {
  open: 'bg-rose-100 text-rose-700 border-rose-200',
  under_review: 'bg-amber-100 text-amber-900 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-slate-200 text-slate-800 border-slate-300'
};

export const formatDisputeReason = (reason) =>
  disputeReasonOptions.find((option) => option.value === reason)?.label
  || reason?.replace(/_/g, ' ')
  || 'Unknown';
