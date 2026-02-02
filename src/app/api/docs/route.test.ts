import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('GET /api/docs', () => {
  it('returns valid OpenAPI spec', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.openapi).toBe('3.0.3')
    expect(data.info.title).toBe('Cutroom API')
  })

  it('includes all main endpoints', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.paths).toHaveProperty('/health')
    expect(data.paths).toHaveProperty('/pipelines')
    expect(data.paths).toHaveProperty('/stages/available')
    expect(data.paths).toHaveProperty('/agents')
    expect(data.paths).toHaveProperty('/agents/{id}')
    expect(data.paths).toHaveProperty('/stats')
  })

  it('includes component schemas', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.components.schemas).toHaveProperty('Pipeline')
    expect(data.components.schemas).toHaveProperty('Stage')
  })

  it('has CORS header', async () => {
    const response = await GET()
    
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('pipeline schema has required fields', async () => {
    const response = await GET()
    const data = await response.json()

    const pipelineSchema = data.components.schemas.Pipeline
    expect(pipelineSchema.properties).toHaveProperty('id')
    expect(pipelineSchema.properties).toHaveProperty('topic')
    expect(pipelineSchema.properties).toHaveProperty('status')
  })

  it('stage schema includes all stage types', async () => {
    const response = await GET()
    const data = await response.json()

    const stageSchema = data.components.schemas.Stage
    const stageNames = stageSchema.properties.name.enum

    expect(stageNames).toContain('RESEARCH')
    expect(stageNames).toContain('SCRIPT')
    expect(stageNames).toContain('VOICE')
    expect(stageNames).toContain('MUSIC')
    expect(stageNames).toContain('VISUAL')
    expect(stageNames).toContain('EDITOR')
    expect(stageNames).toContain('PUBLISH')
  })
})
