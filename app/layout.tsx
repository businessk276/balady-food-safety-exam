import './globals.css';

export const metadata = {
  title: 'Balady Exam - Food Safety Training',
  description: 'Food safety practice exam and question management.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
