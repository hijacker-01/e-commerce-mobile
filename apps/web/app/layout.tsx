import './globals.css';
import type { ReactNode } from 'react';
import Nav from '../components/Nav';

export const metadata = {
  title: 'Electronics Store',
  description: 'Smart electronics marketplace with AI device intelligence',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
