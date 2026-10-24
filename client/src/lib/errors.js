const NETWORK_MESSAGE = "Cannot reach the server. Try again.";
const RATE_LIMIT_MESSAGE = "Too many requests. Try again in a minute.";

export const getErrorMessage = (error, fallback = "Something went wrong. Try again.") => {
  if (!error?.response) return NETWORK_MESSAGE;

  const { status, data } = error.response;
  if (status === 429) return data?.message || RATE_LIMIT_MESSAGE;
  if (data?.message) return data.message;

  return fallback;
};

export const getFieldErrors = (error) => {
  const list = error?.response?.data?.errors;
  if (!Array.isArray(list)) return {};

  return list.reduce((fields, fieldError) => {
    if (fieldError?.field && !fields[fieldError.field]) {
      fields[fieldError.field] = fieldError.message;
    }
    return fields;
  }, {});
};

export const getErrorCode = (error) => error?.response?.data?.code || "";
