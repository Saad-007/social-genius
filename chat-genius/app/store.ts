export const SharedData = {
  requestPayload: null as any,
  aiResult: null as any,
  userProfile: { name: '', email: '', photoUrl: null } as any,
  isLoggingOut: false,
  isProUser: false,          // 👈 NEW

  clearSession() {
    this.requestPayload = null;
    this.aiResult = null;
    this.userProfile = { name: '', email: '', photoUrl: null };
    this.isProUser = false;  // 👈 ab cast nahi chahiye
    this.isLoggingOut = false;
  },
};
// 🔴 WARNING FIX
export default function IgnoreStoreScreen() { return null; }