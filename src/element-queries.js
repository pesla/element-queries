/**
 * Element Queries is a tiny library that adds support for element based media-queries to all new browsers (incl. IE7+).
 *
 * @see (https://github.com/pesla/element-queries/blob/master/src/element-queries.js)
 * @author Peter Slagter
 * @copyright MIT (https://github.com/pesla/element-queries/blob/master/LICENSE)
 * @preserve
 */

require(["domready", "detect-resize"], function (domReady, ResizeDetection) {
	"use strict";

	/**
	 * @var selectorsToParse Contains all CSS selectors that need to be parsed and stored in the setup cache
	 * @type {Array}
	 */
	var selectorsToParse = [];

	/**
	 * @var setupCache Contains setup information for all elements that need to be setup for element queries
	 * @type {Array}
	 */
	var setupCache = [];

	/**
	 * @var elementQueryElements Contains a reference to all instances of ElementQueryElement
	 * @type {{}}
	 */
	var elementQueryElements = {};

	domReady(initializeElementQueries);

	/**
	 * Initialize element queries:
	 * 1. Read all CSSRules and grab selectors that match [min|max]-[width|height]
	 * 2. Filter out invalid selectors and break them into usable pieces
	 * 3. Setup an ElementQueryElement for each entry in setupCache
	 */
	function initializeElementQueries () {

		if (!ResizeDetection) {
			log('error', 'ElementQueryElements need some sort of element resize detection. `ResizeDetection` seems to be unavailable.');
			return;
		}

		if (typeof document.querySelectorAll !== 'function') {
			polyfillQuerySelectorAll();
		}

		if (typeof String.prototype.trim !== 'function') {
			polyfillStringTrim();
		}

		var i = 0,
			j = document.styleSheets.length;

		for (; i < j; i++) {
			// Try-Catch to work around cross-domain issues
			try {
				var selectors = getElementQuerySelectors(document.styleSheets[i].cssText || document.styleSheets[i].cssRules || document.styleSheets[i].rules);

				if (selectors.length > 0) {
					selectorsToParse = selectorsToParse.concat(selectors)
				}
			} catch (e) {
				log('error', 'Unable to read from file: ' + document.styleSheets[i].href);
			}
		}

		if (selectorsToParse.length < 1) {
			log('info', 'No selectors found to initialize.');
			return;
		}

		addSelectorsToParseToSetupCache();
		setupElementQueryElements();

		for (var key in elementQueryElements) {
			if (!elementQueryElements.hasOwnProperty(key)) {
				continue;
			}

			var element = elementQueryElements[key].element;

			elementQueryElements[key].callback.call(element);
		}
	}

	/**
	 * Read all CSSRules and grab the ones that match [min|max]-[width|height]
	 *
	 * @param {String}|{Array} rules
	 * @param {Array} tmpSelectors
	 * @returns {*}
	 */
	function getElementQuerySelectors (rules, tmpSelectors) {
		if (rules === null) {
			return [];
		}

		if ('string' === typeof rules) {
			var selector = rules.toLowerCase();

			if (isElementQuerySelector(selector)) {
				return [selector];
			}

			return [];
		}

		if (!tmpSelectors) {
			var tmpSelectors = [];
		}

		var i = 0,
			j = rules.length;

		for (; i < j; i++) {
			// Check for CSSRule type 1 (CSSStyleRule) or 4 (CSSMediaRule)
			// @see https://developer.mozilla.org/en-US/docs/Web/API/CSSRule
			if (rules[i].type === 1) {
				selector = rules[i].selectorText || rules[i].cssText;

				if (isElementQuerySelector(selector)) {
					tmpSelectors.push(selector);
				}
			} else if (4 === rules[i].type) {
				// Inside media query, read the rules it contains
				getElementQuerySelectors(rules[i].cssRules || rules[i].rules, tmpSelectors);
			}
		}

		return tmpSelectors;
	}

	/**
	 * Filter out invalid selectors, cut selector in usable parts and store the parts in setupCache
	 */
	function addSelectorsToParseToSetupCache () {
		var i = 0,
			j = selectorsToParse.length;

		for (; i < j; i++) {
			var selector = selectorsToParse[i],
				regex = /,?([^,\n]*)\[[\s\t]*(min|max)-(width|height)[\s\t]*[~$\^]?=[\s\t]*"([^"]*)"[\s\t]*]([^\n\s\{]*)/mgi,
				match;

			selector = selector.replace(/'/g, '"');

			while ((match = regex.exec(selector)) !== null) {
				if (match.length > 5) {
					var querySelector = match[1].trim();

					if (match[5] !== '') {
						querySelector = match[5].trim();
					}

					setupCache.push([querySelector, match[2], match[3], match[4]]);

					continue;
				}

				log('info', 'Didnt find all necessary parts for selector ' + selector);
				log('info', match);
			}
		}
	}

	/**
	 * Query selectors in setupCache and create an instance of ElementQueryElement for each actual DOM element
	 */
	function setupElementQueryElements () {
		var i = 0,
			l = setupCache.length;

		for (; i < l; i++) {
			var queryData = setupCache[i],
				selector = queryData[0];

			try {
				var elements = document.querySelectorAll(selector);

				if (!elements || elements.length < 1) {
					log('info', 'No elements found for selector ' + selector);
					continue;
				}

				var y = 0,
					z = elements.length;

				for (; y < z; y++) {
					var element = elements[y],
						elementId = identifyElement(element);

					if (!elementQueryElements[elementId]) {
						elementQueryElements[elementId] = new ElementQueryElement(element);
						ResizeDetection.addListener(element, elementQueryElements[elementId].callback);
					}

					elementQueryElements[elementId].addElementQuery({
						'mode': queryData[1],
						'property': queryData[2],
						'value': queryData[3]
					});
				}
			} catch (e) {
				log('error', 'Unable to perform querySelectorAll for selector: ' + selector);
			}
		}
	}

/** --- Factory for ElementQuery Elements --- */

	/**
	 *
	 * @param {HTMLElement} element
	 * @constructor
	 */
	function ElementQueryElement(element) {
		this.element = element;
		this.queries = [];

		this.addElementQuery = function(queryData) {
			this.queries.push(queryData);
		};

		/**
		 * Callback function passed to the resize listener
		 */
		this.callback = function (currentWidth, currentHeight) {
			var element = this;
			var ElementQueryElement = getElementQueryElementById(element.id);

			if (ElementQueryElement === null) {
				log('error', 'There is no instance of ElementQueryElement for element id ' + element.id);
				return;
			}

			var l = ElementQueryElement.queries.length,
				attrValues = {};

			currentWidth = currentWidth || element.offsetWidth;
			currentHeight = currentHeight || element.offsetHeight;


			for (var i = 0; i < l; i++) {
				var query = ElementQueryElement.queries[i],
					currentValueForQuery = (query.property === 'width') ? currentWidth : currentHeight,
					attrName = query.mode + '-' + query.property,
					value = parseFloat(query.value),
					attrValue = '';

				if (query.mode === 'min' && currentValueForQuery >= value) {
					attrValue = query.value;
				}

				if (query.mode === 'max' && currentValueForQuery <= value) {
					attrValue = query.value;
				}

				if (attrValue) {
					if (!attrValues[attrName]) {
						attrValues[attrName] = [];
					}

					var str = attrValues[attrName].join(' ');

					if (str.indexOf(attrValue) !== -1) {
						continue;
					}

					attrValues[attrName].push(attrValue);
				}
			}

			var allAttributes = ['min-width', 'min-height', 'max-width', 'max-height'];
			i = 0;
			l = allAttributes.length;

			for (; i < l; i++) {
				if (attrValues[allAttributes[i]]) {
					element.setAttribute(allAttributes[i], attrValues[allAttributes[i]].join(' '));
					continue;
				}

				element.removeAttribute(allAttributes[i]);
			}
		};

	}

/** --- Helper functions --- */

	/**
	 * Included IE7+ QSA polyfill
	 * @see https://gist.github.com/connrs/2724353
	 * @see https://gist.github.com/chrisjlee/8960575
	 */
	function polyfillQuerySelectorAll () {
		var styleSheet = document.createStyleSheet();

		document.querySelectorAll = function(selector) {
			selector = selector.replace(/\[for\b/gi, '[htmlFor').split(',');

			var found = [],
				docAll = document.all;

			for (var i = selector.length; i--;) {
				styleSheet.addRule(selector[i], 'k:v');

				for (var j = docAll.length; j--;) {
					docAll[j].currentStyle.k && found.push(docAll[j]);
				}
				styleSheet.removeRule(0);
			}

			return found;
		}
	}

	function polyfillStringTrim () {
		String.prototype.trim = function() {
			return this.replace(/^\s+|\s+$/g, '');
		};
	}

	/**
	 * @param {string} selector
	 * @returns {boolean}
	 */
	function isElementQuerySelector (selector) {
		return (
			selector.indexOf('min-height') !== -1
			|| selector.indexOf('max-height') !== -1
			|| selector.indexOf('min-width') !== -1
			|| selector.indexOf('max-width') !== -1
		);
	}

	/**
	 *
	 * @param {HTMLElement} element
	 * @returns {string}
	 */
	function identifyElement (element) {
		var id = element.id;

		if (id) {
			return id;
		}

		var idPrefix = 'element-query-element-';
		id = idPrefix + getObjectLength(elementQueryElements);

		element.id = id;

		return id;
	}

	/**
	 *
	 * @param {string} id
	 * @returns null|{ElementQueryElement}
	 */
	function getElementQueryElementById (id) {
		if (!elementQueryElements[id]) {
			return null;
		}

		return elementQueryElements[id];
	}

	/**
	 *
	 * @param {Object} obj
	 * @returns {Number}
	 */
	function getObjectLength (obj) {
		if (!Object.keys) {
			Object.keys = function (obj) {
				var arr = [],
					key;
				for (key in obj) {
					if (obj.hasOwnProperty(key)) {
						arr.push(key);
					}
				}
				return arr;
			};
		}

		return Object.keys(obj).length;
	}

	/**
	 *
	 * @param {string} type
	 * @param {string} message
	 * @private
	 */
	function log (type, message) {
		if (console) {
			console[type](message);
		}
	}
});