'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Loader2, Tag as TagIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { prisma } from '@/lib/db'
import { highlightSearchTerms } from '@/lib/utils'

interface Section {
  id: string
  sectionNum: string
  title: string
  content: string
  document: {
    id: string
    title: string
    alias: string
    type: string
    subType?: string | null
    url: string | null
  }
  tags: Array<{
    id: string
    name: string
    description: string | null
  }>
  createdAt: string
  updatedAt: string
}

export default function SectionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [section, setSection] = useState<Section | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const query = searchParams.get('q') || ''

  useEffect(() => {
    async function fetchSection() {
      try {
        const response = await fetch(`/api/section/${params.id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Section not found')
          } else {
            setError('Failed to load section')
          }
          return
        }

        const data = await response.json()
        setSection(data)
      } catch (err) {
        console.error('Error fetching section:', err)
        setError('An error occurred while loading the section')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSection()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-32" />
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !section) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
                <CardDescription>{error || 'Section not found'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/">
                  <Button>Return to Search</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Section Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{section.document.type}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Section {section.sectionNum}
                    </span>
                  </div>
                  <CardTitle className="text-2xl">{section.title}</CardTitle>
                  <CardDescription>{section.document.title}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6 space-y-6">
              {/* Content */}
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <div className="space-y-4 text-base leading-relaxed">
                  {section.content.split('\n\n').map((paragraph, idx) => {
                    const trimmed = paragraph.trim()
                    if (!trimmed) return null
                    
                    // Apply highlighting if query exists
                    const highlighted = query ? highlightSearchTerms(trimmed, query) : trimmed
                    
                    // Check if it's a list item
                    if (trimmed.match(/^[\(（]?[a-z0-9]+[\)）]/i) || trimmed.match(/^[\(（]?[ivxlcdm]+[\)）]/i) || trimmed.match(/^[•·\-\*]/)) {
                      return (
                        <div key={idx} className="pl-6 space-y-2">
                          {trimmed.split('\n').map((line, lineIdx) => {
                            const cleanLine = line.replace(/^[\(（]?[a-z0-9ivxlcdm]+[\)）]?\s*/i, '').replace(/^[•·\-\*]\s*/, '')
                            const highlightedLine = query ? highlightSearchTerms(cleanLine, query) : cleanLine
                            return (
                              <div key={lineIdx} className="flex gap-2">
                                <span className="text-muted-foreground flex-shrink-0">•</span>
                                <span className="flex-1" dangerouslySetInnerHTML={{ __html: highlightedLine }} />
                              </div>
                            )
                          })}
                        </div>
                      )
                    }
                    
                    // Regular paragraph
                    return (
                      <p key={idx} className="text-justify" dangerouslySetInnerHTML={{ __html: highlighted }} />
                    )
                  })}
                </div>
              </div>

              {/* Tags */}
              {section.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TagIcon className="h-4 w-4" />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {section.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline" title={tag.description || undefined}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Document Link */}
              {section.document.url && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Source Document</span>
                    <div className="flex gap-2">
                      <Link href={section.document.url} target="_blank">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </Link>
                      <Link 
                        href={
                          section.document.type === 'DPA' 
                            ? 'https://privacy.gov.ph/data-privacy-act/'
                            : section.document.type === 'IRR'
                            ? 'https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/#1'
                            : section.document.type === 'ISSUANCE' && section.document.subType
                            ? {
                                'ADVISORY': 'https://privacy.gov.ph/pips-and-pics/advisories-circulars/',
                                'CIRCULAR': 'https://privacy.gov.ph/pips-and-pics/advisories-circulars/',
                                'DECISION': 'https://privacy.gov.ph/decisions-2/',
                                'ORDER': 'https://privacy.gov.ph/orders-2/',
                                'RESOLUTION': 'https://privacy.gov.ph/resolutions/',
                              }[section.document.subType] || 'https://privacy.gov.ph/'
                            : 'https://privacy.gov.ph/'
                        }
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View on NPC Website
                        </Button>
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {/* Metadata */}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <div className="font-medium">Created</div>
                  <div>{new Date(section.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-medium">Last Updated</div>
                  <div>{new Date(section.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center">
            <Link href="/">
              <Button variant="outline">
                Return to Search
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
