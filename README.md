Element Queries
===================

Element Queries is a tiny library that adds support for element based media-queries to all new browsers (incl. IE7+).

This library is heavily based on:

- https://github.com/marcj/css-element-queries/
- https://github.com/sdecima/javascript-detect-element-resize

I wrote a combination of those two excellent examples because:

- The resize detection in `marcj`'s library seemed to be unreliable during testing.
- The ability to load a library async with requirejs (or another loader) is one of my requirements.
- I found several issues on both sides (ElementQueryElement creation and resize detection) that needed to be fixed.

Features:

- VanillaJS, no framework code.
- Only depends on requirejs to load the modules and `domReady` to set it up. Easy to modify so that there are no dependencies at all.
- No use of `window.onresize`, so less performance issues. Based on the work of [@csuwildcat](https://github.com/csuwildcat) ([blog](http://www.backalleycoder.com/about/)).
- No interval/timeout detection.
- Just write CSS and it works; uses regular attribute selector.
- Supports and tested in webkit, gecko and IE(7/8/9/10/11).
- Supports `min-width`, `min-height`, `max-width` and `max-height` declarations.

Example
-------

```css
.widget-name {
    padding: 25px;
}

.widget-name[min-width~="500px"] {
    padding: 55px;
}

.widget-name[max-width~="200px"] {
    padding: 0;
}
```

Installation
------

If you manage your JS modules with require, all you have to do is include the Javascript-file in `/dist` into your project:

```html
<script src='dist/element-queries.min.js'></script>
```

After that, just write your CSS and let the magic happen.

In short, the Javascript:

1. Reads all CSSRules and grabs selectors that match [min|max]-[width|height].
2. Filters out invalid selectors and breaks them into usable pieces.
3. Initializes resize detection for each valid selector.
4. Fires a callback whenever an element has resized.
5. Determines whether or not one of the element queries apply to the current element dimensions and sets the related attribute.

Remarks
------

- Does not work on `img` and other elements that can't contain other elements. Wrapping with a `div` works fine.
- The resize detector adds additional elements into the target element. The target element is forced to be `position: relative;`.
- Depends on RequireJS. It's easy to adjust the `/src` files so that they support another module loader. Making them independent of a module loader is very easy aswell.

License
-------

MIT license.