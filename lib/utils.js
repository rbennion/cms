import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function generateUniqueFilename(originalName) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalName.split('.').pop()
  // Keep a sanitized version of the original name so it can be shown in the UI
  const base = originalName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
  return `${timestamp}-${random}${base ? `-${base}` : ''}.${ext}`
}

export function parseAttachmentName(path) {
  if (!path) return null
  const basename = path.split('/').pop()
  const withoutPrefix = basename.replace(/^\d+-[a-z0-9]{6}-?/, '')
  if (withoutPrefix && withoutPrefix.includes('.') && !withoutPrefix.startsWith('.')) {
    return withoutPrefix
  }
  const ext = basename.split('.').pop()
  return ext ? `Document.${ext}` : 'Document'
}

export function formatFileSize(bytes) {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
