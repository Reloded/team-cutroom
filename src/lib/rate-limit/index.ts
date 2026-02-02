/**
 * Rate Limiting Utilities
 * 
 * Simple in-memory rate limiting for API endpoints.
 * In production, use Redis or similar.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limits = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = limits.get(key)
  
  // If no entry or window has expired, start fresh
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs
    limits.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    }
  }
  
  // Check if under limit
  if (entry.count < config.maxRequests) {
    entry.count++
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    }
  }
  
  // Rate limited
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  }
}

/**
 * Generate a rate limit key for an agent
 */
export function agentRateLimitKey(agentId: string, action: string): string {
  return `agent:${agentId}:${action}`
}

/**
 * Generate a rate limit key for an IP
 */
export function ipRateLimitKey(ip: string, action: string): string {
  return `ip:${ip}:${action}`
}

/**
 * Clear rate limit for a key (useful for testing)
 */
export function clearRateLimit(key: string): void {
  limits.delete(key)
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  limits.clear()
}

// Default configs for different actions
export const RATE_LIMITS = {
  // Claim a stage: 10 per minute
  claim: { windowMs: 60_000, maxRequests: 10 },
  
  // Create pipeline: 5 per minute
  createPipeline: { windowMs: 60_000, maxRequests: 5 },
  
  // Execute stage: 20 per minute
  execute: { windowMs: 60_000, maxRequests: 20 },
  
  // Register webhook: 10 per hour
  registerWebhook: { windowMs: 3600_000, maxRequests: 10 },
  
  // General API: 100 per minute
  general: { windowMs: 60_000, maxRequests: 100 },
} as const
