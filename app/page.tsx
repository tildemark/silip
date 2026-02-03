'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, Copy, Check, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { SearchFilter, SearchResult } from '@/lib/search'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('ALL')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      return
    }

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        q: query,
        filter: filter,
      })

      const response = await fetch(`/api/search?${params}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      console.error('Search error:', err)
      setError('An error occurred while searching. Please try again.')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [query, filter])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }, [performSearch])

  const handleCopyLink = useCallback(async (sectionId: string) => {
    const url = `${window.location.origin}/section/${sectionId}`
    
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(sectionId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  // Trigger search when filter changes (if there's a query)
  useEffect(() => {
    if (query.trim() && hasSearched) {
      performSearch()
    }
  }, [filter, query, hasSearched, performSearch])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo/Title */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              SILIP
            </h1>
            <p className="text-xl text-muted-foreground">
              Philippine Data Privacy Search Engine
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Search through the Data Privacy Act of 2012, Implementing Rules and Regulations, 
              and NPC Circulars with instant results and intelligent highlighting.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for 'consent', 'CCTV', 'data breach', etc."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 pl-12 pr-4 text-lg shadow-lg"
                disabled={isLoading}
              />
            </div>

            {/* Filters */}
            <div className="flex justify-center">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as SearchFilter)}>
                <TabsList>
                  <TabsTrigger value="ALL">All Documents</TabsTrigger>
                  <TabsTrigger value="DPA">DPA Law</TabsTrigger>
                  <TabsTrigger value="IRR">IRR</TabsTrigger>
                  <TabsTrigger value="ISSUANCE">Circulars</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Button 
              type="submit" 
              size="lg" 
              disabled={isLoading || !query.trim()}
              className="min-w-32"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Results Section */}
      {(isLoading || hasSearched) && (
        <div className="container mx-auto px-4 pb-16">
          <div className="max-w-5xl mx-auto">
            <Separator className="mb-8" />

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-6 w-2/3" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-6 w-24" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-destructive text-center">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {!isLoading && !error && hasSearched && results.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="text-6xl">🔍</div>
                  <div>
                    <h3 className="text-lg font-semibold">No results found</h3>
                    <p className="text-muted-foreground mt-2">
                      Try different keywords like "consent", "breach notification", or "DPO requirements"
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {!isLoading && !error && results.length > 0 && (
              <div className="space-y-6">
                <div className="text-sm text-muted-foreground">
                  Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                </div>

                {results.map((result) => (
                  <Card key={result.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardDescription>
                        {result.documentAlias} - {result.sectionNum}
                      </CardDescription>
                      <CardTitle className="text-xl">{result.sectionTitle}</CardTitle>
                    </CardHeader>
                    
                    <CardContent>
                      <div 
                        className="text-sm leading-relaxed text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                      />
                    </CardContent>

                    <CardFooter className="flex flex-wrap gap-2 justify-between">
                      <div className="flex flex-wrap gap-2">
                        {result.tags.map((tag) => (
                          <Badge key={tag.id} variant="secondary">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(result.id)}
                        className="ml-auto"
                      >
                        {copiedId === result.id ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            SILIP - Searchable Interface for Legal Information & Privacy
          </p>
          <p className="mt-2">
            Built with Next.js, PostgreSQL, Redis, and Shadcn/UI
          </p>
        </div>
      </footer>
    </div>
  )
}
