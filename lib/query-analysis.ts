/**
 * Query Analysis Utilities
 * 
 * Analyzes search queries to determine if they should use:
 * - Direct search (fast, free) for keywords and simple queries
 * - AI consult (slower, costs tokens) for complex questions
 */

export interface QueryAnalysis {
    shouldUseAI: boolean
    reason: string
    complexity: 'simple' | 'moderate' | 'complex'
}

/**
 * Analyze a query to determine if it should use AI
 */
export function analyzeQuery(query: string): QueryAnalysis {
    const trimmed = query.trim().toLowerCase()
    const wordCount = trimmed.split(/\s+/).length

    // Question patterns that benefit from AI synthesis
    const questionPatterns = [
        /^(how|what|why|when|where|who|which|can|could|should|would|will|does|do|is|are)\b/i,
        /\b(explain|describe|summarize|tell me|help me|guide me)\b/i,
    ]

    // Comparison patterns
    const comparisonPatterns = [
        /\b(difference between|versus|vs\.?|compared to|compare)\b/i,
        /\b(better|worse|more|less)\b.*\b(than|to)\b/i,
    ]

    // Synthesis patterns
    const synthesisPatterns = [
        /\b(all|every|complete|comprehensive|full)\b.*\b(list|requirements|obligations|penalties)\b/i,
        /\b(requirements for|obligations of|steps to|process for)\b/i,
    ]

    // Plain language request patterns
    const plainLanguagePatterns = [
        /\b(in simple terms|plain language|layman|easy to understand|for dummies)\b/i,
        /\b(what does.*mean|meaning of)\b/i,
    ]

    // Check for question patterns
    if (questionPatterns.some(pattern => pattern.test(trimmed))) {
        return {
            shouldUseAI: true,
            reason: 'Question requiring explanation',
            complexity: 'complex',
        }
    }

    // Check for comparison patterns
    if (comparisonPatterns.some(pattern => pattern.test(trimmed))) {
        return {
            shouldUseAI: true,
            reason: 'Comparison requiring synthesis',
            complexity: 'complex',
        }
    }

    // Check for synthesis patterns
    if (synthesisPatterns.some(pattern => pattern.test(trimmed))) {
        return {
            shouldUseAI: true,
            reason: 'Synthesis of multiple sections needed',
            complexity: 'complex',
        }
    }

    // Check for plain language patterns
    if (plainLanguagePatterns.some(pattern => pattern.test(trimmed))) {
        return {
            shouldUseAI: true,
            reason: 'Plain language explanation requested',
            complexity: 'complex',
        }
    }

    // Long queries (>8 words) are likely questions
    if (wordCount > 8) {
        return {
            shouldUseAI: true,
            reason: 'Long query likely requires synthesis',
            complexity: 'moderate',
        }
    }

    // Short queries with question marks
    if (trimmed.includes('?')) {
        return {
            shouldUseAI: true,
            reason: 'Question format detected',
            complexity: 'moderate',
        }
    }

    // Default: use direct search for keywords and simple queries
    return {
        shouldUseAI: false,
        reason: 'Simple keyword search',
        complexity: 'simple',
    }
}

/**
 * Get a user-friendly explanation of why a query uses AI or search
 */
export function getRoutingExplanation(analysis: QueryAnalysis): string {
    if (analysis.shouldUseAI) {
        return `Using AI to ${analysis.reason.toLowerCase()}`
    }
    return 'Using fast keyword search'
}

/**
 * Example usage:
 * 
 * const analysis = analyzeQuery("What is a data protection officer?")
 * if (analysis.shouldUseAI) {
 *   // Use /api/consult
 * } else {
 *   // Use direct search
 * }
 */
