import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SyllabusIQ — Board Exam Tracker',
    short_name: 'SyllabusIQ',
    description: 'Adaptive progress tracker for Philippine board exam reviewers',
    start_url: '/syllabus',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#040f24',
    theme_color: '#03256c',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Log a Session',
        short_name: 'Log',
        description: 'Quickly log a study session',
        url: '/log',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Syllabus Tree',
        short_name: 'Syllabus',
        description: 'Browse your exam syllabus',
        url: '/syllabus',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
