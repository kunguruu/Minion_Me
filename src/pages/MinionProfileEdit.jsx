import React, { useMemo, useState } from 'react';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../context/useAuth';
import { useNotification } from '../context/useNotification';
import { authAPI } from '../services/api';

const MAX_PROFILE_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const allowedPhotoTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_DIMENSION = 1200;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to process image.'));
    image.src = src;
  });

const getDataUrlByteSize = (dataUrl) => {
  const base64Content = dataUrl.split(',')[1] || '';
  return Math.floor((base64Content.length * 3) / 4);
};

const compressProfilePhoto = async (file) => {
  const sourceUrl = await fileToDataUrl(file);
  const image = await loadImageElement(sourceUrl);

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    return sourceUrl;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const pngVersion = canvas.toDataURL('image/png');
  if (file.type === 'image/png' && getDataUrlByteSize(pngVersion) <= MAX_PROFILE_PHOTO_SIZE_BYTES) {
    return pngVersion;
  }

  const jpegQualities = [0.82, 0.72, 0.6, 0.5];
  for (const quality of jpegQualities) {
    const jpegVersion = canvas.toDataURL('image/jpeg', quality);
    if (getDataUrlByteSize(jpegVersion) <= MAX_PROFILE_PHOTO_SIZE_BYTES) {
      return jpegVersion;
    }
  }

  return canvas.toDataURL('image/jpeg', 0.4);
};

function MinionProfileEdit() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { notify } = useNotification();
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    skills: user?.skills || '',
    availability: user?.availability || '',
    experience: user?.experience || '',
    profilePhoto: user?.profile_photo_url || null
  });
  const [previewUrl, setPreviewUrl] = useState(user?.profile_photo_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const previewUser = useMemo(
    () => ({
      first_name: formData.firstName,
      last_name: formData.lastName,
      profile_photo_url: previewUrl
    }),
    [formData.firstName, formData.lastName, previewUrl]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!allowedPhotoTypes.includes(file.type)) {
      setError('Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > MAX_SOURCE_FILE_SIZE_BYTES) {
      setError('Please choose an image smaller than 8 MB before upload.');
      return;
    }

    try {
      const nextValue = await compressProfilePhoto(file);
      if (getDataUrlByteSize(nextValue) > MAX_PROFILE_PHOTO_SIZE_BYTES) {
        setError('Processed profile photo is still too large. Please choose a smaller image.');
        return;
      }

      setFormData((current) => ({
        ...current,
        profilePhoto: nextValue
      }));
      setPreviewUrl(nextValue);
      setError('');
    } catch {
      setError('Failed to process the selected image. Please try another file.');
    }

    event.target.value = '';
  };

  const handleRemovePhoto = () => {
    setFormData((current) => ({
      ...current,
      profilePhoto: null
    }));
    setPreviewUrl('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      const response = await authAPI.updateProfile(formData);
      updateUser(response.data);
      notify({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your minion profile was saved successfully.'
      });
      navigate('/minion-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf4_0%,#ffffff_32%,#f7fbff_100%)]">
      <div className="bg-linear-to-r from-minion-yellow to-minion-yellow-light shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/minion-dashboard')}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <ProfileAvatar user={previewUser} size="lg" className="ring-1 ring-black/10" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-minion-blue">Minion Profile</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Edit your profile</h1>
                <p className="mt-2 text-sm text-slate-700 sm:text-base">
                  Update your public details so you match better jobs and look more trustworthy to clients.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white/60 p-5 text-slate-900 shadow-sm">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-minion-blue" />
                <div>
                  <p className="text-sm font-semibold">Photo support enabled</p>
                  <p className="text-xs text-slate-600">Preview, replace, or remove your image before saving.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-minion-blue">Account Details</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">Keep your working profile sharp</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Better details lead to better matches. Your changes will appear on the dashboard right after save.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-minion-yellow/20 px-4 py-3 text-sm font-semibold text-slate-900">
              <Save className="h-4 w-4 text-minion-blue" />
              Protected minion-only page
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Profile Photo</p>
            <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center">
              <div className="h-28 w-28 overflow-hidden rounded-[24px] bg-white shadow-sm">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Camera className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-minion-blue px-4 py-3 text-sm font-semibold text-white transition hover:bg-minion-blue-light">
                  <Camera className="h-4 w-4" />
                  Upload Photo
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Remove Photo
                </button>
                <p className="text-xs leading-6 text-slate-500">
                  Allowed formats: JPG, JPEG, PNG, WEBP. Maximum processed image size: 2 MB.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ['firstName', 'First name', 'text'],
              ['lastName', 'Last name', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Phone', 'tel'],
              ['location', 'Location', 'text'],
              ['availability', 'Availability', 'text']
            ].map(([name, label, type]) => (
              <label key={name} className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
                <input
                  name={name}
                  type={type}
                  value={formData[name]}
                  onChange={handleChange}
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-minion-blue"
                  required={name === 'firstName' || name === 'lastName' || name === 'email'}
                />
              </label>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Skills</span>
              <input
                name="skills"
                type="text"
                value={formData.skills}
                onChange={handleChange}
                placeholder="Cleaning, Delivery, Moving"
                className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-minion-blue"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Experience</span>
              <textarea
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-minion-blue"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-minion-yellow px-5 py-3 font-semibold text-slate-950 transition hover:bg-minion-yellow-light disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/minion-dashboard')}
              className="inline-flex items-center justify-center rounded-2xl border border-minion-blue px-5 py-3 font-semibold text-minion-blue transition hover:bg-blue-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MinionProfileEdit;
