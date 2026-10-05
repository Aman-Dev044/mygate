import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'MyGate Clone - Society Management',
  description: 'Visitor approval, daily help, bills, complaints, amenities, notices and kid safety for gated communities',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
