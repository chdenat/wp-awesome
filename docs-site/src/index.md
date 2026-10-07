---
layout: layouts/docs.njk
title: "WordPress backend, headless frontend | WP Awesome"
section: Overview
description: WP Awesome connects WordPress to an Eleventy frontend and includes an optional WordPress plugin for global, per-content, and automatic build requests.
permalink: index.html
templateEngineOverride: njk,md
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/index.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

<section class="home-hero wa-stack wa-gap-xl" aria-labelledby="home-title">
  <h1 class="hero-heading" id="home-title">
    <span>Keep WordPress as your backend.</span>
    <span>Build a headless frontend around it.</span>
  </h1>
  <p class="hero-lede">WP Awesome keeps your content in WordPress and gives you a Build Awesome (Eleventy) site to present it.</p>
  <div class="hero-split wa-grid wa-gap-xl">
    <ul class="hero-stack" aria-label="Frontend components">
      <li><wa-icon class="brand-build-awesome" family="brands" name="build-awesome" aria-hidden="true"></wa-icon><span>Build Awesome powers the build.</span></li>
      <li><wa-icon class="brand-web-awesome" family="brands" name="web-awesome" aria-hidden="true"></wa-icon><span>Web Awesome supplies the components.</span></li>
      <li><wa-icon class="brand-font-awesome" family="brands" name="font-awesome" aria-hidden="true"></wa-icon><span>Font Awesome supplies the icons.</span></li>
    </ul>
    <div class="hero-actions wa-stack wa-gap-xs">
      <wa-button variant="brand" appearance="accent" href="{{ '/setup-assistant/' | url }}">
        Generate your frontend
        <wa-icon slot="end" name="arrow-right" aria-hidden="true"></wa-icon>
      </wa-button>
      <wa-button appearance="outlined" href="{{ '/publishing-and-hosting/' | url }}">
        <wa-icon slot="start" name="list-check" aria-hidden="true"></wa-icon>
        Local, staging, production
      </wa-button>
    </div>
  </div>

  <wa-callout class="hero-callout" variant="brand" appearance="filled-outlined">
    <wa-icon slot="icon" name="circle-info" aria-hidden="true"></wa-icon>
    Work locally, verify the site on staging, then publish to production.
  </wa-callout>

  <wa-callout class="hero-callout" variant="warning" appearance="filled-outlined">
    <wa-icon slot="icon" name="plug" aria-hidden="true"></wa-icon>
    <strong>To request builds from WordPress, install and activate the WP Awesome WordPress plugin.</strong>
    It adds the global build button, per-content actions, and automatic rebuild requests. Activation installs its companion MU-plugin. This plugin is separate from the frontend package.
    Its WordPress interface is available in English by default and French, following the current WordPress admin language.
    <a href="/wp-awesome/">Install and configure the WordPress plugin</a>.
  </wa-callout>

</section>

<wa-callout class="alpha-warning" variant="warning" appearance="filled-outlined">
  <wa-icon slot="icon" name="triangle-exclamation" aria-hidden="true"></wa-icon>
  <div class="alpha-warning-content">
    <p><strong>This tool is in alpha.</strong> It is partly vibe-coded and aims to automate as much as possible when using a headless Build Awesome frontend (aka Eleventy).</p>
    <p>It was built to fit my own setups, but its architecture can accommodate new global or project-specific rules, as well as support for additional WordPress plugins.</p>
  </div>
</wa-callout>

<p>WP Awesome connects your WordPress backend to an Eleventy frontend. Use the assistant to generate the project and learn exactly where each file goes.</p>

<section class="benefits-section" aria-labelledby="benefits-title">
  <div class="section-heading">
    <p class="eyebrow">Your site workflow</p>
    <h2 id="benefits-title">One clear path from content to website</h2>
    <p>Keep the familiar WordPress backend and use a frontend stack built around Eleventy.</p>
  </div>
  <div class="benefits-grid wa-grid wa-gap-m">
    <wa-card class="feature-card feature-wordpress" appearance="filled-outlined">
      <div slot="header" class="feature-heading"><span class="feature-icon"><wa-icon family="brands" name="wordpress-simple" aria-hidden="true"></wa-icon></span><h3>WordPress stays your backend</h3></div>
      <p>Manage pages and posts where your editors already work. WP Awesome reads the content selected for your frontend.</p>
    </wa-card>
    <wa-card class="feature-card feature-build" appearance="filled-outlined">
      <div slot="header" class="feature-heading"><span class="feature-icon"><wa-icon class="brand-build-icon" family="brands" name="build-awesome" aria-hidden="true"></wa-icon></span><h3>Eleventy headless frontend</h3></div>
      <p>Generate the frontend project, preview it on your computer, and adapt its pages to your WordPress content.</p>
    </wa-card>
    <wa-card class="feature-card feature-web" appearance="filled-outlined">
      <div slot="header" class="feature-heading"><span class="feature-icon"><wa-icon class="brand-web-icon" family="brands" name="web-awesome" aria-hidden="true"></wa-icon></span><h3>Web Awesome components</h3></div>
      <p>Build pages with Web Awesome components and Font Awesome icons, then test every change on staging before production.</p>
    </wa-card>
  </div>
</section>

<section class="integrations-section" aria-labelledby="integrations-title">
  <div class="section-heading">
    <p class="eyebrow">Gutenberg content</p>
    <h2 id="integrations-title">Supported blocks are listed up front</h2>
    <p>The assistant shows the fixed block list WP Awesome handles when it reads saved Gutenberg content.</p>
  </div>
  <div class="integration-list wa-cluster wa-gap-2xs" aria-label="Supported WordPress blocks">
    {% for name in site.supportedBlockNames %}<wa-tag variant="brand"><wa-icon name="check" aria-hidden="true"></wa-icon> {{ name }}</wa-tag>{% endfor %}
  </div>
  <p class="integration-detail">This is the built-in starter list. The assistant displays it without asking you to enter block names.</p>
  <p class="testing-note"><wa-icon name="triangle-exclamation" aria-hidden="true"></wa-icon> Any other saved block needs rendered WordPress HTML. Test your actual content on staging before approving production.</p>
</section>

<section class="next-step wa-split wa-gap-m" aria-labelledby="next-title">
  <div><p class="eyebrow">Start here</p><h2 id="next-title">Generate the frontend and follow each step</h2><p>The assistant creates the files and explains where to save them, how to preview locally, and how to test staging before production.</p></div>
  <wa-button variant="brand" appearance="accent" href="{{ '/setup-assistant/' | url }}">Open the setup assistant <wa-icon slot="end" name="arrow-right" aria-hidden="true"></wa-icon></wa-button>
</section>

`beautiful.wp.site` is a documentation placeholder. Replace it with the address of your WordPress backend.
