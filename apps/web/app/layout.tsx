import './globals.css';
import type { ReactNode } from 'react';
import Nav from '../components/Nav';
import Toaster from '../components/Toaster';
import CompareBar from '../components/CompareBar';

export const metadata = {
  title: 'Voltora·Store — Smart Electronics',
  description: 'Smart electronics marketplace with AI device intelligence',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <div className="container">{children}</div>
        <CompareBar />
        <Toaster />
      </body>
    </html>
  );
}
