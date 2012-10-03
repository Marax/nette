/**
 * Debugger Bar
 *
 * This file is part of the Nette Framework (http://nette.org)
 * Copyright (c) 2004 David Grudl (http://davidgrudl.com)
 */

/// <reference path="netteQ.ts"/>

module Nette.Debug {

	var $ = Nette.Query.factory;

    export class Panel extends Nette.Query {

		static PEEK = 'nette-mode-peek';
		static FLOAT = 'nette-mode-float';
		static WINDOW = 'nette-mode-window';
		static FOCUSED = 'nette-focused';
		static zIndex = 20000;

		static factory(selector) {
			return new Panel(selector)
		}

		private static toggle(link) {
			var rel = link.rel, el = rel.charAt(0) === '#' ? $(rel) : $(link)[rel === 'prev' ? 'prev' : 'next'](rel.substring(4));
			if (el.css('display') === 'none') {
				el.show(); link.innerHTML = link.innerHTML.replace("\u25ba", "\u25bc");
			} else {
				el.hide(); link.innerHTML = link.innerHTML.replace("\u25bc", "\u25ba");
			}
		}

		constructor(id) {
			super('#nette-debug-panel-' + id.replace('nette-debug-panel-', ''));
		}

		reposition() {
			if (this.hasClass(Panel.WINDOW)) {
				window.resizeBy(document.documentElement.scrollWidth - document.documentElement.clientWidth, document.documentElement.scrollHeight - document.documentElement.clientHeight);
			} else {
				this.position({right: this.position().right, bottom: this.position().bottom});
				if (this.position().width) { // is visible?
					document.cookie = this.dom().id + '=' + this.position().right + ':' + this.position().bottom + '; path=/';
				}
			}
		}

		focus() {
			if (this.hasClass(Panel.WINDOW)) {
				this.data().win.focus();
			} else {
				clearTimeout(this.data().blurTimeout);
				this.addClass(Panel.FOCUSED).show();
				this[0].style.zIndex = Panel.zIndex++;
			}
		}

		blur() {
			this.removeClass(Panel.FOCUSED);
			if (this.hasClass(Panel.PEEK)) {
				var panel = this;
				this.data().blurTimeout = setTimeout(() => { panel.hide() }, 50);
			}
		}

		toFloat() {
			this.removeClass(Panel.WINDOW).removeClass(Panel.PEEK).addClass(Panel.FLOAT).show().reposition();
			return this;
		}

		toPeek() {
			this.removeClass(Panel.WINDOW).removeClass(Panel.FLOAT).addClass(Panel.PEEK).hide();
			document.cookie = this.dom().id + '=; path=/'; // delete position
		}

		toWindow() {
			var panel = this, win, doc, offset = this.offset(), id = this.dom().id;

			offset.left += typeof window.screenLeft === 'number' ? window.screenLeft : (window.screenX + 10);
			offset.top += typeof window.screenTop === 'number' ? window.screenTop : (window.screenY + 50);

			win = window.open('', id.replace(/-/g, '_'), 'left='+offset.left+',top='+offset.top+',width='+offset.width+',height='+(offset.height+15)+',resizable=yes,scrollbars=yes');
			if (!win) return;

			doc = win.document;
			doc.write('<!DOCTYPE html><meta http-equiv="Content-Type" content="text\/html; charset=utf-8"><style>' + $('#nette-debug-style').dom().innerHTML + '<\/style><script>' + $('#nette-debug-script').dom().innerHTML + '<\/script><body id="nette-debug">');
			doc.body.innerHTML = '<div class="nette-panel nette-mode-window" id="' + id + '">' + this.dom().innerHTML + '<\/div>';
			win.Nette.Debug.Panel.factory(id).initToggler().reposition();
			doc.title = panel.find('h1').dom().innerHTML;

			$([win]).bind('unload', () => {
				panel.toPeek();
				win.close(); // forces closing, can be invoked by F5
			});

			$(doc).bind('keyup', (e) => {
				if (e.keyCode === 27 && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) win.close();
			});

			document.cookie = id + '=window; path=/'; // save position
			this.hide().removeClass(Panel.FLOAT).removeClass(Panel.PEEK).addClass(Panel.WINDOW).data().win = win;
		}

