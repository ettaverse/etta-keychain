export const isPasswordValid = (password: string): boolean => {
  // Check if password meets minimum requirements
  if (!password || password.length < 8) {
    return false;
  }
  
  // Additional password validation can be added here
  // For now, just check minimum length
  return true;
};