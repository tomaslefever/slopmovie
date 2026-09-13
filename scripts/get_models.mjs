import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

async function fetchLiveModels() {
  const resp = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const data = await resp.json();
  const models = data.data || [];
  console.log(`Found ${models.length} live models`);
  fs.writeFileSync('scripts/live_models.json', JSON.stringify(models, null, 2));
  
  // Print names
  models.forEach(m => console.log(m.id));
}

fetchLiveModels();
