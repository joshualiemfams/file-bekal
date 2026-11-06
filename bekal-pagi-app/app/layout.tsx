import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bekal Pagi Mobile',
  description: 'Manajemen member, barang titipan, retur, dan pembayaran Bekal Pagi.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
