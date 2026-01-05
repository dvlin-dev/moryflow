// test/fixtures/content-extraction/sites/portfolio-page.fixture.ts
import type { ContentFixture } from '../golden.schema';

/**
 * Personal portfolio page fixture
 * Simulates a developer/designer portfolio with minimal content
 * Key characteristics:
 * - Minimal main content
 * - Heavy navigation and social links
 * - Project showcases as links
 */
export const portfolioPageFixture: ContentFixture = {
  id: 'portfolio-page',
  description: 'Personal portfolio with minimal content and heavy navigation',
  url: 'https://portfolio.example.com/',

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Jane Doe - Full Stack Developer</title>
</head>
<body>
  <header class="site-header">
    <nav class="main-nav">
      <a href="/" class="logo">JD</a>
      <ul class="nav-links">
        <li><a href="#about">About</a></li>
        <li><a href="#work">Work</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
    <div class="social-links">
      <a href="https://github.com/janedoe" target="_blank">GitHub</a>
      <a href="https://linkedin.com/in/janedoe" target="_blank">LinkedIn</a>
      <a href="https://twitter.com/janedoe" target="_blank">Twitter</a>
    </div>
  </header>

  <main role="main">
    <section id="hero" class="hero">
      <h1>Hi, I'm Jane Doe</h1>
      <p class="tagline">Full Stack Developer specializing in React and Node.js</p>
    </section>

    <section id="about" class="about-section prose">
      <h2>About Me</h2>
      <p>I am a passionate full stack developer with over eight years of experience building web applications. I specialize in creating scalable, user-friendly solutions using modern technologies.</p>
      <p>My expertise spans frontend development with React and TypeScript, backend systems with Node.js and Python, and cloud infrastructure using AWS and Google Cloud Platform.</p>
      <p>When I'm not coding, you can find me contributing to open source projects, writing technical blog posts, or mentoring junior developers in the community.</p>
    </section>

    <section id="skills" class="skills-section">
      <h2>Skills</h2>
      <ul class="skills-list">
        <li>JavaScript and TypeScript</li>
        <li>React, Vue, and Angular</li>
        <li>Node.js and Express</li>
        <li>PostgreSQL and MongoDB</li>
        <li>Docker and Kubernetes</li>
        <li>AWS and Google Cloud</li>
      </ul>
    </section>

    <section id="work" class="work-section widget">
      <h2>Recent Projects</h2>
      <div class="project-grid">
        <a href="/project/ecommerce" class="project-card">E-commerce Platform</a>
        <a href="/project/dashboard" class="project-card">Analytics Dashboard</a>
        <a href="/project/mobile" class="project-card">Mobile App</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="contact-info" id="contact">
      <h3>Get in Touch</h3>
      <p>Email: jane@example.com</p>
    </div>
    <p class="copyright">&copy; 2024 Jane Doe. Built with love and coffee.</p>
  </footer>
</body>
</html>
  `.trim(),

  expected: {
    mustContain: [
      "Hi, I'm Jane Doe",
      'Full Stack Developer',
      'React and Node.js',
      'eight years of experience',
      'scalable, user-friendly solutions',
      'frontend development',
      'TypeScript',
      'cloud infrastructure',
      'open source projects',
      'mentoring junior developers',
    ],
    mustNotContain: [
      'GitHub</a>',
      'LinkedIn</a>',
      'Twitter</a>',
      'E-commerce Platform</a>',
      'Analytics Dashboard</a>',
      'Built with love',
    ],
    minLength: 400,
    maxLength: 2000,
  },

  metadata: {
    category: 'portfolio',
    hasNavigation: true,
    hasFooter: true,
    hasSidebar: false,
  },
};
