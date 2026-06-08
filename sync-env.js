const fs = require('fs');
const path = require('path');

const rootEnvPath = path.join(__dirname, '.env.local');
const frontendEnvPath = path.join(__dirname, 'frontend', '.env.local');
const backendEnvPath = path.join(__dirname, 'backend', '.env.local');

try {
  if (fs.existsSync(rootEnvPath)) {
    fs.copyFileSync(rootEnvPath, frontendEnvPath);
    fs.copyFileSync(rootEnvPath, backendEnvPath);
    console.log('✅ Environment files synchronized from root .env.local to frontend and backend.');
  } else {
    console.warn('⚠️ Root .env.local not found. Please create one at the root directory.');
  }
} catch (error) {
  console.error('❌ Failed to synchronize environment files:', error);
}
