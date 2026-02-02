import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/db/client', () => ({
  default: {
    stage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db/client'

function createMockRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/stages/batch-claim', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const mockStage = {
  id: 'stage-1',
  name: 'RESEARCH',
  status: 'PENDING',
  pipeline: { topic: 'AI Trends', status: 'DRAFT' },
}

describe('GET /api/stages/batch-claim', () => {
  it('returns usage information', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.description).toBeDefined()
    expect(data.usage).toBeDefined()
    expect(data.example).toBeDefined()
  })
})

describe('POST /api/stages/batch-claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('claims multiple stages successfully', async () => {
    vi.mocked(prisma.stage.findUnique).mockResolvedValue(mockStage as any)
    vi.mocked(prisma.stage.update).mockResolvedValue({ ...mockStage, status: 'CLAIMED' } as any)

    const request = createMockRequest({
      agentId: 'agent-1',
      agentName: 'TestAgent',
      stageIds: ['stage-1', 'stage-2'],
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.summary.claimed).toBe(2)
    expect(data.summary.failed).toBe(0)
  })

  it('handles missing stages', async () => {
    vi.mocked(prisma.stage.findUnique).mockResolvedValue(null)

    const request = createMockRequest({
      agentId: 'agent-1',
      agentName: 'TestAgent',
      stageIds: ['nonexistent-stage'],
    })
    const response = await POST(request)
    const data = await response.json()

    expect(data.summary.claimed).toBe(0)
    expect(data.summary.failed).toBe(1)
    expect(data.results[0].error).toBe('Stage not found')
  })

  it('handles already claimed stages', async () => {
    vi.mocked(prisma.stage.findUnique).mockResolvedValue({
      ...mockStage,
      status: 'CLAIMED',
    } as any)

    const request = createMockRequest({
      agentId: 'agent-1',
      agentName: 'TestAgent',
      stageIds: ['stage-1'],
    })
    const response = await POST(request)
    const data = await response.json()

    expect(data.summary.failed).toBe(1)
    expect(data.results[0].error).toContain('already claimed')
  })

  it('validates required fields', async () => {
    const request = createMockRequest({
      agentId: 'agent-1',
      // missing agentName and stageIds
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request')
  })

  it('limits to max 10 stages', async () => {
    const request = createMockRequest({
      agentId: 'agent-1',
      agentName: 'TestAgent',
      stageIds: Array(15).fill('stage-id'),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
  })

  it('returns helpful hint on success', async () => {
    vi.mocked(prisma.stage.findUnique).mockResolvedValue(mockStage as any)
    vi.mocked(prisma.stage.update).mockResolvedValue({ ...mockStage, status: 'CLAIMED' } as any)

    const request = createMockRequest({
      agentId: 'agent-1',
      agentName: 'TestAgent',
      stageIds: ['stage-1'],
    })
    const response = await POST(request)
    const data = await response.json()

    expect(data.hint).toContain('/api/stages/:id/complete')
  })

  it('handles inactive pipelines', async () => {
    vi.mocked(prisma.stage.findUnique).mockResolvedValue({
      ...mockStage,
      pipeline: { topic: 'Old Topic', status: 'COMPLETE' },
    } as any)

    const request = createMockRequest({
      agentId: 'agent-1',
      agentName: 'TestAgent',
      stageIds: ['stage-1'],
    })
    const response = await POST(request)
    const data = await response.json()

    expect(data.summary.failed).toBe(1)
    expect(data.results[0].error).toContain('no longer active')
  })
})
