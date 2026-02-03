'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const SwaggerUIComponent = dynamic(
  () => import('./swagger-client'),
  { ssr: false, loading: () => <div className="min-h-screen bg-white flex items-center justify-center">Loading API documentation...</div> }
)

export default function ApiDocsPage() {
  return <SwaggerUIComponent />
}
