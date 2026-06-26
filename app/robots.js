// app/robots.js
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/maintenance'],
      },
    ],
    sitemap: 'https://dreamseat.vercel.app/sitemap.xml',
  };
}