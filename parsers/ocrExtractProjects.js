const Tesseract = require('tesseract.js');
const path = require('path');

// Project extraction logic
function extractProjectsFromOcrText(ocrText) {
    
    const lines = ocrText.split('\n').map(l => l.trim());
    const projects = [];
    let inProjectSection = false;
    let currentProject = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Start project section
        if (!inProjectSection && line.toLowerCase() === 'projects') {
            inProjectSection = true;
            continue;
        }
        // End project section at next major section
        if (inProjectSection && (
            line.toLowerCase().startsWith('achievements') ||
            line.toLowerCase().startsWith('education')
        )) {
            if (currentProject) projects.push(currentProject);
            break;
        }

        // Only process if in project section
        if (inProjectSection) {
            // New project bullet (handles « or » or -)
            if (/^[«»•*-]/.test(line)) {
                if (currentProject) projects.push(currentProject);
                // Remove bullet and split at first colon
                const content = line.replace(/^[«»•*-]\s*/, '');
                const colonIdx = content.indexOf(':');
                if (colonIdx !== -1) {
                    currentProject = {
                        title: content.substring(0, colonIdx).trim(),
                        description: content.substring(colonIdx + 1).trim()
                    };
                } else {
                    currentProject = {
                        title: content.trim(),
                        description: ''
                    };
                }
            } else if (currentProject && line) {
                // Continuation of description
                currentProject.description += ' ' + line;
            }
        }
    }
    return projects;
}

// OCR and extraction runner
async function main() {
    // ** image convert into ocr text
    const imgPath = path.join(__dirname, '../assets/finalresume-1.png');
    console.log('Running OCR, this may take a moment...');
    const { data: { text } } = await Tesseract.recognize(
        imgPath,
        'eng',
        { logger: m => process.stdout.write('.') }
    );
    console.log('\n\n--- OCR Extracted Text ---\n');
    console.log(text);

    const projects = extractProjectsFromOcrText(text);
    console.log('\n--- Extracted Projects ---\n');
    console.log(projects);
}

if (require.main === module) {
    main().catch(err => {
        console.error('Error:', err);
    });
}
module.exports = {
    extractProjectsFromOcrText
};