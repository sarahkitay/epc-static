// Script to update all HTML files for clean URLs and SEO
// Run with: node update-seo-urls.js

const fs = require('fs');
const path = require('path');

// URL mapping: old -> new
const urlMap = {
  'index.html': '/',
  'services.html': '/services',
  'team.html': '/team',
  'about.html': '/about',
  'blog.html': '/blog',
  'contact.html': '/contact',
  'booking.html': '/booking',
  'training.html': '/training',
  'assessment.html': '/assessment',
  'careers.html': '/careers',
  'privacy.html': '/privacy',
  'terms.html': '/terms',
  'football.html': '/football',
  'winter-ball.html': '/winter-ball',
  'spa-page.html': '/spa'
};

// Blog posts mapping
const blogPosts = [
  'acl-prevention',
  'contrast-therapy',
  'custom-insoles',
  'emsculpt',
  'movement-patterns',
  'newyear',
  'performance-clinic-vs-pt',
  'performance-pyramid',
  'performance-testing',
  'preventative-care',
  'proteus',
  'pt-after-surgery',
  'pt-before-surgery',
  'return-to-play',
  'shockwave-therapy',
  'squat-for-life'
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Update href attributes
  Object.entries(urlMap).forEach(([oldUrl, newUrl]) => {
    const patterns = [
      new RegExp(`href=["']${oldUrl.replace('.', '\\.')}["']`, 'g'),
      new RegExp(`href=["']\\./${oldUrl.replace('.', '\\.')}["']`, 'g'),
      new RegExp(`href=["']\\.\\./${oldUrl.replace('.', '\\.')}["']`, 'g')
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `href="${newUrl}"`);
        changed = true;
      }
    });
  });

  // Update blog post links
  blogPosts.forEach(post => {
    const oldPattern = new RegExp(`href=["']blog/${post}\\.html["']`, 'g');
    const newPattern = `href="/blog/${post}"`;
    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newPattern);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
    return true;
  }
  return false;
}

// Get all HTML files
function getAllHtmlFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
      files.push(...getAllHtmlFiles(fullPath));
    } else if (item.endsWith('.html')) {
      files.push(fullPath);
    }
  });
  
  return files;
}

// Run updates
const htmlFiles = getAllHtmlFiles('.');
let updatedCount = 0;

htmlFiles.forEach(file => {
  if (updateFile(file)) {
    updatedCount++;
  }
});

console.log(`\n✅ Updated ${updatedCount} files for clean URLs`);