		init() {
			var panel = this, pos;

			panel.data().onmove = function(coords) { // forces constrained inside window
				var d = document, width = window.innerWidth || d.documentElement.clientWidth || d.body.clientWidth, height = window.innerHeight || d.documentElement.clientHeight || d.body.clientHeight;
				coords.right = Math.min(Math.max(coords.right, -.2 * this.offsetWidth), width - .8 * this.offsetWidth);
				coords.bottom = Math.min(Math.max(coords.bottom, -.2 * this.offsetHeight), height - this.offsetHeight);
			};

			$(window).bind('resize', () => { panel.reposition() });

			panel.draggable({
				rightEdge: true,
				bottomEdge: true,
				handle: panel.find('h1'),
				stop: () => { panel.toFloat() },

			}).bind('mouseenter', () => { panel.focus() }

			).bind('mouseleave', () => { panel.blur() });

			this.initToggler();

			panel.find('.nette-icons').find('a').bind('click', function(e) {
				if (this.rel === 'close') panel.toPeek(); else panel.toWindow();
				e.preventDefault();
			});

			// restore saved position
			if (pos = document.cookie.match(new RegExp(panel.dom().id + '=(window|(-?[0-9]+):(-?[0-9]+))'))) {
				if (pos[2]) {
					panel.toFloat().position({right: pos[2], bottom: pos[3]});
				} else {
					panel.toWindow();
				}
			} else {
				panel.addClass(Panel.PEEK);
			}
		}

		initToggler() { // enable <a rel="..."> togglers
			var panel = this;
			this.bind('click', (e) => {
				var $link = $(e.target).closest('a'), link = $link.dom();
				if (link && link.rel) {
					Panel.toggle(link);
					e.preventDefault();
					panel.reposition();
				}
			});
			return this;
		}
	}




    export class Bar extends Nette.Query {

		constructor() {
			super('#nette-debug-bar');
		}

		init() {
			var bar = this, pos;

			bar.data().onmove = function(coords) { // forces constrained inside window
				var d = document, width = window.innerWidth || d.documentElement.clientWidth || d.body.clientWidth,
					height = window.innerHeight || d.documentElement.clientHeight || d.body.clientHeight;
				coords.right = Math.min(Math.max(coords.right, 0), width - this.offsetWidth);
				coords.bottom = Math.min(Math.max(coords.bottom, 0), height - this.offsetHeight);
			};

			$(window).bind('resize', () => {
				bar.position({right: bar.position().right, bottom: bar.position().bottom});
			});

			bar.draggable({
				rightEdge: true,
				bottomEdge: true,
				draggedClass: 'nette-dragged',
				stop: () => {
					document.cookie = bar.dom().id + '=' + bar.position().right + ':' + bar.position().bottom + '; path=/';
				}
			});

			bar.find('a').bind('click', function(e) {
				if (this.rel === 'close') {
					$('#nette-debug').hide();
					if (window.opera) $('body').show();

				} else if (this.rel) {
					var panel = Panel.factory(this.rel);
					if (e.shiftKey) {
						panel.toFloat().toWindow();
					} else if (panel.hasClass(Panel.FLOAT)) {
						panel.toPeek();
					} else {
						panel.toFloat().position({
							right: panel.position().right + Math.round(Math.random() * 100) + 20,
							bottom: panel.position().bottom + Math.round(Math.random() * 100) + 20
						}).reposition();
					}
				}
				e.preventDefault();

			}).bind('mouseenter', function(e) {
				if (!this.rel || this.rel === 'close' || bar.hasClass('nette-dragged')) return;
				var panel = Panel.factory(this.rel);
				panel.focus();
				if (panel.hasClass(Panel.PEEK)) {
					panel.position({
						right: panel.position().right - $(this).offset().left + panel.position().width - $(this).offset().width - 4 + panel.offset().left,
						bottom: panel.position().bottom - $(this).closest('div').offset().top + panel.position().height + 4 + panel.offset().top
					});
				}

			}).bind('mouseleave', function(e) {
				if (!this.rel || this.rel === 'close' || bar.hasClass('nette-dragged')) return;
				Panel.factory(this.rel).blur();
			});

			// restore saved position
			if (pos = document.cookie.match(new RegExp(bar.dom().id + '=(-?[0-9]+):(-?[0-9]+)'))) {
				bar.position({right: pos[1], bottom: pos[2]});
			}

			bar.find('a').each(function() {
				if (!this.rel || this.rel === 'close') return;
				Panel.factory(this.rel).init();
			});
		}

	}

}