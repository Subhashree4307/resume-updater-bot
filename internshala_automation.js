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
    const imagePath = path.join(__dirname, 'assets', 'finalresume-1.png');
    console.log('Extracting projects from resume...');
    const extractedProjects = await extractProjectsFromImage(imagePath);
    console.log('\nExtracted Projects:', extractedProjects);

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(INTERN_LOGIN_URL, { waitUntil: 'networkidle2' });
    // Click the login button to open the modal
    await page.click('button.login-cta');

    // Wait for the modal to appear
    await page.waitForSelector('#modal-login-form', { visible: true });

    // Fill in the modal's email and password fields
    await page.type('#modal_email', email, { delay: 50 });
    await page.type('#modal_password', password, { delay: 50 });

    // Click the modal's login/submit button
    await page.click('#modal_login_submit');

    // Wait for navigation or for the modal to disappear (choose one)
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    // OR, if the page doesn't navigate, wait for the modal to disappear:
    // await page.waitForSelector('#modal-login-form', { hidden: true });

    await page.goto('https://internshala.com/student/dashboard', { waitUntil: 'networkidle2' });

    // 1. Click the avatar/profile button to open the dropdown
    await page.click('a.profile_container');

    // 2. Wait for the dropdown to appear
    await page.waitForSelector('#profile-dropdown', { visible: true });

    // 3. Click the "Edit Resume" link
    await page.click('a[href="/student/interstitial"]');

    // 4. Wait for the resume edit page to load
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Get existing projects
    const existingProjects = await page.$$eval(
  'input[id^="project_title_"]',
  nodes => nodes.map(n => n.value.trim())
);
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
            // Fill in the description (rich text editor)
            await page.evaluate((desc) => {
              const editor = document.querySelector('.note-editable.card-block');
              if (editor) {
                editor.innerHTML = desc;
              }
            }, project.description);
            // Optionally fill in the project link
            // await page.type('#other_experiences_project_link', project.link || '', { delay: 50 });
            // Click Save
            await page.click('#project-submit');
            // Wait for the modal to close or for the new project to appear
            await page.waitForTimeout(1500);
        }
    }
    console.log('Done!');
    await browser.close();
})(); 