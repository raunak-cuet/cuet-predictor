// app/robots.js
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/admin/*',
          '/api/',
          '/api/*',
          '/maintenance',
          '/maintenance/*'
        ],
      },
    ],
    sitemap: 'https://dreamseat.vercel.app/sitemap.xml',
    host: 'https://dreamseat.vercel.app',
  };
}