import React from 'react';
import { ImagePlus, Mail, MapPin, Phone, Trash2, User } from 'lucide-react';

function ClientProfileForm({
  formData,
  previewUrl,
  saving,
  error,
  onChange,
  onPhotoChange,
  onRemovePhoto,
  onSubmit,
  onCancel
}) {
  const fields = [
    { name: 'firstName', label: 'First name', icon: User, type: 'text' },
    { name: 'lastName', label: 'Last name', icon: User, type: 'text' },
    { name: 'email', label: 'Email', icon: Mail, type: 'email' },
    { name: 'phone', label: 'Phone', icon: Phone, type: 'tel' },
    { name: 'location', label: 'Location', icon: MapPin, type: 'text' }
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Profile Photo</p>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center">
          <div className="h-28 w-28 overflow-hidden rounded-[24px] bg-white shadow-sm">
            {previewUrl ? (
              <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <ImagePlus className="h-10 w-10" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-minion-blue px-4 py-3 text-sm font-semibold text-white transition hover:bg-minion-blue-light">
              <ImagePlus className="h-4 w-4" />
              Upload Photo
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onPhotoChange}
              />
            </label>
            <button
              type="button"
              onClick={onRemovePhoto}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove Photo
            </button>
            <p className="text-xs leading-6 text-slate-500">
              Allowed formats: JPG, JPEG, PNG, WEBP. Maximum file size: 2 MB.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const Icon = field.icon;

          return (
            <label key={field.name} className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Icon className="h-4 w-4 text-minion-blue" />
                {field.label}
              </span>
              <input
                name={field.name}
                type={field.type}
                value={formData[field.name]}
                onChange={onChange}
                className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-minion-blue"
                required={field.name === 'firstName' || field.name === 'lastName' || field.name === 'email'}
              />
            </label>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl bg-minion-yellow px-5 py-3 font-semibold text-slate-950 transition hover:bg-minion-yellow-light disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-2xl border border-minion-blue px-5 py-3 font-semibold text-minion-blue transition hover:bg-blue-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default ClientProfileForm;
