export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_HINT = "8 to 72 bytes, with a letter and a number.";

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const GENDER_CHOICES = GENDER_OPTIONS.filter(
  (option) => option.value !== "prefer_not_to_say"
);

export const validateName = (value) => {
  const name = value.trim();
  if (name.length < 2) return "Name must be at least 2 characters";
  if (name.length > 60) return "Name must be at most 60 characters";
  return "";
};

export const validateAge = (value) => {
  const age = Number(value);
  if (!value && value !== 0) return "Age is required";
  if (!Number.isInteger(age)) return "Age must be a whole number";
  if (age < 1) return "Age must be at least 1";
  if (age > 150) return "Age must be at most 150";
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
