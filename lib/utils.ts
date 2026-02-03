import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize search query for consistent caching
 */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Highlight search terms in text content
 * Returns text with <mark> tags around matching terms
 */
export function highlightSearchTerms(content: string, query: string): string {
  if (!query || !content) return content

  // Split query into individual terms
  const terms = query
    .split(/\s+/)
    .filter((term) => term.length > 2) // Ignore very short terms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape regex chars

  if (terms.length === 0) return content

  // Create regex pattern to match any of the terms (case-insensitive)
  const pattern = new RegExp(`(${terms.join('|')})`, 'gi')

  // Replace matches with <mark> tags
  return content.replace(pattern, '<mark>$1</mark>')
}

/**
 * Extract a snippet of text around the search term
 * Returns a truncated excerpt with context
 */
export function extractSnippet(
  content: string,
  query: string,
  maxLength: number = 300
): string {
  if (!query || !content) {
    // No query, return beginning of content
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content
  }

  const normalizedContent = content.toLowerCase()
  const normalizedQuery = query.toLowerCase().split(/\s+/)[0] // Use first term

  const index = normalizedContent.indexOf(normalizedQuery)

  if (index === -1) {
    // Term not found, return beginning
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content
  }

  // Calculate snippet boundaries
  const contextLength = Math.floor((maxLength - query.length) / 2)
  let start = Math.max(0, index - contextLength)
  let end = Math.min(content.length, index + query.length + contextLength)

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = content.lastIndexOf(' ', start)
    if (spaceIndex !== -1 && spaceIndex > start - 20) {
      start = spaceIndex + 1
    }
  }

  if (end < content.length) {
    const spaceIndex = content.indexOf(' ', end)
    if (spaceIndex !== -1 && spaceIndex < end + 20) {
      end = spaceIndex
    }
  }

  const snippet = content.substring(start, end)
  return (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : '')
}

/**
 * Generate a shareable URL for a section
 */
export function generateSectionUrl(
  baseUrl: string,
  documentId: string,
  sectionId: string
): string {
  return `${baseUrl}/section/${documentId}/${sectionId}`
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}
