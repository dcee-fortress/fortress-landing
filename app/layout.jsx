import './globals.css';
import { APP_BRAND } from '@/lib/appBrand'

export default function RootLayout({ children }) {
	return (
		<html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased" style={{ backgroundColor: "#f4f4f5", color: "#09090b" }} suppressHydrationWarning>
				{children}
			</body>
    </html>
	);
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
