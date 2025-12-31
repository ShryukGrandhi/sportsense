// Utility functions for processing Gemini grounding metadata
// Used to extract citations and sources from Google Search grounding

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface GroundingSupport {
    text: string;
    sources: GroundingSource[];
}

export interface ProcessedGrounding {
    sources: GroundingSource[];
    supports: GroundingSupport[];
    searchQueries: string[];
}

/**
 * Extract grounding metadata from a Gemini response
 * Returns structured sources and citations
 */
export function processGroundingMetadata(response: any): ProcessedGrounding {
    const result: ProcessedGrounding = {
        sources: [],
        supports: [],
        searchQueries: []
    };

    try {
        // Access grounding metadata from the response
        const candidate = response.candidates?.[0];
        const groundingMetadata = candidate?.groundingMetadata;

        if (!groundingMetadata) {
            return result;
        }

        // Extract search queries used
        if (groundingMetadata.webSearchQueries) {
            result.searchQueries = groundingMetadata.webSearchQueries;
        }

        // Extract grounding chunks (web sources)
        if (groundingMetadata.groundingChunks) {
            for (const chunk of groundingMetadata.groundingChunks) {
                if (chunk.web) {
                    result.sources.push({
                        uri: chunk.web.uri || '',
                        title: chunk.web.title || 'Web Source'
                    });
                }
            }
        }

        // Extract grounding supports (text segments with their sources)
        if (groundingMetadata.groundingSupports) {
            for (const support of groundingMetadata.groundingSupports) {
                const segment = support.segment;
                const chunkIndices = support.groundingChunkIndices || [];

                if (segment?.text) {
                    result.supports.push({
                        text: segment.text,
                        sources: chunkIndices.map((idx: number) => result.sources[idx]).filter(Boolean)
                    });
                }
            }
        }

        console.log(`[Grounding] Extracted ${result.sources.length} sources, ${result.searchQueries.length} queries`);

    } catch (error) {
        console.error('[Grounding] Error processing metadata:', error);
    }

    return result;
}

/**
 * Format grounding sources as markdown citations
 */
export function formatGroundingCitations(grounding: ProcessedGrounding): string {
    if (grounding.sources.length === 0) {
        return '';
    }

    let citation = '\n\n---\n**🔍 Sources (via Google Search):**\n';

    // Deduplicate sources by URI
    const seen = new Set<string>();
    for (const source of grounding.sources) {
        if (!seen.has(source.uri)) {
            seen.add(source.uri);
            citation += `• [${source.title}](${source.uri})\n`;
        }
    }

    return citation;
}

/**
 * Convert grounding sources to a simple array format for API responses
 */
export function getSourcesArray(grounding: ProcessedGrounding): string[] {
    const sources: string[] = [];
    const seen = new Set<string>();

    for (const source of grounding.sources) {
        const label = source.title || 'Web Source';
        if (!seen.has(source.uri)) {
            seen.add(source.uri);
            sources.push(`${label} (${source.uri})`);
        }
    }

    // Add search queries info
    if (grounding.searchQueries.length > 0) {
        sources.push(`Google Search: "${grounding.searchQueries.join('", "')}"`);
    }

    return sources;
}
