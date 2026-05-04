/* eslint-disable */
const fs = require('fs');
const path = require('path');

function ensureValidJsonFile(filePath, defaultObj) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultObj, null, 2));
      return;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw || !String(raw).trim()) {
      fs.writeFileSync(filePath, JSON.stringify(defaultObj, null, 2));
      return;
    }
    JSON.parse(raw);
  } catch {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultObj, null, 2));
    } catch {
      // non-fatal
    }
  }
}

try {
  const nextDir = path.join(__dirname, '..', '.next');
  if (!fs.existsSync(nextDir)) fs.mkdirSync(nextDir);

  ensureValidJsonFile(
    path.join(nextDir, 'prerender-manifest.json'),
    { version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [] }
  );

  ensureValidJsonFile(path.join(nextDir, 'routes-manifest.json'), {
    version: 5,
    pages404: true,
  });
} catch (e) {
  // non-fatal in dev
}


