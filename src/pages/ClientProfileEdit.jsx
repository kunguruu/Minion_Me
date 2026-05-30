import React, { useMemo, useState } from 'react';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClientProfileForm from '../components/ClientProfileForm';
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

function ClientProfileEdit() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { notify } = useNotification();
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
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

      const response = await authAPI.updateClientProfile(formData);
      updateUser(response.data);
      notify({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your client profile was saved successfully.'
      });
      navigate('/client-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_32%,#fffdf4_100%)]">
      <div className="bg-linear-to-r from-minion-blue to-minion-blue-light shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/client-dashboard')}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <ProfileAvatar user={previewUser} size="lg" className="ring-1 ring-white/20" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-minion-yellow">Client Profile</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Edit your profile</h1>
                <p className="mt-2 text-sm text-blue-50 sm:text-base">
                  Update your contact information and profile photo so minions can recognize and coordinate with you easily.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] bg-white/10 p-5 text-white backdrop-blur">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-minion-yellow" />
                <div>
                  <p className="text-sm font-semibold">Photo support enabled</p>
                  <p className="text-xs text-blue-100">Preview, replace, or remove your image before saving.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-minion-blue">Account Details</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">Keep your client profile current</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your details are pre-filled from your existing account and will update on the dashboard immediately after save.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-minion-yellow/20 px-4 py-3 text-sm font-semibold text-slate-900">
              <Save className="h-4 w-4 text-minion-blue" />
              Protected client-only page
            </div>
          </div>

          <ClientProfileForm
            formData={formData}
            previewUrl={previewUrl}
            saving={saving}
            error={error}
            onChange={handleChange}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={handleRemovePhoto}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/client-dashboard')}
          />
        </div>
      </div>
    </div>
  );
}

export default ClientProfileEdit;
