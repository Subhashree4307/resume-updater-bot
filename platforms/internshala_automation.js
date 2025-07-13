// Load environment variables
require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');
const Tesseract = require('tesseract.js');
const { extractProjectsFromOcrText } = require('../parsers/ocrExtractProjects');

const INTERN_LOGIN_URL = 'https://internshala.com/login';
const INTERN_PROFILE_URL = 'https://internshala.com/student/profile'; // Adjust if your profile/projects page URL is different

async function extractProjectsFromImage(imagePath) {
    const { data: { text } } = await Tesseract.recognize(
        imagePath,
        'eng',
        { logger: m => process.stdout.write('.') }
    );
    return extractProjectsFromOcrText(text);
}

async function getExistingProjects(page) {
    // Go to the project section
    await page.goto(INTERN_PROFILE_URL, { waitUntil: 'networkidle2' });
    // Wait for the project section to load (adjust selector as needed)
    await page.waitForSelector('.project_container, .project-section, .project-list');
    // Scrape project titles (adjust selector as needed)
    const projects = await page.evaluate(() => {
        // Try to find project titles in the DOM
        const nodes = document.querySelectorAll('.project_container .heading, .project-section .heading, .project-list .heading');
        return Array.from(nodes).map(n => n.innerText.trim());
    });
    return projects;
}

async function addProject(page, project) {
    // Click 'Add Project' button (adjust selector as needed)
    await page.click('button:has-text("Add Project")');
    await page.waitForSelector('input[name="title"], textarea[name="description"]');
    await page.type('input[name="title"]', project.title, { delay: 50 });
    await page.type('textarea[name="description"]', project.description, { delay: 50 });
    // Click save/submit (adjust selector as needed)
    await page.click('button:has-text("Save"), button:has-text("Submit")');
    await page.waitForTimeout(1000); // Wait for save
}

(async () => {
    const email = process.env.INTERNSHALA_EMAIL;
    const password = process.env.INTERNSHALA_PASSWORD;
    if (!email || !password) {
        console.error('Please set INTERNSHALA_EMAIL and INTERNSHALA_PASSWORD in your .env file');
        process.exit(1);
    }
    const imagePath = path.join(__dirname, '..', 'assets', 'finalresume-1.png');
    console.log('Extracting projects from resume...');
    const extractedProjects = await extractProjectsFromImage(imagePath);
    console.log('\nExtracted Projects:', extractedProjects);

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(INTERN_LOGIN_URL, { waitUntil: 'networkidle2' });

    console.log('Please log in manually in the browser window, solve the captcha, and press Enter here to continue...');
    process.stdin.once('data', async () => {
        // Go to dashboard (if not already there)
        await page.goto('https://internshala.com/student/dashboard', { waitUntil: 'networkidle2' });

        // Now go to the resume page
        await page.goto('https://internshala.com/student/resume', { waitUntil: 'networkidle2' });

        // Wait for the resume/projects section to load
        await page.waitForSelector('#project-resume', { visible: true });

        // Get existing projects
        const existingProjects = Array.from(new Set(await page.$$eval(
      'input[id^="project_title_"]',
      nodes => nodes.map(n => n.value.trim())
    )));
        console.log('Existing Projects on Internshala:', existingProjects);

        // Add new projects
        for (const project of extractedProjects) {
            if (!existingProjects.includes(project.title)) {
                // Click the add project button
                await page.click('#project-resume');
                // Wait for modal to appear
                await page.waitForSelector('#other_experiences_title', { visible: true });
                // Fill in the title
                await page.type('#other_experiences_title', project.title, { delay: 50 });
                // Wait for the rich text editor to be available
                await page.waitForSelector('.note-editable.card-block', { visible: true });

                // Set the description using innerHTML
                await page.evaluate((desc) => {
                  const editor = document.querySelector('.note-editable.card-block');
                  if (editor) {
                    editor.innerHTML = desc;
                    // Optionally trigger input/change event
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    editor.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }, project.description);
                // Optionally fill in the project link
                // await page.type('#other_experiences_project_link', project.link || '', { delay: 50 });
                // Set start and end dates (format: YYYY-MM, e.g., "2023-01")
                await page.evaluate(() => {
                  // Set start date to a fixed value (e.g., January 2023)
                  const startYear = 2023;
                  const startMonth = 1; // January
                  const startMonthStr = startMonth.toString().padStart(2, '0');
                  const startValue = `${startYear}-${startMonthStr}`;
                  document.getElementById('start_date_to_send').value = startValue;
                  const startInput = document.getElementById('other_experiences_project_start_date');
                  startInput.value = startValue;
                  startInput.dispatchEvent(new Event('input', { bubbles: true }));
                  startInput.dispatchEvent(new Event('change', { bubbles: true }));

                  // Set end date to current month and year
                  const now = new Date();
                  const endYear = now.getFullYear();
                  const endMonth = (now.getMonth() + 1).toString().padStart(2, '0');
                  const endValue = `${endYear}-${endMonth}`;
                  document.getElementById('end_date_to_send').value = endValue;
                  const endInput = document.getElementById('other_experiences_project_end_date');
                  endInput.value = endValue;
                  endInput.dispatchEvent(new Event('input', { bubbles: true }));
                  endInput.dispatchEvent(new Event('change', { bubbles: true }));
                });
                // Click Save
                await page.click('#project-submit');
                // Wait for the modal to close or for the new project to appear
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
        console.log('Done!');
        await browser.close();
    });
})(); 
// mohantysubhashree2005@gmail.com
