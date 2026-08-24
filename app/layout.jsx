import './globals.css';
import { APP_BRAND } from '@/lib/appBrand'

export default function RootLayout({ children }) {
	return (
		<html lang="en">
      <body className="min-h-screen bg-zinc-100 font-sans text-zinc-950 antialiased">
				{children}
			</body>
		</html>
	);
}

export const metadata = {
  title: {
    default: APP_BRAND,
    template: `%s | ${APP_BRAND}`,
  },
  description: 'Construction earned-value reporting and project dashboards.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
}
