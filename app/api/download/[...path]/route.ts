import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params in App Router
    const { path: pathArray } = await params
    
    console.log('Download request - pathArray:', pathArray)
    
    // Reconstruct the file path from params
    const filePath = pathArray.join('/')
    console.log('Download request - filePath:', filePath)
    
    const fullPath = path.join(process.cwd(), 'data', filePath)
    console.log('Download request - fullPath:', fullPath)

    // Security check: ensure the path is within the data directory
    const dataDir = path.join(process.cwd(), 'data')
    const resolvedPath = path.resolve(fullPath)
    
    if (!resolvedPath.startsWith(dataDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      )
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = fs.readFileSync(resolvedPath)
    const fileName = path.basename(resolvedPath)

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
