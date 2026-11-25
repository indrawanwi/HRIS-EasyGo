import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'HRIS EasyGo — Enterprise HR & Indonesian Regulatory Payroll',
  description: 'Production HRIS System built with Next.js, Express, Neon PostgreSQL, PP 35/2021 & PP 58/2023 TER Compliance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
