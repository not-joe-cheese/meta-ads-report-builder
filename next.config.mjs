import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  turbopack: {
    root: __dirname,
  },
  basePath: process.env.NEXT_BASE_PATH ?? '',
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_BASE_PATH ?? '',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
