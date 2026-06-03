const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: [true, 'Token is required'],
    index: true,
  },
  expiresAt: {
    type: Date,
    required: [true, 'ExpiresAt is required'],
    index: { expires: 0 },
  },
});

const BlacklistedToken = mongoose.models.BlacklistedToken
  || mongoose.model('BlacklistedToken', blacklistedTokenSchema);

module.exports = BlacklistedToken;
