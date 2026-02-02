import { NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

/**
 * Health check endpoint
 * 
 * Returns:
 * - status: "ok" or "degraded"
 * - timestamp: current time
 * - database: connection status
 * - version: app version
 */
export async function GET() {
  const startTime = Date.now()
  
  let databaseStatus = 'ok'
  let databaseLatency = 0
  
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    databaseLatency = Date.now() - dbStart
  } catch (error) {
    databaseStatus = 'error'
  }
  
  const response = {
    status: databaseStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    database: {
      status: databaseStatus,
      latencyMs: databaseLatency,
    },
    responseTimeMs: Date.now() - startTime,
  }
  
  return NextResponse.json(response, {
    status: response.status === 'ok' ? 200 : 503,
  })
}
