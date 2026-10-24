export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_HINT =
  "8 to 72 characters, with at least one letter and one number.";

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const validateName = (value) => {
  const name = value.trim();
  if (name.length < 2) return "Name must be at least 2 characters";
  if (name.length > 60) return "Name must be at most 60 characters";
  return "";
};

export const validateEmail = (value) => {
  if (!value.trim()) return "Email is required";
  if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email";
  return "";
};

export const validatePassword = (value) => {
  if (value.length < 8) return "Password must be at least 8 characters";
  if (value.length > 72) return "Password must be at most 72 characters";
  if (new TextEncoder().encode(value).length > 72) {
    return "Password must be at most 72 bytes";
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return "Use at least one letter and one number";
  }
  return "";
};

export const isBusinessDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
