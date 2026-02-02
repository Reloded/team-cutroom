import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'
import { z } from 'zod'
import { StageName } from '@prisma/client'

/**
 * Batch Stage Claim Endpoint
 * 
 * POST /api/stages/batch-claim
 * 
 * Allows agents to claim multiple available stages at once.
 * More efficient than individual claims for high-volume agents.
 */

const BatchClaimSchema = z.object({
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  stageIds: z.array(z.string()).min(1).max(10),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = BatchClaimSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.errors },
        { status: 400 }
      )
    }

    const { agentId, agentName, stageIds } = result.data
    const results: Array<{
      stageId: string
      success: boolean
      error?: string
      stage?: { name: StageName; pipelineTopic: string }
    }> = []

    // Process each claim
    for (const stageId of stageIds) {
      try {
        // Check if stage exists and is available
        const stage = await prisma.stage.findUnique({
          where: { id: stageId },
          include: { pipeline: { select: { topic: true, status: true } } },
        })

        if (!stage) {
          results.push({ stageId, success: false, error: 'Stage not found' })
          continue
        }

        if (stage.status !== 'PENDING') {
          results.push({
            stageId,
            success: false,
            error: `Stage already ${stage.status.toLowerCase()}`,
          })
          continue
        }

        if (stage.pipeline.status === 'COMPLETE' || stage.pipeline.status === 'FAILED') {
          results.push({
            stageId,
            success: false,
            error: 'Pipeline no longer active',
          })
          continue
        }

        // Claim the stage
        await prisma.stage.update({
          where: { id: stageId },
          data: {
            status: 'CLAIMED',
            agentId,
            agentName,
            claimedAt: new Date(),
          },
        })

        results.push({
          stageId,
          success: true,
          stage: {
            name: stage.name,
            pipelineTopic: stage.pipeline.topic,
          },
        })
      } catch (error) {
        results.push({
          stageId,
          success: false,
          error: (error as Error).message,
        })
      }
    }

    const claimed = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    return NextResponse.json({
      summary: {
        requested: stageIds.length,
        claimed: claimed.length,
        failed: failed.length,
      },
      results,
      hint: claimed.length > 0
        ? `Use POST /api/stages/:id/complete to submit work for claimed stages`
        : 'No stages were claimed. Check if they are still available.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stages/batch-claim
 * 
 * Returns usage information
 */
export async function GET() {
  return NextResponse.json({
    description: 'Batch claim multiple stages at once',
    usage: {
      method: 'POST',
      body: {
        agentId: 'string (required)',
        agentName: 'string (required)',
        stageIds: 'string[] (required, max 10)',
      },
    },
    example: {
      agentId: 'agent-123',
      agentName: 'MyAgent',
      stageIds: ['stage-1', 'stage-2', 'stage-3'],
    },
    tips: [
      'Use GET /api/stages/available to find claimable stages first',
      'Maximum 10 stages per batch request',
      'Failed claims do not affect successful ones',
    ],
  })
}
