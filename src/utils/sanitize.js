const xss = require('xss');

const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return '';
  return xss(input);
};

module.exports = sanitizeHtml;
