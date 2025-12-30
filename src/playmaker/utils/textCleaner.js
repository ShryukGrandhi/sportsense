// Simple cleaner for Perplexity/GPT markdown noise
// - removes repeated asterisks like **** or **
// - normalizes whitespace
// - trims ends
export const cleanPerplexityText = (txt) => {
  if (typeof txt !== 'string') return txt || '';
  try {
    return txt
      // Preserve markdown bold (**); only collapse excessive 4+ asterisks to a pair
      .replace(/\*{4,}/g, '**')
      .replace(/[\t\f\v\r]+/g, ' ') // collapse odd whitespace
      .replace(/\s+\n/g, '\n') // trim spaces before newlines
      .replace(/\n{3,}/g, '\n\n') // avoid excessive blank lines
      .replace(/\s{2,}/g, ' ') // collapse spaces
      .trim();
  } catch {
    return (txt || '').trim();
  }
};

// Remove common markdown artifacts (headers, table pipes) for plain rendering
export const cleanMarkdownArtifacts = (txt) => {
  if (!txt || typeof txt !== 'string') return txt || '';
  try {
    return txt
      // Preserve markdown tables and headings for ReactMarkdown.
      // Only collapse excessive blank lines.
      // If you need to disable tables globally, consider handling in the renderer.
      // collapse excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return (txt || '').trim();
  }
};

export default cleanPerplexityText;
