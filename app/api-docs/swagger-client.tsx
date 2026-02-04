'use client'

import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function SwaggerClient() {
  // Use the API URL from environment or construct from window.location
  const apiUrl = process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/swagger`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/api/swagger`

  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI url={apiUrl} />
    </div>
  )
}
