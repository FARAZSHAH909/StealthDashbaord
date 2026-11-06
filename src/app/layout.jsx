import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { KeyVaultProvider } from "@/lib/encryption/KeyVaultContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export const metadata = {
  title: "Stealth Admin Dashboard | Production Security & Analytics",
  description: "Secure, Web Crypto AES-256-GCM compliant monitoring dashboard with real-time Firebase synchronization.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0c1317] text-slate-100 min-h-screen selection:bg-emerald-500 selection:text-white">
        <ErrorBoundary>
          <AuthProvider>
            <KeyVaultProvider>
              {children}
            </KeyVaultProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

