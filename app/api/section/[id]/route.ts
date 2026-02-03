import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            alias: true,
            type: true,
            subType: true,
            url: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error fetching section:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
