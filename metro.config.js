const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to help with dependency resolution
config.resolver.blacklistRE = /android\/.*|ios\/.*/;

module.exports = config;
