import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create a simple icon with gradient background and "IL" text
async function createIcon(size, outputPath) {
    // Create SVG with the icon design
    const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1"/>
          <stop offset="100%" style="stop-color:#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
      <text 
        x="50%" 
        y="55%" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.4}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >IL</text>
    </svg>
  `;

    await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(outputPath);

    console.log(`Created ${outputPath}`);
}

// Generate icons
const publicDir = join(__dirname, 'public');

await createIcon(192, join(publicDir, 'pwa-192x192.png'));
await createIcon(512, join(publicDir, 'pwa-512x512.png'));
await createIcon(180, join(publicDir, 'apple-touch-icon.png'));

console.log('All icons generated!');
