// app/sitemap.js
export default function sitemap() {
  const baseUrl = 'https://dreamseat.vercel.app';
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/how-to-use`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}