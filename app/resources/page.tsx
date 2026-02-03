'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Database, FileText, Tags, Calendar, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface IngestionLog {
  id: string
  source: string
  sourceUrl: string | null
  docType: string
  status: string
  sectionsCount: number
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

interface Statistics {
  totalDocuments: number
  totalSections: number
  totalTags: number
  documentsByType: Array<{ type: string; count: number }>
  issuancesBySubType: Array<{ subType: string; count: number }>
}

interface RecentDocument {
  id: string
  type: string
  title: string
  alias: string
  url: string | null
  createdAt: string
  _count: {
    sections: number
  }
}

interface ResourcesData {
  ingestionLogs: IngestionLog[]
  statistics: Statistics
  recentDocuments: RecentDocument[]
}

export default function ResourcesPage() {
  const [data, setData] = useState<ResourcesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/resources')
      if (!response.ok) throw new Error('Failed to fetch resources')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError('Failed to load resources')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'IN_PROGRESS':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      COMPLETED: 'default',
      FAILED: 'destructive',
      IN_PROGRESS: 'secondary',
      PENDING: 'secondary',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  const getDocTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      DPA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      IRR: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      ISSUANCE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    }
    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {type}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">Database Resources</h1>
          <p className="text-muted-foreground mt-2">
            View ingested legal documents and ingestion history
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">{error}</p>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-8">
            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.statistics.totalDocuments}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.statistics.totalSections}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
                  <Tags className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.statistics.totalTags}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingestion Runs</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.ingestionLogs.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Documents by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Documents by Type</CardTitle>
                <CardDescription>Breakdown of legal documents in the database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Main types */}
                  <div className="flex gap-6">
                    {data.statistics.documentsByType.map((stat) => (
                      <div key={stat.type} className="flex items-center gap-2">
                        {getDocTypeBadge(stat.type)}
                        <span className="text-2xl font-bold">{stat.count}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Issuance breakdown */}
                  {data.statistics.issuancesBySubType.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Issuance Breakdown:</h4>
                      <div className="flex flex-wrap gap-4">
                        {data.statistics.issuancesBySubType.map((stat) => (
                          <div key={stat.subType} className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {stat.subType === 'UNSPECIFIED' ? 'Other' : stat.subType.charAt(0) + stat.subType.slice(1).toLowerCase()}
                            </Badge>
                            <span className="text-lg font-semibold">{stat.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>Last 10 legal documents added to the database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getDocTypeBadge(doc.type)}
                          <h3 className="font-semibold">{doc.alias}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{doc.title}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{doc._count.sections} sections</span>
                          <span>•</span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Source
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Ingestion History */}
            <Card>
              <CardHeader>
                <CardTitle>Ingestion History</CardTitle>
                <CardDescription>Complete log of all data ingestion operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.ingestionLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No ingestion logs yet. Run your first ingestion script to populate the database.
                    </p>
                  ) : (
                    data.ingestionLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between p-4 rounded-lg border"
                      >
                        <div className="flex gap-3 flex-1">
                          <div className="mt-1">{getStatusIcon(log.status)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{log.source}</h3>
                              {getDocTypeBadge(log.docType)}
                              {getStatusBadge(log.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span>Started: {formatDate(log.startedAt)}</span>
                              {log.completedAt && (
                                <>
                                  <span>•</span>
                                  <span>Completed: {formatDate(log.completedAt)}</span>
                                </>
                              )}
                            </div>
                            {log.status === 'COMPLETED' && (
                              <p className="text-sm text-green-600 dark:text-green-400">
                                ✓ Ingested {log.sectionsCount} section{log.sectionsCount !== 1 ? 's' : ''}
                              </p>
                            )}
                            {log.errorMessage && (
                              <p className="text-sm text-red-600 dark:text-red-400">
                                Error: {log.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                        {log.sourceUrl && (
                          <a
                            href={log.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Source
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
