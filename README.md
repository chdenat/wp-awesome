<!--
 * This file is part of the wp-awesome package.
 *
 * File: README.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

# WP Awesome

WP Awesome helps you use WordPress as the content backend for a static [Eleventy](https://www.11ty.dev/) website.

- The `wp-awesome` JavaScript package fetches selected WordPress content, normalizes it, and makes it available to an Eleventy build.
- The setup assistant generates a starter frontend project.
- The optional WordPress plugin installs an MU-plugin that sends full-site, per-record, and automatic rebuild requests to your GitHub workflow.

Your project owns the build workflow and deployment. WP Awesome does not publish your site.

> **Alpha software.** As noted on the [documentation homepage](https://chdenat.github.io/wp-awesome/), this tool is partly vibe-coded and was built around the author's own setups. Expect changes and test on staging before production.

## Install

```sh
npm install wp-awesome
```

- [Documentation and setup assistant](https://chdenat.github.io/wp-awesome/)
- [Install the WordPress plugin](https://chdenat.github.io/wp-awesome/wp-awesome/)
- [npm package](https://www.npmjs.com/package/wp-awesome)

## Contribute

Contributions are welcome. [Open an issue](https://github.com/chdenat/wp-awesome/issues) to report a problem or suggest an improvement, or submit a [pull request](https://github.com/chdenat/wp-awesome/pulls). For code changes, start with [AGENTS.md](AGENTS.md) and [PROJECT_RULES.md](PROJECT_RULES.md).

## License

[MIT](LICENSE.md)
