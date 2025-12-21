/* eslint-disable */
const fs = require('fs');
const path = require('path');

try {
  const nextDir = path.join(__dirname, '..', '.next');
  if (!fs.existsSync(nextDir)) fs.mkdirSync(nextDir);

  const prerenderPath = path.join(nextDir, 'prerender-manifest.json');
  if (!fs.existsSync(prerenderPath)) {
    fs.writeFileSync(
      prerenderPath,
      JSON.stringify({ version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [] }, null, 2)
    );
  }

  const routesManifest = path.join(nextDir, 'routes-manifest.json');
  if (!fs.existsSync(routesManifest)) {
    fs.writeFileSync(routesManifest, JSON.stringify({ version: 5, pages404: true }, null, 2));
  }
} catch (e) {
  // non-fatal in dev
}


