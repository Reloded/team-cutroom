import { NextRequest, NextResponse } from 'next/server'
import { createPipeline, listPipelines, createPipelineWithTemplate } from '@/lib/pipeline/manager'
import { getVideoTemplate, TemplatePipelineRequestSchema } from '@/lib/templates'

// GET /api/pipelines - List all pipelines
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as any
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const pipelines = await listPipelines(limit, status || undefined)
    
    return NextResponse.json({ 
      pipelines,
      count: pipelines.length 
    })
  } catch (error) {
    console.error('Error listing pipelines:', error)
    return NextResponse.json(
      { error: 'Failed to list pipelines' },
      { status: 500 }
    )
  }
}

// POST /api/pipelines - Create new pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, description, templateId, customization, platforms, targetDuration } = body
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }
    
    // If templateId provided, create with template
    if (templateId) {
      const template = getVideoTemplate(templateId)
      if (!template) {
        return NextResponse.json(
          { error: `Template not found: ${templateId}` },
          { status: 404 }
        )
      }
      
      const pipeline = await createPipelineWithTemplate(
        topic,
        template,
        {
          description,
          customization,
          platforms: platforms || template.platforms,
          targetDuration,
        }
      )
      
      return NextResponse.json(pipeline, { status: 201 })
    }
    
    // Otherwise create basic pipeline
    const pipeline = await createPipeline(topic, description)
    
    return NextResponse.json(pipeline, { status: 201 })
  } catch (error) {
    console.error('Error creating pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to create pipeline' },
      { status: 500 }
    )
  }
}
