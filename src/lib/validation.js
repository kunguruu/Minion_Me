export const NAME_INPUT_PATTERN = "[a-zA-Z\\s'-]+";
export const KENYAN_PHONE_INPUT_PATTERN = "\\+?254[0-9]{9}";

const nameRegex = /^[a-zA-Z\s'-]+$/;
const kenyanPhoneRegex = /^\+?254[0-9]{9}$/;
const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;

const validateName = (value, label) => {
  const trimmedValue = (value || "").trim();
  if (!nameRegex.test(trimmedValue) || trimmedValue.length < 2 || trimmedValue.length > 50) {
    return `${label} must be 2-50 characters and only contain letters, spaces, hyphens, and apostrophes.`;
  }
  return null;
};

const validateOptionalKenyanPhone = (phone) => {
  if (phone && !kenyanPhoneRegex.test(phone)) {
    return "Phone number must be a valid Kenyan format (e.g., +254712345678).";
  }
  return null;
};

const validateStrongPassword = (password) => {
  const value = password || "";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(value)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(value)) return "Password must include at least one lowercase letter.";
  if (!/\d/.test(value)) return "Password must include at least one number.";
  if (!specialCharRegex.test(value)) return "Password must include at least one special character.";
  return null;
};

export const validateSharedSignupFields = ({ firstName, lastName, phone, password }) => {
  return (
    validateName(firstName, "First name") ||
    validateName(lastName, "Last name") ||
    validateOptionalKenyanPhone(phone) ||
    validateStrongPassword(password)
  );
};

export const validatePasswordReset = ({ password, confirmPassword }) => {
  return (
    validateStrongPassword(password) ||
    ((password || "") !== (confirmPassword || "") ? "Passwords do not match." : null)
  );
};
