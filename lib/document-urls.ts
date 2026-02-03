/**
 * Get the general category URL for a document based on its type/subtype
 */
export function getCategoryUrl(type: string, subType?: string | null): string {
  const urls: Record<string, string> = {
    'DPA': 'https://privacy.gov.ph/data-privacy-act/',
    'IRR': 'https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/#1',
    'ADVISORY': 'https://privacy.gov.ph/pips-and-pics/advisories-circulars/',
    'CIRCULAR': 'https://privacy.gov.ph/pips-and-pics/advisories-circulars/',
    'DECISION': 'https://privacy.gov.ph/decisions-2/',
    'ORDER': 'https://privacy.gov.ph/orders-2/',
    'RESOLUTION': 'https://privacy.gov.ph/resolutions/',
  }

  // For ISSUANCE type, use subType to determine URL
  if (type === 'ISSUANCE' && subType) {
    return urls[subType] || urls['ADVISORY']
  }

  return urls[type] || 'https://privacy.gov.ph/'
}

/**
 * Get local download URL for a PDF file
 */
export function getDownloadUrl(filePath: string): string {
  // Remove 'data/' prefix if present
  const cleanPath = filePath.replace(/^data[\/\\]/, '')
  // Convert backslashes to forward slashes
  const normalizedPath = cleanPath.replace(/\\/g, '/')
  return `/api/download/${normalizedPath}`
}
