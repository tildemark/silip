import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SILIP - Philippine Data Privacy Search",
  description: "Searchable Interface for Legal Information & Privacy - A powerful search engine for Philippine Data Privacy laws",
  keywords: ["Data Privacy", "Philippines", "DPA", "NPC", "Legal Search"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
