import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function PasswordInput({
  className = '',
  inputClassName = '',
  buttonClassName = '',
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;
  const ariaLabel = visible ? 'Hide password' : 'Show password';

  return (
    <div className={`relative ${className}`.trim()}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`w-full pr-12 ${inputClassName}`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={ariaLabel}
        aria-pressed={visible}
        className={`absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-slate-500 transition hover:text-minion-blue focus:outline-none ${buttonClassName}`.trim()}
      >
        <ToggleIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export default PasswordInput;
