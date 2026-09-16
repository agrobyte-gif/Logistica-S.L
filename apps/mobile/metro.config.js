// Metro para monorepo (npm workspaces): observa la raíz y resuelve los
// node_modules hoisteados. La app móvil es autocontenida (no importa
// @agrogood/shared en runtime), así que no requiere transpilar TS externo.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
