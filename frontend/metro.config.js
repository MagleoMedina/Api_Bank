const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const webHtml = fs.readFileSync(path.join(__dirname, 'web', 'index.html'), 'utf8');

function resolveRequest(context, moduleName, platform) {
  if (platform === 'web' && moduleName === 'react-native') {
    return context.resolveRequest(context, 'react-native-web', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
}

const config = {
  resolver: {
    resolveRequest,
  },
  server: {
    enhanceMiddleware: (middleware) => (req, res, next) => {
      if (req.url === '/web' || req.url === '/web/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(webHtml);
        return;
      }
      return middleware(req, res, next);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);