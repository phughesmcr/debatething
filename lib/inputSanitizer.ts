export function sanitizeInput(input: string): string {
    // Basic sanitization: remove HTML tags and trim
    return input.replace(/<[^>]*>?/gm, '').trim();
  }