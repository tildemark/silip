import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/resources
 * 
 * Returns ingestion history and database statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Get ingestion logs
    const logs = await prisma.ingestionLog.findMany({
      orderBy: {
        startedAt: 'desc',
      },
      take: 50, // Last 50 ingestions
    })

    // Get document counts by type
    const documentStats = await prisma.legalDocument.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    })

    // Get issuance breakdown by subType
    const issuanceStats = await prisma.legalDocument.groupBy({
      by: ['subType'],
      where: {
        type: 'ISSUANCE',
      },
      _count: {
        id: true,
      },
    })

    // Get total sections count
    const totalSections = await prisma.section.count()

    // Get total tags count
    const totalTags = await prisma.tag.count()

    // Get most recent documents
    const recentDocuments = await prisma.legalDocument.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        alias: true,
        url: true,
        createdAt: true,
        _count: {
          select: {
            sections: true,
          },
        },
      },
    })

    return NextResponse.json({
      ingestionLogs: logs,
      statistics: {
        totalDocuments: documentStats.reduce((sum, stat) => sum + stat._count.id, 0),
        totalSections,
        totalTags,
        documentsByType: documentStats.map((stat) => ({
          type: stat.type,
          count: stat._count.id,
        })),
        issuancesBySubType: issuanceStats.map((stat) => ({
          subType: stat.subType || 'UNSPECIFIED',
          count: stat._count.id,
        })),
      },
      recentDocuments,
    })
  } catch (error) {
    console.error('Resources API Error:', error)
    
    return NextResponse.json(
      { error: 'An error occurred while fetching resources' },
      { status: 500 }
    )
  }
}
