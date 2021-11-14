*ScrapBook X* is a legacy Firefox add-on that captures web pages to local device for future retrieval, organization, annotation, and edit. It is based on *ScrapBook* (by Gomita) and *ScrapBook Plus* (by haselnuss).

## Features

1. **Save web pages faithfully**: Web pages shown in the browser can be saved without losing any subtle detail. Metadata such as source URL and saving time are recorded for later reference.
2. **Save partial content**: You can save partial web content. You can decide whether to save images, audio and video files, fonts, frames, styles, and/or scripts. You can decide how to process saved styles. You can edit the web content before saving. You can save a web page as a bookmark. ... And more ways for saving are available for you.
3. **Extensive save**: You can save web pages and files linked by the web page, save multiple opened tabs, save a list of pages using a URL list, ..., and there are more batch saving functionality available for you.
4. **Manage data**: You can manage saved items with a tree structure, just as easy as managing the bookmarks.
5. **Search data**: You can search any fragment of the saved web pages with the built-in full-text engine.
6. **Edit data**: You can add highlights, comments, annotations, or even edit the source html for the saved pages.
7. **Take notes**: You can create note pages in ScrapBook, and edit them as easy as editing web pages.
8. **Input and output data**: You can combine multiple data items into one. You can generate HTML tree list and make a static scrapbook site. You can configure multi-ScrapBook databases that won't interfere with each other. You can import and export data items for backup or exchange.
9. **Addons**: Some Firefox add-ons can be integrated with ScrapBook to extend its power, such as [these ones](https://github.com/danny0838/firefox-scrapbook/wiki/Addons).

## Installation

Download the *.xpi* file of a desired version in the [releases list](https://github.com/danny0838/firefox-scrapbook/releases) with a Firefox-like browser and you are done.

* Be sure to **disable or remove ScrapBook, ScrapBook Plus, or other similar add-ons** to prevent a potential conflict.

* ScrapBook X, as a legacy Firefox add-on, is **not supported by Firefox Quantum (>= 57)**. It can still be installed in an older Firefox or a Firefox (Gecko) fork which still supports XUL/XPCOM, such as [WaterFox](https://www.waterfoxproject.org/), [Basilisk](https://basilisk-browser.org/), or [Pale Moon](https://www.palemoon.org/).

* Since Firefox 43, **add-ons are required to be signed** by Mozilla to be installable, while ScrapBook X > 1.14.5 are no more signed as Mozilla has stopped support of legacy add-on signing. To get the latest ScrapBook X work, use a Developer Edition, Nightly, ESR, or unbranded version of Firefox with `xpinstall.signatures.required` preference in `about:config` toggled `false` (read [the documentation](https://support.mozilla.org/en-US/kb/add-on-signing-in-firefox#w_what-are-my-options-if-i-want-to-use-an-unsigned-add-on-advanced-users) for details), or use an older Firefox version or a Firefox fork, as described in the previous point.

* ScrapBook X is **not compatible with Electrolysis (e10s)**. Be sure to disable e10s (check the `Multiprocess`-related fields in the `about:support` page) when using ScrapBook X or it may not function as expected.

## Usage
For usage guide, further information, frequently asked questions, or other details, visit the [documentation wiki](https://github.com/danny0838/firefox-scrapbook/wiki).

## Announcement
We are not going to implement support of e10s and WebExtension for ScrapBook X. For a WebExtension "port" of ScrapBook X, check [WebScrapBook](https://github.com/danny0838/webscrapbook), which is our successor project of ScrapBook X and works on many modern browsers.

We will keep basic maintenance for ScrapBook X. However, new features or anything that requires a large code rework are unlikely.
