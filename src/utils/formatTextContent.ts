'use client';

import React from 'react';

// Simple text formatter for chat content
export function formatChatText(text: string): string {
    if (!text) return '';

    // Remove sources section (handles both "--- Sources:" and "---\n**Sources:**" formats)
    let formatted = text.replace(/---\s*\*{0,2}Sources?\*{0,2}:[\s\S]*/i, '');

    // Remove markdown-style links [text](url) - keep the text, remove the URL
    formatted = formatted.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');

    // Remove raw URLs
    formatted = formatted.replace(/https?:\/\/[^\s\)]+/g, '');

    // Remove excessive asterisks (4+ in a row)
    formatted = formatted.replace(/\*{4,}/g, '');

    // Clean up bullet points that are now empty or have dangling content
    formatted = formatted.replace(/•\s*•/g, '•');
    formatted = formatted.replace(/•\s*$/gm, '');
    formatted = formatted.replace(/•\s*\n/g, '\n');

    // Clean up extra whitespace
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Trim whitespace
    formatted = formatted.trim();

    return formatted;
}

// Parse raw text to extract any markdown-style formatting
export function parseMarkdownText(text: string): string {
    if (!text) return '';

    return formatChatText(text);
}
