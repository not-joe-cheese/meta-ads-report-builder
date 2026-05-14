import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function assetPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  if (!path.startsWith('/')) return path
  return `${basePath}${path}`
}
