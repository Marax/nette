/**
 * NetteQ
 *
 * This file is part of the Nette Framework.
 * Copyright (c) 2004, 2012 David Grudl (http://davidgrudl.com)
 */

var Nette = Nette || {};

(function(){

// simple class builder
Nette.Class = function(def) {
	var cl = def.constructor || function(){}, nm, __hasProp = Object.prototype.hasOwnProperty;
	delete def.constructor;

	if (def.Extends) {
		var foo = function() { this.constructor = cl; };
		foo.prototype = def.Extends.prototype;
		cl.prototype = new foo();
		delete def.Extends;
	}

	if (def.Static) {
		for (nm in def.Static) { if (__hasProp.call(def.Static, nm)) cl[nm] = def.Static[nm]; }
		delete def.Static;
	}

	for (nm in def) { if (__hasProp.call(def, nm)) cl.prototype[nm] = def[nm]; }
	return cl;
};


// supported cross-browser selectors: #id  |  div  |  div.class  |  .class
//var $ = Nette.Q.factory;

Nette.Q = Nette.Class({

	Static: {
		factory: function(selector) {
			return new Nette.Q(selector);
		}
	},

	constructor: function(selector) {
		if (typeof selector === "string") {
			selector = this._find(document, selector);

		} else if (!selector || selector.nodeType || selector.length === undefined || selector === window) {
			selector = [selector];
		}

		for (var i = 0, len = selector.length; i < len; i++) {
			if (selector[i]) { this[this.length++] = selector[i]; }
		}
	},

	length: 0,

	find: function(selector) {
		return new Nette.Q(this._find(this[0], selector));
	},

	_find: function(context, selector) {
		if (!context || !selector) {
			return [];

		} else if (document.querySelectorAll) {
			return context.querySelectorAll(selector);

		} else if (selector.charAt(0) === '#') { // #id
			return [document.getElementById(selector.substring(1))];

		} else { // div  |  div.class  |  .class
			selector = selector.split('.');
			var elms = context.getElementsByTagName(selector[0] || '*');

			if (selector[1]) {
				var list = [], pattern = new RegExp('(^|\\s)' + selector[1] + '(\\s|$)');
				for (var i = 0, len = elms.length; i < len; i++) {
					if (pattern.test(elms[i].className)) { list.push(elms[i]); }
				}
				return list;
			} else {
				return elms;
			}
		}
	},

	dom: function() {
		return this[0];
	},

	each: function(callback) {
		for (var i = 0; i < this.length; i++) {
			if (callback.apply(this[i]) === false) { break; }
		}
		return this;
	},

	// cross-browser event attach
	bind: function(event, handler) {
		if (document.addEventListener && (event === 'mouseenter' || event === 'mouseleave')) { // simulate mouseenter & mouseleave using mouseover & mouseout
			var old = handler;
			event = event === 'mouseenter' ? 'mouseover' : 'mouseout';
			handler = function(e) {
				for (var target = e.relatedTarget; target; target = target.parentNode) {
					if (target === this) { return; } // target must not be inside this
				}
				old.call(this, e);
			};
		}

		return this.each(function() {
			var elem = this, // fixes 'this' in iE
				data = elem.nette ? elem.nette : elem.nette = {},
				events = data.events = data.events || {}; // use own handler queue

			if (!events[event]) {
				var handlers = events[event] = [],
					generic = function(e) { // dont worry, 'e' is passed in IE
						if (!e.target) {
							e.target = e.srcElement;
						}
						if (!e.preventDefault) {
							e.preventDefault = function() { e.returnValue = false; };
						}
						if (!e.stopPropagation) {
							e.stopPropagation = function() { e.cancelBubble = true; };
						}
						e.stopImmediatePropagation = function() { this.stopPropagation(); i = handlers.length; };
						for (var i = 0; i < handlers.length; i++) {
							handlers[i].call(elem, e);
						}
					};

				if (document.addEventListener) { // non-IE
					elem.addEventListener(event, generic, false);
				} else if (document.attachEvent) { // IE < 9
					elem.attachEvent('on' + event, generic);
				}
			}

			events[event].push(handler);
		});
	},

	// adds class to element
	addClass: function(className) {
		return this.each(function() {
			this.className = this.className.replace(/^|\s+|$/g, ' ').replace(' '+className+' ', ' ') + ' ' + className;
		});
	},

	// removes class from element
	removeClass: function(className) {
		return this.each(function() {
			this.className = this.className.replace(/^|\s+|$/g, ' ').replace(' '+className+' ', ' ');
		});
	},

	// tests whether element has given class
	hasClass: function(className) {
		return this[0] && this[0].className.replace(/^|\s+|$/g, ' ').indexOf(' '+className+' ') > -1;
	},

	show: function() {
		Nette.Q.displays = Nette.Q.displays || {};
		return this.each(function() {
			var tag = this.tagName;
			if (!Nette.Q.displays[tag]) {
				Nette.Q.displays[tag] = (new Nette.Q(document.body.appendChild(document.createElement(tag)))).css('display');
			}
			this.style.display = Nette.Q.displays[tag];
		});
	},

	hide: function() {
		return this.each(function() {
			this.style.display = 'none';
		});
	},

	css: function(property) {
		if (this[0] && this[0].currentStyle) {
			return this[0].currentStyle[property];
		} else if (this[0] && window.getComputedStyle) {
			return document.defaultView.getComputedStyle(this[0], null).getPropertyValue(property)
		}
	},

	data: function() {
		if (this[0]) {
			return this[0].nette ? this[0].nette : this[0].nette = {};
		}
	},

	val: function() {
		var elem = this[0];
		if (!elem) {
			return undefined;

		} else if (!elem.nodeName) { // radio
			for (var i = 0, len = elem.length; i < len; i++) {
				if (this[i].checked) { return this[i].value; }
			}
			return null;

		} else if (elem.nodeName.toLowerCase() === 'select') {
			var index = elem.selectedIndex, options = elem.options;

			if (index < 0) {
				return null;

			} else if (elem.type === 'select-one') {
				return options[index].value;
			}

			for (var i = 0, values = [], len = options.length; i < len; i++) {
				if (options[i].selected) { values.push(options[i].value); }
			}
			return values;

		} else if (elem.type === 'checkbox') {
			return elem.checked;

		} else if (elem.value) {
			return elem.value.replace(/^\s+|\s+$/g, '');
		}
	},

	_trav: function(elem, selector, fce) {
		selector = selector.split('.');
		while (elem && !(elem.nodeType === 1 &&
			(!selector[0] || elem.tagName.toLowerCase() === selector[0]) &&
			(!selector[1] || (new Nette.Q(elem)).hasClass(selector[1])))) {
			elem = elem[fce];
		}
		return new Nette.Q(elem || []);
	},

	closest: function(selector) {
		return this._trav(this[0], selector, 'parentNode');
	},

	prev: function(selector) {
		return this._trav(this[0] && this[0].previousSibling, selector, 'previousSibling');
	},

	next: function(selector) {
		return this._trav(this[0] && this[0].nextSibling, selector, 'nextSibling');
	},

	// returns total offset for element
	offset: function(coords) {
		if (coords) {
			return this.each(function() {
				var elem = this, ofs = {left: -coords.left || 0, top: -coords.top || 0};
				while (elem = elem.offsetParent) { ofs.left += elem.offsetLeft; ofs.top += elem.offsetTop; }
				this.style.left = -ofs.left + 'px';
				this.style.top = -ofs.top + 'px';
			});
		} else if (this[0]) {
			var elem = this[0], res = {left: elem.offsetLeft, top: elem.offsetTop};
			while (elem = elem.offsetParent) { res.left += elem.offsetLeft; res.top += elem.offsetTop; }
			return res;
		}
	},

	// returns current position or move to new position
	position: function(coords) {
		if (coords) {
			return this.each(function() {
				if (this.nette && this.nette.onmove) {
					this.nette.onmove.call(this, coords);
				}
				for (var item in coords) {
					this.style[item] = coords[item] + 'px';
				}
			});
		} else if (this[0]) {
			return {
				left: this[0].offsetLeft, top: this[0].offsetTop,
				right: this[0].style.right ? parseInt(this[0].style.right, 10) : 0, bottom: this[0].style.bottom ? parseInt(this[0].style.bottom, 10) : 0,
				width: this[0].offsetWidth, height: this[0].offsetHeight
			};
		}
	},

	// makes element draggable
	draggable: function(options) {
		var elem = this[0], dE = document.documentElement, started;
		options = options || {};

		(options.handle ? new Nette.Q(options.handle) : this).bind('mousedown', function(e) {
			var $el = new Nette.Q(options.handle ? elem : this);
			e.preventDefault();
			e.stopPropagation();

			if (Nette.Q.dragging) { // missed mouseup out of window?
				return dE.onmouseup(e);
			}

			var pos = $el.position(),
				deltaX = options.rightEdge ? pos.right + e.clientX : pos.left - e.clientX,
				deltaY = options.bottomEdge ? pos.bottom + e.clientY : pos.top - e.clientY;

			Nette.Q.dragging = true;
			started = false;

			dE.onmousemove = function(e) {
				e = e || event;
				if (!started) {
					if (options.draggedClass) {
						$el.addClass(options.draggedClass);
					}
					if (options.start) {
						options.start(e, $el);
					}
					started = true;
				}

				var pos = {};
				pos[options.rightEdge ? 'right' : 'left'] = options.rightEdge ? deltaX - e.clientX : e.clientX + deltaX;
				pos[options.bottomEdge ? 'bottom' : 'top'] = options.bottomEdge ? deltaY - e.clientY : e.clientY + deltaY;
				$el.position(pos);
				return false;
			};

			dE.onmouseup = function(e) {
				if (started) {
					if (options.draggedClass) {
						$el.removeClass(options.draggedClass);
					}
					if (options.stop) {
						options.stop(e || event, $el);
					}
				}
				Nette.Q.dragging = dE.onmousemove = dE.onmouseup = null;
				return false;
			};

		}).bind('click', function(e) {
			if (started) {
				e.stopImmediatePropagation();
			}
		});

		return this;
	}

});

})();
