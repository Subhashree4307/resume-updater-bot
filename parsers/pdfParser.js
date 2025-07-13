
const fs = require('fs').promises;
const path = require('path');
const Tesseract = require('tesseract.js');

class PDFParser {
    extractName(text) {
        const lines = text.split('\n').map(l => l.trim());
        const sectionHeaders = ['Technical Skills', 'Projects', 'Achievements', 'Education', 'Experience'];
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (line && !sectionHeaders.includes(line)) {
                return line;
            }
        }
        return '';
    }

    extractEmail(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const match = text.match(emailRegex);
        return match ? match[0] : '';
    }

    extractPhone(text) {
        const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,6}/g;
        const matches = text.match(phoneRegex);
        if (!matches) return '';
        return matches.find(num => {
            const digits = num.replace(/\D/g, '');
            return digits.length >= 10 && digits.length <= 13;
        }) || '';
    }

    extractProjects(text) {
        const lines = text.split('\n').map(l => l.trim());
        const projects = [];
        let inProjectSection = false;
        let currentProject = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!inProjectSection && line.toLowerCase() === 'projects') {
                inProjectSection = true;
                continue;
            }
            if (inProjectSection && (
                line.toLowerCase().startsWith('achievements') ||
                line.toLowerCase().startsWith('education')
            )) {
                if (currentProject) projects.push(currentProject);
                break;
            }

            if (inProjectSection) {
                if (/^[«»•*-]/.test(line)) {
                    if (currentProject) projects.push(currentProject);
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
                    currentProject.description += ' ' + line;
                }
            }
        }
        return projects;
    }
}

// Runner function
(async () => {
    try {
        const imgPath = path.join(__dirname, '..', 'assets', 'finalresume-1.png');
        console.log('Running OCR on image...');

        const { data: { text } } = await Tesseract.recognize(
            imgPath,
            'eng',
            { logger: m => process.stdout.write('.') }
        );

        console.log('\n\n--- OCR Extracted Text ---\n');
        // console.log(text);

        const parser = new PDFParser();
        const name = parser.extractName(text);
        const email = parser.extractEmail(text);
        const phone = parser.extractPhone(text);
        const projects = parser.extractProjects(text);

        console.log('\n--- Extracted Information ---\n');
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Phone:', phone);
        console.log('Projects:', projects);

    } catch (error) {
        console.error("Error during OCR or parsing:", error);
    }
})();

module.exports = PDFParser;

