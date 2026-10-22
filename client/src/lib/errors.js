export const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error?.response) return "Cannot reach the server. Try again.";
  return error.response.data?.message || fallback;
};

export const getFieldErrors = (error) => {
  const list = error?.response?.data?.errors;
  if (!Array.isArray(list)) return {};

  return list.reduce((fields, entry) => {
    if (entry?.field && !fields[entry.field]) {
      fields[entry.field] = entry.message;
    }
    return fields;
  }, {});
};
