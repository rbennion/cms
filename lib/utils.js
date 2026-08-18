import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// The upload ceiling lives here because it is enforced twice — once in the
// browser for a useful message, and again on the token the server issues, which
// is what actually stops an oversized file. Two copies drift; one does not.
export const MAX_UPLOAD_MB = 100
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export function fileTooLargeMessage(file) {
  const mb = (file.size / (1024 * 1024)).toFixed(1)
  return `This file is ${mb} MB — the limit is ${MAX_UPLOAD_MB} MB. Try a smaller scan or a compressed photo.`
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// A bare 'YYYY-MM-DD' is a calendar date. `new Date('2026-07-07')` reads it as
// UTC midnight, which is the evening of the 6th in every US timezone — so the
// day a user picks comes back a day earlier. Build these at local midnight
// instead. Full timestamps are left to the normal parser.
export function parseDateValue(date) {
  if (date instanceof Date) return date
  if (typeof date === 'string') {
    const parts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (parts) return new Date(+parts[1], +parts[2] - 1, +parts[3])
  }
  return new Date(date)
}

// Today as 'YYYY-MM-DD' in the user's own timezone (toISOString would give the
// UTC day, which is already tomorrow for evening users in the Americas).
export function todayDateValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function formatDate(date) {
  if (!date) return ''
  return parseDateValue(date).toLocaleDateString('en-US', {
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
