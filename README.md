# aonanj-style

A professional, minimalist Jekyll theme for GitHub Pages. Your repository's README becomes a readable site, with its identity, contents, and owner information arranged in three separate cards.

Pale blue surfaces. Navy typography. Room to read.

## Table of contents

- [Use the theme](#use-the-theme)
- [Repository details](#repository-details)
- [Icon and favicon](#icon-and-favicon)
- [README and table of contents](#readme-and-table-of-contents)
- [Layout and styling](#layout-and-styling)
- [Customization](#customization)
- [Local preview](#local-preview)
- [Theme development](#theme-development)
- [License and credits](#license-and-credits)

## Use the theme

The theme is shared through Jekyll's `remote_theme` setting. Any repository with a Jekyll-based GitHub Pages site can use it; no theme files need to be copied. The theme repository must be public and its theme files must be committed to the referenced branch before another repository can fetch them.

### 1. Add the configuration

Keep `README.md` in your site's publishing directory. Add this `_config.yml` alongside it, replacing `OWNER` and `REPOSITORY`:

```yaml
remote_theme: aonanj/aonanj-style@main
repository: OWNER/REPOSITORY

url: https://OWNER.github.io
baseurl: /REPOSITORY

plugins:
  - jekyll-remote-theme
  - jekyll-github-metadata
  - jekyll-readme-index
  - jekyll-optional-front-matter
  - jekyll-relative-links

defaults:
  - scope:
      path: ""
    values:
      layout: default

readme_index:
  enabled: true
  remove_originals: true
  with_frontmatter: true

relative_links:
  enabled: true
  collections: true
```

For an `OWNER.github.io` repository or a site at the root of a custom domain, use `baseurl: ""`. For a custom domain, also set `url` to that domain, including `https://`. Do not put the repository path in both `url` and `baseurl`.

Remove a previous `theme:` setting. Replace or remove conflicting layout defaults. Keep your existing unrelated configuration. Pin `remote_theme` to a commit SHA or a published release tag when you want updates to be deliberate; `@main` follows the latest committed theme.

### 2. Let the README be the home page

The supported `jekyll-readme-index` plugin renders `README.md` as `index.html`; YAML front matter in the README is optional. Move aside an existing `index.html`, `index.md`, or `index.markdown` if you want the README to become the home page. An existing index takes precedence.

If the README already has front matter, remove a conflicting `layout` or `permalink`. Other Markdown pages can use `layout: default` or `layout: page` as well.

### 3. Enable GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch**, select your publishing branch, and select **/(root)**. Remove `.nojekyll` if present, since this theme needs a Jekyll build. Push the configuration and README, then wait for the Pages build to finish.

If you publish from `/docs`, the configuration, README, `public/` assets, and optional `LICENSE.md` must all be inside `/docs`. Jekyll can only use files within its publishing source.

GitHub also supports and recommends deploying through **GitHub Actions**. If you use that route, choose its Jekyll workflow, retain the plugins above, and provide <code>JEKYLL_GITHUB_TOKEN: $&#123;&#123; secrets.GITHUB_TOKEN &#125;&#125;</code> to a custom Bundler build so repository metadata can be fetched. A private consuming repository needs a GitHub plan that supports Pages for private repositories; its source-repository link is hidden by this theme.

See GitHub's [theme setup guide](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/adding-a-theme-to-your-github-pages-site-using-jekyll) and [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Repository details

The header uses the consuming repository's name and About description. It links to the source repository only when metadata confirms that the repository is public. Unknown visibility keeps that link hidden. The footer uses the owner's public profile name, GitHub username, and public email when available. Metadata is collected at build time; rebuild the site after changing the repository's About text or owner profile.

Optional overrides go under `aonanj_style` in the consuming site's `_config.yml`:

```yaml
aonanj_style:
  repository_name: My project
  description: A short description of this repository.
  repository_url: https://github.com/OWNER/REPOSITORY
  # Only needed when public visibility cannot be obtained from GitHub metadata.
  repository_public: true
  owner:
    name: Your name or organization
    username: YOUR_GITHUB_USERNAME
    email: hello@example.com
```

All overrides are optional. Set `repository_public: false` to hide the source link. Confirmed private metadata always hides it, even if the override is `true`. Set `owner.email: false` to suppress a public profile email. The theme never guesses an email address or uses commit emails.

Put `LICENSE.md` at the root of your publishing directory to add the footer's left-aligned License link. A plain file links to the original Markdown. To render it as a themed page, put YAML front matter with `layout: page` and `title: License` at its top; the footer then links to `LICENSE.html`. A different license location can be set with `aonanj_style.license_url: /legal/license.html`; a full HTTPS URL is also supported.

## Icon and favicon

Use this structure in the consuming repository's publishing directory:

```text
.
├── _config.yml
├── README.md
├── LICENSE.md              # optional
└── public/
    ├── icon-64x64.png       # optional; .jpg also supported
    └── favicon.ico         # optional
```

The header automatically discovers `public/icon-64x64.png` or `public/icon-64x64.jpg`. PNG takes precedence if both exist. Supply a square image; it is displayed at **64 × 64 CSS pixels** with **12% rounded corners**. No empty placeholder appears when an icon is absent.

Save a real ICO image as **`public/favicon.ico`** and commit it. An ICO containing 16 × 16, 32 × 32, and 48 × 48 images works well. The theme automatically adds the favicon `<link>` using the site's `baseurl`, so project sites work correctly. Simply renaming a PNG file to `.ico` does not convert it.

A root-level `favicon.ico` is also detected, after `public/favicon.ico`. To use another location:

```yaml
aonanj_style:
  favicon: /assets/icons/favicon.ico
```

Use a path relative to the publishing root; do not add the `baseurl` yourself. Set `favicon: false` to disable the link. Browsers cache favicons aggressively; a hard refresh or a new private window may be needed after replacing one. The repository icon and favicon are separate files.

## README and table of contents

The README is rendered as the body card. A small dependency-free script moves an existing table of contents into the header, preserving nested lists and their links. It does not generate a new TOC or remove other README content.

Recognized formats include:

- A **Table of contents**, **Contents**, or **TOC** heading followed by an ordered or unordered list with links to this page's sections. That list may also link to other documentation.
- A paragraph with that same label, including a bold label, followed by the list.
- A `<details>` element with a summary using one of those labels.
- Kramdown's `#markdown-toc` list.
- An explicit wrapper with `data-toc`, or a `nav` with `aria-label="Table of contents"`.

Use Markdown headings and matching fragment links, for example:

```markdown
## Table of contents

- [Installation](#installation)
- [Usage](#usage)
  - [Configuration](#configuration)

## Installation

Your installation instructions.

## Usage

Your usage instructions.

### Configuration

Your configuration reference.
```

Keep TOC lists directly after their label. For a custom format or a list enclosed in generator comments, wrap that section in `<div data-toc markdown="1">…</div>` so its boundaries are explicit. Comments alone do not identify a TOC. Only the first recognized TOC is moved. Unrecognized structures remain in the body, preserving their content.

The theme retains existing heading IDs. It repairs a missing TOC target when Kramdown adds a `section-` prefix or when the link text uniquely matches a heading. For duplicate or unusual headings, use explicit HTML anchors in your README. The `jekyll-relative-links` plugin handles links to other Markdown files in the site.

With JavaScript disabled, the complete rendered README—including its TOC—stays in the body card. Moving the TOC, marking external links, and adding accessible table scroll regions are progressive enhancements. There are no runtime API requests, external JavaScript packages, analytics, or remote fonts.

## Layout and styling

The three cards share a restrained palette and rounded borders:

| Element | Color |
| --- | --- |
| Page background | `#EFF4F8` |
| Card background | `#EAF6FF` |
| Primary text | `#102A43` |
| Brand and links | `#3A506B` |
| Accent | `#5FA8D2` |
| Borders | `#CAD2D9` |
| Link hover | `#C70714` |

The complete supplied palette is available as CSS custom properties in `assets/css/aonanj-style.css`. The darker brand and hover colors keep links readable on the pale surfaces.

- Readable body content defaults to **960px**, with card padding outside that width. The layout contracts to the viewport on mobile.
- List items share the same modest vertical gap at every nesting level. Nested lists and paragraph-style lists avoid extra top and bottom padding.
- Tables use alternating row shading. Their visible scroll regions occupy **33%–75% of the body content width**, including on mobile; wide cell content scrolls inside that region. This preserves the requested maximum without squeezing wide tables into unreadable columns.
- Links use a different color from primary text and underline with a color change on hover. Only HTTP(S) links to a different origin receive **🔗** (U+1F517). Same-origin links, fragment links, `mailto:`, and `tel:` links do not receive the marker.
- The repo name, optional icon, and source link share a desktop header row. The source link moves to its own right-aligned row on narrow screens.
- The license and owner share a footer row; owner details wrap on small screens. The final footer line credits Phaethon Order LLC and links to this theme.

## Customization

Add `_includes/aonanj-style/custom-head.html` to your own site to load additional styles:

<pre><code>&lt;link rel="stylesheet" href="&#123;&#123; '/assets/css/custom.css' | relative_url &#125;&#125;"&gt;</code></pre>

Then create `assets/css/custom.css`. For example:

```css
:root {
  --content-width: 960px;
  --list-item-gap: 0.4rem;
}
```

You can also override `_includes/aonanj-style/header.html`, `_includes/aonanj-style/footer.html`, or `_layouts/default.html` by creating the same path in your site. These overrides take precedence over the remote theme, so copied files no longer receive upstream changes. Additional `home` and `page` layout aliases are included for existing Jekyll sites.

## Local preview

Use Ruby 3.3 and Bundler for the GitHub Pages-compatible development stack. In a consuming repository, add a `Gemfile`:

```ruby
source "https://rubygems.org"
gem "jekyll", "~> 3.10.0"
gem "kramdown", "~> 2.4.0"
gem "kramdown-parser-gfm", "~> 1.1"
gem "jekyll-remote-theme", "~> 0.4.3"
gem "jekyll-github-metadata", "~> 2.16"
gem "jekyll-readme-index", "~> 0.3.0"
gem "jekyll-optional-front-matter", "0.3.2"
gem "jekyll-relative-links", "~> 0.6.1"
gem "webrick"
gem "base64"
gem "csv"
gem "logger"
```

Then run:

```sh
bundle install
bundle exec jekyll serve --livereload
```

Open the URL printed by Jekyll, including the repository's base path. If GitHub API metadata is unavailable, use the documented overrides or supply `JEKYLL_GITHUB_TOKEN` through your environment. Do not put a token in `_config.yml` or source files. Restart Jekyll after changing `_config.yml`.

## Theme development

This repository's `_config.yml` builds its own README as the demo. Consumers should use the configuration under [Use the theme](#use-the-theme), not copy the demo's repository-specific values.

```sh
bundle install
npm ci
bundle exec ruby test/build_test.rb
npm test
bundle exec jekyll build --strict_front_matter
npm run test:rendered
bundle exec jekyll serve
```

The build tests exercise a separate consumer through the GitHub Pages-compatible remote-theme loader, using a local archive in place of the network download. They cover metadata, visibility, optional assets, root and project paths, Markdown rendering, and license links. The JavaScript tests cover TOC relocation, fragment repair, external-link classification, and table accessibility. The rendered-site check verifies the actual generated README, its TOC targets, local assets, and text contrast. These checks also run in the included GitHub Actions workflow; that workflow validates the theme without deploying it. Node is used only for development tests; visitors and consuming sites need no Node build step.

## License and credits

Released under the [MIT License](LICENSE.md).

Theme owner: [Phaethon Order LLC](https://www.phaethonorder.com). Theme repository: [aonanj/aonanj-style](https://github.com/aonanj/aonanj-style).
