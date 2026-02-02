import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkRateLimit,
  clearRateLimit,
  clearAllRateLimits,
  agentRateLimitKey,
  ipRateLimitKey,
  RATE_LIMITS,
} from './index'

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearAllRateLimits()
  })

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit('test-key', { windowMs: 60000, maxRequests: 5 })
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should decrement remaining on each request', () => {
      const config = { windowMs: 60000, maxRequests: 5 }
      
      checkRateLimit('test-key', config)
      checkRateLimit('test-key', config)
      const result = checkRateLimit('test-key', config)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('should block when limit is reached', () => {
      const config = { windowMs: 60000, maxRequests: 3 }
      
      checkRateLimit('test-key', config)
      checkRateLimit('test-key', config)
      checkRateLimit('test-key', config)
      const result = checkRateLimit('test-key', config)
      
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeDefined()
    })

    it('should reset after window expires', async () => {
      const config = { windowMs: 50, maxRequests: 2 }
      
      checkRateLimit('test-key', config)
      checkRateLimit('test-key', config)
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 60))
      
      const result = checkRateLimit('test-key', config)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should track different keys independently', () => {
      const config = { windowMs: 60000, maxRequests: 2 }
      
      checkRateLimit('key-1', config)
      checkRateLimit('key-1', config)
      const blocked = checkRateLimit('key-1', config)
      
      const allowed = checkRateLimit('key-2', config)
      
      expect(blocked.allowed).toBe(false)
      expect(allowed.allowed).toBe(true)
    })
  })

  describe('key generators', () => {
    it('should generate agent key', () => {
      const key = agentRateLimitKey('agent-123', 'claim')
      expect(key).toBe('agent:agent-123:claim')
    })

    it('should generate IP key', () => {
      const key = ipRateLimitKey('192.168.1.1', 'api')
      expect(key).toBe('ip:192.168.1.1:api')
    })
  })

  describe('clearRateLimit', () => {
    it('should clear a specific rate limit', () => {
      const config = { windowMs: 60000, maxRequests: 1 }
      
      checkRateLimit('test-key', config)
      const blocked = checkRateLimit('test-key', config)
      expect(blocked.allowed).toBe(false)
      
      clearRateLimit('test-key')
      
      const result = checkRateLimit('test-key', config)
      expect(result.allowed).toBe(true)
    })
  })

  describe('RATE_LIMITS presets', () => {
    it('should have claim preset', () => {
      expect(RATE_LIMITS.claim.maxRequests).toBe(10)
      expect(RATE_LIMITS.claim.windowMs).toBe(60000)
    })

    it('should have createPipeline preset', () => {
      expect(RATE_LIMITS.createPipeline.maxRequests).toBe(5)
    })

    it('should have execute preset', () => {
      expect(RATE_LIMITS.execute.maxRequests).toBe(20)
    })

    it('should have registerWebhook preset', () => {
      expect(RATE_LIMITS.registerWebhook.windowMs).toBe(3600000)
    })

    it('should have general preset', () => {
      expect(RATE_LIMITS.general.maxRequests).toBe(100)
    })
  })
})
