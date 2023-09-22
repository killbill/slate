# API docs

Kill Bill API documentation.

The site is built using [Middleman](https://github.com/middleman/middleman). See also https://github.com/slatedocs/slate.

## Edit and Syntax

The documentation is in the `source/includes` directory.

Markdown syntax: https://github.com/slatedocs/slate/wiki/Markdown-Syntax

## Development

To run the site locally:

```
middleman server
```

Prerequisites:

* Install Ruby (use [RVM](https://rvm.io/) or [RubyInstaller](https://rubyinstaller.org/))
* Run `bundle install`

## Deployment

To generate the files:

```
middleman build
```

Notes:

* The generated static pages under `build` are deployed by Cloudflare (https://apidocs.killbill.io/)
* The built pages are also pushed to the `gh-pages` branch for debugging (served by GitHub pages at https://killbill.github.io/slate/ for backward compatibility)
* Minification of assets is handled by Cloudflare (check-in the unminified version)
