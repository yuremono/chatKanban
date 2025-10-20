import type { Metadata } from 'next';
import './globals.css';
import 'line-awesome/dist/line-awesome/css/line-awesome.min.css';

export const metadata: Metadata = {
  title: 'Chat Kanban',
  description: 'Chat history Kanban manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}


