# Changelog

## [0.0.3](https://github.com/birdcar/markdown-js/compare/markdown-v0.0.2...markdown-v0.0.3) (2026-03-11)


### ⚠ BREAKING CHANGES

* FootnoteRefNode and FootnoteDefNode now require an index field. Footnote defs moved from tree.children to root.footnotes array.

### Features

* add 9 directive types to BFM parser ([d558d0c](https://github.com/birdcar/markdown-js/commit/d558d0c6672b39804ea398583654f9becdc8ceed))
* Add computed footnotes metadata and mergeAndExtract convenience ([e1060cd](https://github.com/birdcar/markdown-js/commit/e1060cd9c264002d9579843049b6e26ba7ed8873))
* add front-matter, hashtags, metadata extraction, and document merging ([a8163fd](https://github.com/birdcar/markdown-js/commit/a8163fdceba55192c85e2d9b7b9585b6b6e62a94))
* add Pandoc-style footnote syntax ([ec98c9f](https://github.com/birdcar/markdown-js/commit/ec98c9fd4659862fcf3c6991ed0ab2c55bd204c8))
* Add platform-prefixed mentions ([2c756c4](https://github.com/birdcar/markdown-js/commit/2c756c4141ae5d760f6d4fbe162b059b49543094))
* implement BFM remark plugin suite ([e949861](https://github.com/birdcar/markdown-js/commit/e9498610ec46026cde7f49dbef1ce6b493864da3))
* Overhaul footnotes for BFM spec conformance ([dede9b9](https://github.com/birdcar/markdown-js/commit/dede9b94fb16fca66b06f24806f5548dc0d8b154))


### Bug Fixes

* **ci:** Checkout submodules for spec fixtures in publish workflow ([95c8303](https://github.com/birdcar/markdown-js/commit/95c830306e6f9d4f01890265d79784543dbc1302))
* **ci:** Use Node 24 and OIDC for npm trusted publishing ([f34c689](https://github.com/birdcar/markdown-js/commit/f34c689d88b9d026de7fb527ef5f8b2da4df7dce))
* Directive conformance for toc, tabs, endnotes, math, include, query ([e0214b2](https://github.com/birdcar/markdown-js/commit/e0214b2bd4ed777810891bee6a29e00e73462a66))
* Pin initial release-please version to 0.0.3 ([67464d1](https://github.com/birdcar/markdown-js/commit/67464d18b669100cd86abe02be8ae3bb5767c69b))
* Trigger patch release for workflow validation ([c63cba7](https://github.com/birdcar/markdown-js/commit/c63cba7f7fee7e239b4b20891263773ef8da6018))
