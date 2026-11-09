import './globals.css';

export const metadata = {
  title: 'ialeads · Mood Industrial Growth',
  description: 'Captura, filtro y seguimiento de leads industriales.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
