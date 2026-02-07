import type { Metadata } from "next"
import { Inter } from "next/font/google"
import GoogleAnalytics from "@/components/GoogleAnalytics"
import "./globals.css"

// Force dynamic rendering to ensure environment variables are read at runtime in Docker
export const dynamic = "force-dynamic"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://silip.sanchez.ph"),
  title: "SILIP - Philippine Data Privacy Search",
  description: "Searchable Interface for Legal Information & Privacy - A powerful search engine for Philippine Data Privacy laws, NPC circulars, and legal documents with AI-powered insights.",
  keywords: ["Data Privacy", "Philippines", "DPA", "NPC", "Legal Search", "Data Privacy Act", "IRR", "GDPR", "Privacy Law"],
  authors: [{ name: "SILIP" }],

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://silip.tildemark.com",
    siteName: "SILIP",
    title: "SILIP - Philippine Data Privacy Search Engine",
    description: "Search through the Data Privacy Act of 2012, Implementing Rules and Regulations, and NPC Circulars with instant results and AI-powered insights.",
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "SILIP - Philippine Data Privacy Search Engine",
    description: "Search through the Data Privacy Act of 2012, Implementing Rules and Regulations, and NPC Circulars with instant results and AI-powered insights.",
    creator: "@tildemark",
  },

  // Additional metadata
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification
  verification: {
    google: "your-google-verification-code", // Replace with actual code
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <GoogleAnalytics />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
