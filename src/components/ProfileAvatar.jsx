import React from 'react';
import { UserCircle2 } from 'lucide-react';

function ProfileAvatar({ user, size = 'md', className = '' }) {
  const initials = `${user?.first_name?.[0] || user?.firstName?.[0] || 'C'}${user?.last_name?.[0] || user?.lastName?.[0] || ''}`.toUpperCase();

  const sizeClasses = {
    sm: 'h-12 w-12 text-sm',
    md: 'h-16 w-16 text-xl',
    lg: 'h-24 w-24 text-2xl'
  };

  const resolvedSize = sizeClasses[size] || sizeClasses.md;

  if (user?.profile_photo_url) {
    return (
      <img
        src={user.profile_photo_url}
        alt={`${user?.first_name || user?.firstName || 'Client'} profile`}
        className={`${resolvedSize} rounded-2xl object-cover shadow-lg ${className}`.trim()}
      />
    );
  }

  return (
    <div
      className={`${resolvedSize} flex items-center justify-center rounded-2xl bg-white/15 font-black text-white shadow-lg ring-1 ring-white/20 backdrop-blur ${className}`.trim()}
    >
      {initials || <UserCircle2 className="h-8 w-8" />}
    </div>
  );
}

export default ProfileAvatar;
