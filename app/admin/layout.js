// app/admin/layout.js

export const metadata = {
  title: 'Admin',
  description: 'Internal admin panel',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-snippet': -1,
      'max-image-preview': 'none',
      'max-video-preview': -1,
    }
  },
  // Override the openGraph from root layout to prevent any sharing previews
  openGraph: {
    title: 'Admin',
    description: '',
    images: []
  },
  twitter: {
    card: 'summary',
    title: 'Admin',
    description: ''
  },
  // Prevent canonical URL inheritance
  alternates: {
    canonical: null
  }
};

export default function AdminLayout({ children }) {
  return <>{children}</>;
}