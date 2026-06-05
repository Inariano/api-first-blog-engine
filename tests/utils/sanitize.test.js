const sanitizeHtml = require('../../src/utils/sanitize');

describe('sanitizeHtml', () => {
  test('should escape script tags', () => {
    const result = sanitizeHtml('<script>alert("xss")</script><p>Hello</p>');
    expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;<p>Hello</p>');
  });

  test('should strip event handlers from tags', () => {
    const result = sanitizeHtml('<a href="#" onclick="alert(1)">click</a>');
    expect(result).toBe('<a href="#">click</a>');
  });

  test('should allow safe HTML tags', () => {
    const result = sanitizeHtml('<p><strong>Bold</strong> and <em>italic</em></p>');
    expect(result).toBe('<p><strong>Bold</strong> and <em>italic</em></p>');
  });

  test('should allow links with safe href', () => {
    const result = sanitizeHtml('<a href="https://example.com">Link</a>');
    expect(result).toBe('<a href="https://example.com">Link</a>');
  });

  test('should remove javascript: href', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).toBe('<a href>click</a>');
  });

  test('should escape iframe tags', () => {
    const result = sanitizeHtml('<iframe src="https://evil.com"></iframe><p>safe</p>');
    expect(result).toBe('&lt;iframe src="https://evil.com"&gt;&lt;/iframe&gt;<p>safe</p>');
  });

  test('should return empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  test('should return plain text unchanged', () => {
    expect(sanitizeHtml('Hello, world!')).toBe('Hello, world!');
  });

  test('should return empty string for non-string input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml(123)).toBe('');
  });
});
