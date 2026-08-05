/*!
 * Interatividade do site estático — substitui jQuery, Elementor, Swiper, Owl e
 * Essential Addons (≈1,2 MB de JS) pelo mínimo que estas páginas realmente usam:
 * menu mobile do Header Footer Elementor, carrossel de depoimentos (image-carousel),
 * carrossel de projetos (unlimited-elements/owl) e o accordion do FAQ.
 *
 * As classes e a estrutura de DOM replicam o que os scripts originais geravam, para
 * que o CSS do tema e dos plugins continue valendo sem alteração.
 */
(function () {
  'use strict';

  var on = function (el, ev, fn) { ev.split(' ').forEach(function (e) { el.addEventListener(e, fn); }); };
  var debounce = function (fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  };
  // Um clone de slide vive fora do viewport, então loading="lazy" nunca dispararia
  // e o card apareceria vazio ao entrar na tela.
  var eager = function (node) {
    node.querySelectorAll('img[loading="lazy"]').forEach(function (i) { i.loading = 'eager'; });
    if (node.tagName === 'IMG') node.loading = 'eager';
    return node;
  };

  /* ---------------------------------------------------------------- menu HFE */
  function navMenu(widget) {
    var wrap = widget.querySelector('.hfe-nav-menu');
    var toggle = widget.querySelector('.hfe-nav-menu__toggle');
    var nav = widget.querySelector('nav');
    var icon = widget.querySelector('.hfe-nav-menu-icon');
    if (!wrap || !toggle || !nav) return;

    // Abaixo do breakpoint do widget o menu vira dropdown (fundo próprio, itens
    // empilhados). O menu do rodapé usa breakpoint "none": nunca vira dropdown.
    var breakpoint = widget.classList.contains('hfe-nav-menu__breakpoint-mobile') ? 767
      : widget.classList.contains('hfe-nav-menu__breakpoint-tablet') ? 1024 : 0;
    var isCollapsed = function () {
      return breakpoint > 0 && window.matchMedia('(max-width: ' + breakpoint + 'px)').matches;
    };
    var syncDropdown = function () { nav.classList.toggle('hfe-dropdown', isCollapsed()); };
    syncDropdown();
    on(window, 'resize', debounce(syncDropdown, 100));

    var fullWidth = nav.getAttribute('data-full-width') === 'yes';
    var section = widget.closest('.elementor-section, .e-con-boxed.e-parent, .e-con-full.e-parent');

    var close = function () {
      toggle.classList.remove('hfe-active-menu', 'hfe-active-menu-full-width');
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('menu-is-active');
      if (icon) icon.innerHTML = nav.getAttribute('data-toggle-icon') || icon.innerHTML;
      if (fullWidth) { nav.style.width = 'auto'; nav.style.left = '0'; nav.style.zIndex = '0'; }
    };
    var open = function () {
      toggle.classList.add('hfe-active-menu');
      toggle.setAttribute('aria-expanded', 'true');
      nav.classList.add('menu-is-active');
      if (icon) icon.innerHTML = nav.getAttribute('data-close-icon') || icon.innerHTML;
      if (fullWidth) {
        toggle.classList.add('hfe-active-menu-full-width');
        nav.style.left = '0';
        if (section) {
          nav.style.width = section.offsetWidth + 'px';
          nav.style.left = (section.getBoundingClientRect().left - nav.getBoundingClientRect().left) + 'px';
        }
        nav.style.zIndex = '9999';
      }
    };

    on(toggle, 'click', function () {
      toggle.classList.contains('hfe-active-menu') ? close() : open();
    });
    on(toggle, 'keyup', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
    });
    // Navegar para uma âncora fecha o menu, como no original.
    nav.querySelectorAll('a.hfe-menu-item').forEach(function (a) {
      on(a, 'click', function () { if (toggle.classList.contains('hfe-active-menu')) close(); });
    });
    on(window, 'resize', debounce(function () { if (!isCollapsed()) close(); }, 100));
  }

  /* ------------------------------------------- carrossel de imagens (Elementor) */
  function imageCarousel(widget) {
    var root = widget.querySelector('.elementor-image-carousel-wrapper');
    var track = widget.querySelector('.swiper-wrapper');
    if (!root || !track) return;

    var cfg = {};
    try { cfg = JSON.parse(widget.getAttribute('data-settings') || '{}'); } catch (e) { /* usa os padrões */ }
    var gap = (cfg.image_spacing_custom && cfg.image_spacing_custom.size) || 0;
    var perViewFor = function () {
      if (window.innerWidth <= 767) return +(cfg.slides_to_show_mobile || 1);
      if (window.innerWidth <= 1024) return +(cfg.slides_to_show_tablet || 1);
      return +(cfg.slides_to_show || 1);
    };

    var slides = [].slice.call(track.children);
    var n = slides.length;
    if (!n) return;
    var loop = cfg.infinite !== 'no';

    root.classList.add('swiper-initialized', 'swiper-horizontal', 'swiper-pointer-events', 'swiper-backface-hidden');
    slides.forEach(function (s, i) { s.setAttribute('data-swiper-slide-index', String(i)); });

    if (loop) {
      slides.forEach(function (s) { track.insertBefore(eager(s.cloneNode(true)), track.firstChild); });
      slides.slice().reverse().forEach(function (s) { track.appendChild(eager(s.cloneNode(true))); });
      [].slice.call(track.children).forEach(function (c, i) {
        if (i < n || i >= 2 * n) c.classList.add('swiper-slide-duplicate');
      });
    }

    var index = 0;
    var perView = perViewFor();
    var step = 0;

    var layout = function () {
      perView = perViewFor();
      var w = (root.clientWidth - gap * (perView - 1)) / perView;
      step = w + gap;
      [].slice.call(track.children).forEach(function (s) {
        s.style.width = w + 'px';
        s.style.marginRight = gap + 'px';
      });
      place(false);
    };
    var place = function (animate) {
      var pos = (loop ? n : 0) + index;
      track.style.transitionDuration = (animate ? (cfg.speed || 500) : 0) + 'ms';
      track.style.transform = 'translate3d(' + (-pos * step) + 'px, 0px, 0px)';
      marks();
    };
    var marks = function () {
      [].slice.call(track.children).forEach(function (s, i) {
        var logical = ((i - (loop ? n : 0)) % n + n) % n;
        s.classList.toggle('swiper-slide-active', i === (loop ? n : 0) + index);
        s.classList.toggle('swiper-slide-next', i === (loop ? n : 0) + index + 1);
        s.classList.toggle('swiper-slide-prev', i === (loop ? n : 0) + index - 1);
        var visible = logical >= index && logical < index + perView;
        if (visible) { s.removeAttribute('aria-hidden'); s.removeAttribute('inert'); }
        else { s.setAttribute('aria-hidden', 'true'); s.setAttribute('inert', ''); }
      });
      bullets.forEach(function (b, i) {
        b.classList.toggle('swiper-pagination-bullet-active', i === index);
        i === index ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current');
      });
    };
    var go = function (to) {
      index = to;
      place(true);
      if (!loop) return;
      if (index >= n || index < 0) {
        var settle = function () {
          track.removeEventListener('transitionend', settle);
          index = (index % n + n) % n;
          place(false);
        };
        on(track, 'transitionend', settle);
      }
    };

    // Paginação: um marcador por slide original.
    var pagination = widget.querySelector('.swiper-pagination');
    var bullets = [];
    if (pagination) {
      pagination.classList.add('swiper-pagination-clickable', 'swiper-pagination-bullets', 'swiper-pagination-horizontal');
      for (var i = 0; i < n; i++) {
        var b = document.createElement('span');
        b.className = 'swiper-pagination-bullet';
        b.setAttribute('role', 'button');
        b.setAttribute('data-bullet-index', String(i));
        b.setAttribute('aria-label', 'Ir para o slide ' + (i + 1));
        (function (k) { on(b, 'click', function () { stop(); go(k); }); })(i);
        pagination.appendChild(b);
        bullets.push(b);
      }
    }

    var prev = widget.querySelector('.elementor-swiper-button-prev');
    var next = widget.querySelector('.elementor-swiper-button-next');
    if (prev) on(prev, 'click', function () { stop(); go(index - 1); });
    if (next) on(next, 'click', function () { stop(); go(index + 1); });

    // Autoplay: pausa no hover e encerra na primeira interação, como configurado.
    var timer = null;
    var stopped = false;
    var start = function () {
      if (stopped || cfg.autoplay !== 'yes') return;
      clearInterval(timer);
      timer = setInterval(function () { go(index + 1); }, +cfg.autoplay_speed || 5000);
    };
    var stop = function () {
      if (cfg.pause_on_interaction !== 'no') stopped = true;
      clearInterval(timer);
    };
    if (cfg.pause_on_hover === 'yes') {
      on(root, 'mouseenter', function () { clearInterval(timer); });
      on(root, 'mouseleave', start);
    }

    layout();
    start();
    on(window, 'resize', debounce(layout, 150));
  }

  /* --------------------------------- carrossel de projetos (unlimited-elements) */
  function ucCarousel(el) {
    var items = [].slice.call(el.children).filter(function (c) { return c.classList.contains('uc_carousel_item'); });
    var n = items.length;
    if (!n) return;

    var CLONES = 4;
    var margin = 20;
    var itemsFor = function () { return window.innerWidth >= 980 ? 3 : 1; };

    var outer = document.createElement('div');
    outer.className = 'owl-stage-outer';
    var stage = document.createElement('div');
    stage.className = 'owl-stage';
    outer.appendChild(stage);

    var cells = [];
    var addCell = function (node, cloned) {
      var cell = document.createElement('div');
      cell.className = 'owl-item' + (cloned ? ' cloned' : '');
      cell.appendChild(node);
      stage.appendChild(cell);
      cells.push(cell);
      return cell;
    };
    for (var i = 0; i < CLONES; i++) addCell(eager(items[(n - CLONES + i % n + n) % n].cloneNode(true)), true);
    items.forEach(function (it) { addCell(it, false); });
    for (var j = 0; j < CLONES; j++) addCell(eager(items[j % n].cloneNode(true)), true);

    el.textContent = '';
    el.appendChild(outer);
    el.classList.add('owl-loaded', 'owl-drag');

    var nav = document.createElement('div');
    nav.className = 'owl-nav';
    nav.innerHTML = '<button type="button" role="presentation" value="previous item" title="previous item" class="owl-prev"><i class="fas fa-arrow-left"></i></button>' +
      '<button type="button" role="presentation" value="next item" title="next item" class="owl-next"><i class="fas fa-arrow-right"></i></button>';
    el.appendChild(nav);

    var dotsBox = document.createElement('div');
    dotsBox.className = 'owl-dots';
    var dots = [];
    for (var d = 0; d < n; d++) {
      var dot = document.createElement('button');
      dot.setAttribute('role', 'button');
      dot.className = 'owl-dot';
      dot.innerHTML = '<span></span>';
      (function (k) { on(dot, 'click', function () { go(k); }); })(d);
      dotsBox.appendChild(dot);
      dots.push(dot);
    }
    el.appendChild(dotsBox);

    var index = 0;
    var per = itemsFor();
    var step = 0;

    // O owl no site original mede a largura do container Elementor com o padding
    // incluído (20px a mais que a área útil), e é essa medida que define os cards.
    // Reproduzir isso mantém o layout idêntico — inclusive o transbordo do último card.
    var box = el.closest('.e-con') || el;

    var layout = function () {
      per = itemsFor();
      var w = box.clientWidth / per - margin;
      step = w + margin;
      cells.forEach(function (c) { c.style.width = w + 'px'; c.style.marginRight = margin + 'px'; });
      stage.style.width = cells.length * step + 'px';
      place(false);
    };
    var place = function (animate) {
      stage.style.transition = animate ? 'transform 600ms ease' : 'none';
      stage.style.transform = 'translateX(' + (-(CLONES + index) * step) + 'px)';
      cells.forEach(function (c, i) {
        var pos = i - CLONES - index;
        c.classList.toggle('active', pos >= 0 && pos < per);
        c.classList.toggle('uc-active-item', pos === 0);
      });
      dots.forEach(function (b, i) { b.classList.toggle('active', i === ((index % n) + n) % n); });
    };
    var go = function (to) {
      index = to;
      place(true);
      if (index >= n || index < 0) {
        var settle = function () {
          stage.removeEventListener('transitionend', settle);
          index = (index % n + n) % n;
          place(false);
        };
        on(stage, 'transitionend', settle);
      }
    };
    on(nav.querySelector('.owl-prev'), 'click', function () { go(index - 1); });
    on(nav.querySelector('.owl-next'), 'click', function () { go(index + 1); });

    layout();
    on(window, 'resize', debounce(layout, 150));
  }

  /* ------------------------------------ proporção das miniaturas (grid de projetos) */
  // O slot da miniatura tem proporção fixa (padding-bottom em % da largura). Quando a
  // imagem é mais larga que o slot, o Elementor troca "largura 100%" por "altura 100%"
  // via .elementor-fit-height, senão sobrariam faixas vazias. A proporção do slot muda
  // por breakpoint, então isso é recalculado no resize, como no original.
  function postThumbRatio(container) {
    var thumbs = [].slice.call(container.querySelectorAll('.elementor-post__thumbnail'));

    var apply = function () {
      thumbs.forEach(function (t) {
        var img = t.querySelector('img');
        if (!img || !img.naturalWidth) return;
        var r = t.getBoundingClientRect();
        if (!r.width) return;
        t.classList.toggle('elementor-fit-height', img.naturalHeight / img.naturalWidth < r.height / r.width);
      });
    };

    thumbs.forEach(function (t) {
      var img = t.querySelector('img');
      if (img && !img.complete) on(img, 'load', apply);
    });
    apply();
    on(window, 'resize', debounce(apply, 100));
  }

  /* ------------------------------------------------------- accordion (FAQ, EAEL) */
  function accordion(root) {
    var exclusive = root.getAttribute('data-accordion-type') !== 'toggle';
    var speed = +root.getAttribute('data-toogle-speed') || 300;

    var headers = [].slice.call(root.querySelectorAll('.eael-accordion-header'));
    var panelOf = function (h) { return document.getElementById(h.getAttribute('aria-controls')); };

    var slide = function (panel, show) {
      panel.style.overflow = 'hidden';
      var target = show ? panel.scrollHeight : 0;
      if (show) { panel.style.display = 'block'; panel.style.height = '0px'; target = panel.scrollHeight; }
      panel.style.transition = 'height ' + speed + 'ms ease';
      requestAnimationFrame(function () { panel.style.height = target + 'px'; });
      setTimeout(function () {
        panel.style.transition = panel.style.height = panel.style.overflow = '';
        if (!show) panel.style.display = 'none';
      }, speed);
    };

    headers.forEach(function (h) {
      var panel = panelOf(h);
      if (!panel) return;
      on(h, 'click', function () {
        var isOpen = h.classList.contains('active');
        if (exclusive && !isOpen) {
          headers.forEach(function (o) {
            if (o === h || !o.classList.contains('active')) return;
            o.classList.remove('active', 'show-this');
            var p = panelOf(o);
            if (p) slide(p, false);
          });
        }
        h.classList.toggle('active', !isOpen);
        h.classList.toggle('show-this', !isOpen);
        slide(panel, !isOpen);
      });
      on(h, 'keyup', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); h.click(); } });
    });
  }

  /* ------------------------------------------------------- ano corrente no rodapé */
  function footerYear() {
    var el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------ arranque */
  function init() {
    footerYear();
    document.querySelectorAll('.elementor-widget-navigation-menu').forEach(navMenu);
    document.querySelectorAll('.elementor-widget-image-carousel').forEach(imageCarousel);
    document.querySelectorAll('.uc_carousel.owl-carousel').forEach(ucCarousel);
    document.querySelectorAll('.elementor-posts-container.elementor-has-item-ratio').forEach(postThumbRatio);
    document.querySelectorAll('.eael-adv-accordion').forEach(accordion);
  }
  document.readyState === 'loading' ? on(document, 'DOMContentLoaded', init) : init();
})();
