/**
 * Performance friendly element resize detection (using scroll events)
 *
 * @see (https://github.com/pesla/element-queries/blob/master/src/detect-resize.js)
 * @author Peter Slagter
 * @copyright MIT (https://github.com/pesla/element-queries/blob/master/LICENSE)
 * @preserve
 */

define(function () {
	"use strict";

	/** @type {Object} */
	var attachEvent = document.attachEvent;

	if (attachEvent) {
		return {
			'addListener': addListener,
			'removeListener': removeListener
		};
	}

	/** @type {Object} */
	var cssAnimationData = {};
	/** @type {{}}*/
	var elementQueryData = {};

	setup();

	function setup () {
		cssAnimationData = getCSSAnimationData();

		if (!window.requestAnimationFrame || !window.cancelAnimationFrame) {
			setupRAF();
		}

		createResizeSensorStyles();
	}

	/**
	 * Adds a resize listener for given element. IE uses `onresize` event, other browsers use an `onscroll` technique
	 *
	 * @see http://www.backalleycoder.com/2013/03/18/cross-browser-event-based-element-resize-detection/
	 * @param {HTMLElement} element
	 * @param {Function} callback
	 */
	function addListener (element, callback) {
		if (attachEvent) {
			element.attachEvent('onresize', function () {
				callback.call(element);
			});

			return;
		}

		var elementId = element.id;

		if (!elementId) {
			log('error', 'Element has been passed to addListener but hasnt been identified yet.')
			return;
		}

		if (!elementQueryData[elementId]) {
			setupElementQueryElement(element, callback);
		}
	}

	/**
	 *
	 * @param {HTMLElement} element
	 * @param {Function} callback
	 */
	function removeListener (element, callback) {
		if (attachEvent) {
			element.detachEvent('onresize', callback);
			return;
		}

		var queryData = elementQueryData[element.id];

		if (queryData) {
			element.removeEventListener('scroll', handleOnElementScroll);
			element.removeChild(queryData.triggerElements.container);
			delete elementQueryData[element.id];
		}
	}

	/**
	 * Adds a style block that contains CSS for resize trigger elements
	 */
	function createResizeSensorStyles () {
		var css = [
			(cssAnimationData.keyframesRule) ? cssAnimationData.keyframesRule : '',
			'.resize-triggers { ' + ((cssAnimationData.styleDeclaration) ? cssAnimationData.styleDeclaration : '') + ' visibility: hidden; opacity: 0; }',
			'.resize-triggers, .resize-triggers > div, .contract-trigger:before { content: \" \"; display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; } .resize-triggers > div { background: #eee; overflow: auto; } .contract-trigger:before { width: 200%; height: 200%; }',
		];

		css = css.join(' ');

		var headElem = document.head || document.getElementsByTagName('head')[0],
			styleElem = document.createElement('style');

		styleElem.type = 'text/css';

		if (styleElem.styleSheet) {
			styleElem.styleSheet.cssText = css;
		} else {
			styleElem.appendChild(document.createTextNode(css));
		}

		headElem.appendChild(styleElem);
	}

	/**
	 * Sets up data and event handlers for a element query element
	 *
	 * @param {HTMLElement} element
	 * @param {Function} callback
	 */
	function setupElementQueryElement (element, callback) {
		// Evaluate it's CSS position
		var position = getStyle(element, 'position');

		if (position === 'static') {
			element.style.position = 'relative';
		}

		// Create and append resize trigger elements
		var resizeTrigger = document.createElement('div'),
			expandTrigger = document.createElement('div'),
			expandTriggerChild = document.createElement('div'),
			contractTrigger = document.createElement('div');

		resizeTrigger.className = 'resize-triggers';
		expandTrigger.className = 'expand-trigger';
		contractTrigger.className = 'contract-trigger';

		expandTrigger.appendChild(expandTriggerChild);
		resizeTrigger.appendChild(expandTrigger);
		resizeTrigger.appendChild(contractTrigger);

		element.appendChild(resizeTrigger);

		// Store data about this elementQueryElement
		elementQueryData[element.id] = {
			'targetElement': element,
			'resizeLast': {},
			'callbackFunction': callback,
			'triggerElements': {
				'container': resizeTrigger,
				'expand': expandTrigger,
				'expandChild': expandTriggerChild,
				'contract': contractTrigger
			},
			'resizeRAF': null
		};

		element.addEventListener('scroll', handleOnElementScroll, true);

		if (cssAnimationData.isSupported) {
			resizeTrigger.addEventListener(cssAnimationData.animationStartEvent, function (event) {
				if (event.animationName === cssAnimationData.animationName) {
					resetTriggers(element);
				}
			});
		}
	}

	function handleOnElementScroll () {
		var element = this,
			queryData = elementQueryData[element.id];

		resetTriggers(element);

		if (queryData.resizeRAF) {
			window.cancelAnimationFrame(queryData.resizeRAF);
		}

		queryData.resizeRAF = window.requestAnimationFrame( function () {
			var currentTriggerDimensions = getTriggerDimensions(element),
				resizeLast = queryData.resizeLast;

			if (currentTriggerDimensions.width != resizeLast.width || currentTriggerDimensions.height != resizeLast.height) {
				resizeLast.width = currentTriggerDimensions.width;
				resizeLast.height = currentTriggerDimensions.height;
				queryData.callbackFunction.call(element, currentTriggerDimensions.width, currentTriggerDimensions.height);
			}
		});
		
	}

	/**
	 * @param {HTMLElement} element
	 */
	function resetTriggers (element){
		var elementId = element.id,
			expand = elementQueryData[elementId].triggerElements.expand,
			contract = elementQueryData[elementId].triggerElements.contract,
			expandChild = elementQueryData[elementId].triggerElements.expandChild;

		contract.scrollLeft = contract.scrollWidth;
		contract.scrollTop = contract.scrollHeight;
		expandChild.style.width = expand.offsetWidth + 1 + 'px';
		expandChild.style.height = expand.offsetHeight + 1 + 'px';
		expand.scrollLeft = expand.scrollWidth;
		expand.scrollTop = expand.scrollHeight;
	}

	/**
	 *
	 * @param {HTMLElement} element
	 * @returns {{width: number, height: number}}
	 */
	function getTriggerDimensions (element) {
		return {
			'width': element.offsetWidth,
			'height': element.offsetHeight
		};
	}

/** --- Helper functions --- */

	/**
	 * Provides requestAnimationFrame in a cross browser way
	 * @see https://gist.github.com/mrdoob/838785
	 */
	function setupRAF () {
		if (!window.requestAnimationFrame) {
			window.requestAnimationFrame = (function () {
				return window.webkitRequestAnimationFrame ||
					window.mozRequestAnimationFrame ||
					window.oRequestAnimationFrame ||
					window.msRequestAnimationFrame ||
					function (callback) {
						window.setTimeout(callback, 1000 / 60);
					};
			})();
		}

		if (!window.cancelAnimationFrame) {
			window.cancelAnimationFrame = (function () {
				return window.webkitCancelAnimationFrame ||
					window.mozCancelAnimationFrame ||
					window.oCancelAnimationFrame ||
					window.msCancelAnimationFrame ||
					window.clearTimeout;
			})();
		}
	}

	/**
	 * Test if browser supports CSS animations. If it does, find out which style convention we must follow
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Using_CSS_animations/Detecting_CSS_animation_support
	 */
	function getCSSAnimationData () {
		var supportsAnimation = false,
			keyframePrefix = '',
			animationStartEvent = 'animationstart',
			domPrefixes = 'Webkit Moz O ms'.split(' '),
			startEvents = 'webkitAnimationStart animationstart oAnimationStart MSAnimationStart'.split(' ');

		// Test for .animationName property on style object
		var elm = document.createElement('div');

		if (elm.style.animationName !== undefined) {
			supportsAnimation = true;
		}

		// Test for browser specific animation properties
		if (supportsAnimation === false) {
			var i = 0,
				l = domPrefixes.length;

			for (; i < l ; i++ ) {
				if (elm.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
					keyframePrefix = '-' + domPrefixes[i].toLowerCase() + '-';
					animationStartEvent = startEvents[i];
					supportsAnimation = true;
					break;
				}
			}
		}

		if (!supportsAnimation) {
			return {
				'isSupported': false
			}
		}

		var animationName = 'resizeanim';

		return {
			'isSupported': supportsAnimation,
			'keyframesRule': '@' + keyframePrefix + 'keyframes ' + animationName + ' {from { opacity: 0; } to { opacity: 0; }}',
			'styleDeclaration': keyframePrefix + 'animation: 1ms ' + animationName + ';',
			'animationStartEvent': animationStartEvent,
			'animationName': animationName
		}
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

	/**
	 *
	 * @param {HTMLElement} element
	 * @param {string} property
	 * @returns {null|string}
	 */
	function getStyle(element, property)
	{
		var value = null;

		if (element.currentStyle) {
			value = element.currentStyle[property];
		} else if (window.getComputedStyle) {
			value = document.defaultView.getComputedStyle(element,null).getPropertyValue(property);
		}

		return value;
	}

	return {
		'addListener': addListener,
		'removeListener': removeListener
	};
});