# Internshala Resume Updater Bot
A smart automation bot that scans your resume, detects new projects using OCR, and auto-updates the project section of your Internshala profile using browser automation (Puppeteer).
##  Features
-  OCR-powered resume scanning (Tesseract.js)
-  Extracts new projects intelligently
-  Uses Puppeteer to log in and update Internshala
-  Prevents duplicate project uploads
-  Web UI to upload and trigger automation
##  Built With

- **Node.js**
- **Express.js**
- **Puppeteer** (browser automation)
- **Tesseract.js** (OCR)
- **Multer** (file uploads)

## How to Run Locally

```bash
git clone https://github.com/your-username/resume-updater-bot.git
cd resume-updater-bot
npm install
node server.js
⚠️ You’ll need to log in manually on Internshala when prompted (due to captcha).

resume-bot/
├── assets/
├── parsers/
├── platforms/
├── public/
│   └── index.html
├── server.js
├── .env

