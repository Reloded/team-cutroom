import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Get Agent Details
 * 
 * GET /api/agents/:id
 * 
 * Returns detailed stats for a specific agent including:
 * - Completed stages
 * - Attribution history
 * - Pending rewards (unclaimed contributions)
 * - Stage breakdown by type
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: agentId } = await context.params

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // Get completed stages
    const completedStages = await prisma.stage.findMany({
      where: {
        agentId,
        status: 'COMPLETE',
      },
      include: {
        pipeline: {
          select: {
            id: true,
            topic: true,
            status: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Get all attributions
    const attributions = await prisma.attribution.findMany({
      where: { agentId },
      include: {
        pipeline: {
          select: {
            id: true,
            topic: true,
            status: true,
          },
        },
        stage: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate totals
    const totalContribution = attributions.reduce(
      (sum, a) => sum + (a.percentage || 0),
      0
    )

    // Stage breakdown
    const stageBreakdown = completedStages.reduce(
      (acc, stage) => {
        acc[stage.name] = (acc[stage.name] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Get agent name from most recent attribution
    const agentName = attributions[0]?.agentName || 'Unknown'

    // Calculate pending rewards (from completed pipelines)
    const pendingRewards = attributions
      .filter(a => a.pipeline.status === 'COMPLETE')
      .reduce((sum, a) => sum + (a.percentage || 0), 0)

    return NextResponse.json({
      agent: {
        id: agentId,
        name: agentName,
      },
      stats: {
        totalStagesCompleted: completedStages.length,
        totalContribution,
        pendingRewards,
        stageBreakdown,
      },
      recentWork: completedStages.slice(0, 10).map(stage => ({
        stageId: stage.id,
        stageName: stage.name,
        pipelineTopic: stage.pipeline.topic,
        pipelineStatus: stage.pipeline.status,
        completedAt: stage.completedAt,
      })),
      attributions: attributions.slice(0, 20).map(a => ({
        pipelineId: a.pipelineId,
        pipelineTopic: a.pipeline.topic,
        stageName: a.stage.name,
        percentage: a.percentage,
        createdAt: a.createdAt,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
