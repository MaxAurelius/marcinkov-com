const fs = require('fs').promises;
const path = require('path');
const marked = require('marked');

const POSTS_DIR = path.join(__dirname, 'posts');
const OUTPUT_DIR = path.join(__dirname, 'blog');
const TEMPLATE_PATH = path.join(__dirname, 'blog-template.html');

async function build() {
    console.log("Starting the forge...");

    const postTemplate = await fs.readFile(TEMPLATE_PATH, 'utf-8');
    const files = await fs.readdir(POSTS_DIR);
    const markdownFiles = files.filter(file => path.extname(file) === '.md');
    const postList = [];

    for (const file of markdownFiles) {
        const filePath = path.join(POSTS_DIR, file);
        const markdownContent = await fs.readFile(filePath, 'utf-8');

        const parts = markdownContent.split('---');
        if (parts.length < 3) throw new Error(`Invalid front-matter in file: ${file}`);
        
        const frontMatterRaw = parts[1];
        const content = parts.slice(2).join('---');
        
        const frontMatter = frontMatterRaw.split('\n').reduce((acc, line) => {
            const [key, ...value] = line.split(':');
            if (key && key.trim()) acc[key.trim()] = value.join(':').trim();
            return acc;
        }, {});

        const title = frontMatter.title || 'Untitled Manifesto';
        const date = frontMatter.date || new Date().toISOString().split('T')[0];
        const slug = path.basename(file, '.md');
        
        const htmlContent = marked.parse(content);
        
        // =================================================================
        // ### THE DEFINITIVE FIX ###
        // Using a global Regular Expression to find and replace.
        // This is immune to invisible characters or formatting issues.
        // =================================================================
        const outputHtml = postTemplate
            .replace(/{{TITLE}}/g, title)
            .replace(/{{CONTENT}}/g, htmlContent);

        const outputFilePath = path.join(OUTPUT_DIR, `${slug}.html`);
        await fs.writeFile(outputFilePath, outputHtml);
        console.log(`-> Forged: ${slug}.html`);

        postList.push({ slug, title, date });
    }
    
    await buildIndexPage(postList);
    console.log("\n...Forge is cold. All manifestos are ready for deployment.");
}

async function buildIndexPage(posts) {
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const postLinksHtml = posts.map(post => {
        const postDate = new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        return `
            <a href="/blog/${post.slug}.html" class="post-card-link">
                <article class="post-card">
                    <h3>${post.title}</h3>
                    <p class="post-meta">Published on ${postDate}</p>
                </article>
            </a>
        `;
    }).join('');

    const indexTemplate = await fs.readFile(path.join(__dirname, 'blog-index-template.html'), 'utf-8');
    const finalIndexHtml = indexTemplate.replace('{{POST_LINKS}}', postLinksHtml);
    
    await fs.writeFile(path.join(__dirname, 'blog.html'), finalIndexHtml);
}

build().catch(err => {
    console.error("\n### BUILD FAILED ###\n");
    console.error(err);
    process.exit(1);
});