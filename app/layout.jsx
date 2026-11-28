import './globals.css'
import { APP_BRAND } from '@/lib/appBrand'
import OfflineAppBootstrap from '@/components/project/OfflineAppBootstrap'

export default function RootLayout({ children }) {
	return (
		<html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased" style={{ backgroundColor: "#f4f4f5", color: "#09090b" }} suppressHydrationWarning>
        <OfflineAppBootstrap />
				{children}
			</body>
    </html>
	)
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#18181b",
}

export const metadata = {
  title: {
    default: APP_BRAND,
    template: `%s | ${APP_BRAND}`,
  },
  description:
    'Rodcroft quantity survey and project dashboards — install to your home screen and keep working offline.',
  applicationName: APP_BRAND,
  appleWebApp: {
    capable: true,
    title: APP_BRAND,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/rodcroft-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/rodcroft-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/rodcroft-192.png', sizes: '192x192', type: 'image/png' }],
  },
}
