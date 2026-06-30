import './globals.css';
import type { ReactNode } from 'react';
import Nav from '../components/Nav';
import Toaster from '../components/Toaster';
import CompareBar from '../components/CompareBar';
import SaleAlert from '../components/SaleAlert';

export const metadata = {
  title: 'Prakash Mobile — Smart Electronics',
  description: 'Prakash Mobile, Mannat Complex, Gadarwara — smart electronics with AI device intelligence',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <SaleAlert />
        <div className="container">{children}</div>
        <CompareBar />
        <Toaster />
      </body>
    </html>
  );
}
