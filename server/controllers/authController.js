const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function generateTokens(user) {
  const payload = { id: user._id, email: user.email, name: user.name };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'email, password and name are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Invalid refresh token' });

      const user = await User.findById(decoded.id);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: 'Refresh token not recognized' });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
      user.refreshToken = newRefreshToken;
      await user.save();

      res.json({ accessToken, refreshToken: newRefreshToken });
    });
  } catch (err) {
    res.status(500).json({ message: 'Token refresh failed', error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: 'Logout failed', error: err.message });
  }
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash -refreshToken');
  res.json(user);
};
