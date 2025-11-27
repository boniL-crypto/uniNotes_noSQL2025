<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">

<body>
<div class="wrapper">

<h1>UniNotes — Admin & Student Portal</h1>

<p>A lightweight notes-sharing platform for a university. This repository contains the server, admin views, public student views, and utilities used by UniNotes.</p>

<p>This documentation includes quickstart, setup, roles, permissions, scripts, and development notes.</p>

<hr>

<div class="section">
    <h2>Quick overview</h2>
    <ul>
        <li>Node.js + Express backend</li>
        <li>MongoDB (Mongoose)</li>
        <li>Server-rendered admin pages</li>
        <li>Static HTML for student pages</li>
        <li>RBAC with Roles + permission middleware</li>
    </ul>
</div>

<div class="section">
    <h2>Prerequisites</h2>
    <ul>
        <li>Node.js (>= 16 recommended)</li>
        <li>npm or yarn</li>
        <li>MongoDB (local or cloud)</li>
    </ul>
</div>

<div class="section">
    <h2>Install</h2>

    1. Clone the repo
<pre><code>git clone &lt;your-repo-url&gt;
cd msu-uninotes
</code></pre>

    2. Install dependencies
<pre><code>npm install</code></pre>
</div>

<!-- NEW UPDATED FULL README STARTS HERE -->

<div class="section">
    <h1>uniNotes (UniNotes_noSQL2025)</h1>
    <p>Comprehensive documentation for UniNotes — the notes-sharing portal for university students and administrators.</p>
    <p><strong>Generated/updated:</strong> 2025-11-28</p>
</div>

<div class="section">
    <h2>Contents</h2>
    <ul>
        <li>Project overview</li>
        <li>Features</li>
        <li>Tech stack</li>
        <li>Quickstart</li>
        <li>Environment variables</li>
        <li>Useful scripts</li>
        <li>Project structure</li>
        <li>Roles & permissions</li>
        <li>Development notes</li>
        <li>Testing</li>
        <li>Deployment</li>
        <li>Troubleshooting</li>
        <li>Contributing</li>
    </ul>
</div>

<div class="section">
    <h2>Project overview</h2>
    <p>UniNotes is a Node.js/Express application using MongoDB as the database. It supports two main experiences:</p>

   
        <li><strong>Admin interface:</strong> Manage users, notes, reports, and notifications.</li>
        <li><strong>Student/public interface:</strong> Browse, upload, manage notes, collections, and notifications.</li>
    
</div>

<div class="section">
    <h2>Features</h2>
    <ul>
        <li>Upload and manage study notes (stored in <code>uploads/notes</code>)</li>
        <li>RBAC with <em>super_admin</em>, <em>admin</em>, <em>moderator</em>, <em>student</em></li>
        <li>Admin dashboard with moderation and reporting tools</li>
        <li>Student features: upload/like/download/report notes, manage collections</li>
        <li>Email utilities and notification templates</li>
        <li>Background scripts for migrations and role seeding</li>
    </ul>
</div>

<div class="section">
    <h2>Tech stack</h2>
    <ul>
        <li>Node.js (>=16)</li>
        <li>Express.js</li>
        <li>MongoDB + Mongoose</li>
        <li>HTML + client JS (admin + public views)</li>
    </ul>
</div>

<div class="section">
    <h2>Quickstart (development)</h2>

<pre><code># Clone project
git clone &lt;your-repo-url&gt; "uni-notes"
cd "uni-notes"

# Install deps
npm install

# Create .env
PORT=5000
MONGO_URI=mongodb://localhost:27017/uninotes
JWT_SECRET=devsecret
NODE_ENV=development

# Seed roles
node scripts/seedRoles.js

# Start dev
npm run dev

# OR start normally
node server.js
</code></pre>

    <p>Open the app at: <strong>http://localhost:5000</strong></p>
</div>

<div class="section">
    <h2>Environment variables</h2>
    <ul>
        <li><code>PORT</code></li>
        <li><code>MONGO_URI</code></li>
        <li><code>JWT_SECRET</code></li>
        <li><code>NODE_ENV</code></li>
        <li><code>SMTP_HOST</code>, <code>SMTP_USER</code>, etc. (optional)</li>
    </ul>
</div>

<div class="section">
    <h2>Useful scripts</h2>
    <ul>
        <li><code>node server.js</code></li>
        <li><code>npm run dev</code></li>
        <li><code>node scripts/seedRoles.js</code></li>
        <li><code>node seedAdmin.js</code> (if included)</li>
    </ul>
</div>

<div class="section">
    <h2>Project structure</h2>
    <ul>
        <li><strong>server.js</strong> — entry point</li>
        <li><strong>routes/</strong> — Express routes</li>
        <li><strong>controllers/</strong> — route handlers</li>
        <li><strong>services/</strong> — logic modules</li>
        <li><strong>models/</strong> — database schemas</li>
        <li><strong>middleware/</strong> — auth & permissions</li>
        <li><strong>public/</strong> — student/public static files</li>
        <li><strong>views/</strong> — admin server-rendered pages</li>
        <li><strong>scripts/</strong> — backend utilities</li>
        <li><strong>docs/</strong> — architecture & diagrams</li>
    </ul>
</div>

<div class="section">
    <h2>Roles & permissions</h2>
    <p>Roles are enforced via <code>middleware/permissions.js</code> using <code>requirePermission()</code>.</p>

    <h3>Roles:</h3>
    <ul>
        <li><strong>super_admin</strong> — full access</li>
        <li><strong>admin</strong> — user/notification management</li>
        <li><strong>moderator</strong> — moderate notes & reports</li>
        <li><strong>student</strong> — personal notes & collections</li>
    </ul>
</div>

<div class="section">
    <h2>Development notes</h2>
    <ul>
        <li>Admin UI uses shared global JS functions</li>
        <li>Uploads require file-system write access</li>
        <li>Business logic should live in <code>/services</code></li>
        <li>Email features use <code>utils/mailer.js</code></li>
    </ul>
</div>

<div class="section">
    <h2>Testing</h2>
<pre><code>npm test</code></pre>
</div>

<div class="section">
    <h2>Deployment</h2>
    <ul>
        <li>Use secure environment variables</li>
        <li>Persist uploads on real storage (S3, shared disk)</li>
        <li>Run <code>seedRoles.js</code> during deploy</li>
    </ul>
</div>

<div class="section">
    <h2>Troubleshooting</h2>
    <ul>
        <li>404 on uploaded files → check <code>uploads/</code> exists</li>
        <li>Missing admin JS → check browser console</li>
        <li>Permission errors → inspect <code>req.user</code></li>
    </ul>
</div>

<div class="section">
    <h2>Contributing</h2>
    <p>Fork → branch → pull request. Update docs when changing roles/models.</p>
</div>

<div class="footer">
    <p>Generated on: 2025-11-28</p>
</div>

</div>
</body>
</html>



