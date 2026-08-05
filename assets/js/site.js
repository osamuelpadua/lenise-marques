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
      var before = document.createDocumentFragment();
      var after = document.createDocumentFragment();
      slides.forEach(function (s) {
        before.appendChild(eager(s.cloneNode(true)));
        after.appendChild(eager(s.cloneNode(true)));
      });
      track.insertBefore(before, track.firstChild);
      track.appendChild(after);
      [].slice.call(track.children).forEach(function (c, i) {
        if (i < n || i >= 2 * n) c.classList.add('swiper-slide-duplicate');
      });
    }

    var index = 0;
    var perView = perViewFor();
    var step = 0;
    var settleTimer = null;
    var settleHandler = null;

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
      marks(pos);
    };
    var marks = function (pos) {
      [].slice.call(track.children).forEach(function (s, i) {
        s.classList.toggle('swiper-slide-active', i === pos);
        s.classList.toggle('swiper-slide-next', i === pos + 1);
        s.classList.toggle('swiper-slide-prev', i === pos - 1);
        var visible = i >= pos && i < pos + perView;
        if (visible) { s.removeAttribute('aria-hidden'); s.removeAttribute('inert'); }
        else { s.setAttribute('aria-hidden', 'true'); s.setAttribute('inert', ''); }
      });
      var logicalIndex = ((index % n) + n) % n;
      bullets.forEach(function (b, i) {
        b.classList.toggle('swiper-pagination-bullet-active', i === logicalIndex);
        i === logicalIndex ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current');
      });
    };
    var go = function (to) {
      clearTimeout(settleTimer);
      if (settleHandler) {
        track.removeEventListener('transitionend', settleHandler);
        settleHandler = null;
      }
      index = to;
      place(true);
      if (!loop) return;
      if (index >= n || index < 0) {
        var settled = false;
        var settle = function (event) {
          if (event && event.target !== track) return;
          if (settled) return;
          settled = true;
          track.removeEventListener('transitionend', settle);
          settleHandler = null;
          clearTimeout(settleTimer);
          index = (index % n + n) % n;
          place(false);
        };
        settleHandler = settle;
        on(track, 'transitionend', settle);
        // Alguns navegadores podem suprimir transitionend quando a aba perde foco.
        // O fallback impede que o índice avance além dos clones e esvazie a tela.
        settleTimer = setTimeout(settle, (+cfg.speed || 500) + 100);
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

  /* --------------------------------------------- depoimentos em cards de texto */
  function reviewsCarousel(root) {
    var track = root.querySelector('.lenise-reviews-track');
    var viewport = root.querySelector('.lenise-reviews-viewport');
    var pagination = root.parentNode.querySelector('.lenise-reviews-pagination');
    var prev = root.querySelector('.lenise-reviews-button--prev');
    var next = root.querySelector('.lenise-reviews-button--next');
    if (!track || !viewport || !prev || !next) return;

    var originalCards = [].slice.call(track.querySelectorAll('.lenise-review-card')).map(function (card) {
      return card.cloneNode(true);
    });
    var total = originalCards.length;
    if (!total) return;

    var perView = 3;
    var cloneCount = 3;
    var gap = 24;
    var current = 0;
    var virtualIndex = 0;
    var cardWidth = 0;
    var renderedCards = [];
    var pageStops = [];
    var autoplayTimer = null;
    var settleTimer = null;
    var transitionMs = 420;

    var perViewFor = function () {
      if (window.innerWidth <= 680) return 1;
      if (window.innerWidth <= 1080) return 2;
      return 3;
    };
    var normalize = function (index) {
      return ((index % total) + total) % total;
    };
    var rebuildTrack = function () {
      track.textContent = '';
      originalCards.slice(total - cloneCount).forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.classList.add('is-clone');
        track.appendChild(clone);
      });
      originalCards.forEach(function (card) { track.appendChild(card.cloneNode(true)); });
      originalCards.slice(0, cloneCount).forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.classList.add('is-clone');
        track.appendChild(clone);
      });
      renderedCards = [].slice.call(track.querySelectorAll('.lenise-review-card'));
    };
    var buildPageStops = function () {
      var max = Math.max(0, total - perView);
      pageStops = [];
      for (var i = 0; i <= max; i += perView) pageStops.push(i);
      if (!pageStops.length || pageStops[pageStops.length - 1] !== max) pageStops.push(max);
    };
    var updatePagination = function () {
      if (!pagination) return;
      var active = 0;
      pageStops.forEach(function (stop, i) { if (current >= stop) active = i; });
      [].slice.call(pagination.querySelectorAll('.lenise-reviews-dot')).forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === active);
        dot.setAttribute('aria-pressed', i === active ? 'true' : 'false');
      });
    };
    var updateAccessibility = function () {
      renderedCards.forEach(function (card, i) {
        var visible = i >= virtualIndex && i < virtualIndex + perView;
        if (visible) {
          card.removeAttribute('aria-hidden');
          card.removeAttribute('inert');
        } else {
          card.setAttribute('aria-hidden', 'true');
          card.setAttribute('inert', '');
        }
      });
    };
    var applyTransform = function (animate) {
      track.style.transition = animate === false ? 'none' : 'transform ' + transitionMs + 'ms cubic-bezier(.4, 0, .2, 1)';
      track.style.transform = 'translate3d(' + (-(virtualIndex * (cardWidth + gap))) + 'px, 0, 0)';
      updateAccessibility();
    };
    var snapToCurrent = function () {
      clearTimeout(settleTimer);
      virtualIndex = current + cloneCount;
      applyTransform(false);
    };
    var needsSnap = function () {
      return virtualIndex < cloneCount || virtualIndex >= total + cloneCount;
    };
    var settleBoundary = function () {
      clearTimeout(settleTimer);
      if (needsSnap()) snapToCurrent();
    };
    var scheduleBoundarySettle = function () {
      clearTimeout(settleTimer);
      if (needsSnap()) settleTimer = setTimeout(settleBoundary, transitionMs + 100);
    };
    var stopAutoplay = function () {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    };
    var startAutoplay = function () {
      stopAutoplay();
      if (total <= perView || document.hidden) return;
      autoplayTimer = setInterval(function () { stepBy(1); }, 7000);
    };
    var restartAutoplay = function () {
      stopAutoplay();
      startAutoplay();
    };
    var goTo = function (index) {
      clearTimeout(settleTimer);
      current = normalize(index);
      virtualIndex = current + cloneCount;
      applyTransform(true);
      updatePagination();
    };
    var stepBy = function (delta) {
      clearTimeout(settleTimer);
      current = normalize(current + delta);
      virtualIndex += delta;
      applyTransform(true);
      updatePagination();
      scheduleBoundarySettle();
    };
    var renderPagination = function () {
      if (!pagination) return;
      pagination.textContent = '';
      pageStops.forEach(function (stop, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'lenise-reviews-dot';
        dot.setAttribute('aria-label', 'Ir para o grupo ' + (i + 1) + ' de depoimentos');
        on(dot, 'click', function () { goTo(stop); restartAutoplay(); });
        pagination.appendChild(dot);
      });
    };
    var layout = function () {
      clearTimeout(settleTimer);
      perView = Math.min(perViewFor(), total);
      cloneCount = Math.min(perView, total);
      rebuildTrack();
      cardWidth = (viewport.clientWidth - gap * (perView - 1)) / perView;
      renderedCards.forEach(function (card) {
        card.style.width = cardWidth + 'px';
        card.style.flex = '0 0 ' + cardWidth + 'px';
      });
      buildPageStops();
      renderPagination();
      snapToCurrent();
      updatePagination();
      var enabled = total > perView;
      prev.hidden = next.hidden = !enabled;
      startAutoplay();
    };

    on(prev, 'click', function () { stepBy(-1); restartAutoplay(); });
    on(next, 'click', function () { stepBy(1); restartAutoplay(); });
    on(track, 'transitionend', function (event) {
      if (event.target === track) settleBoundary();
    });
    on(root, 'mouseenter', stopAutoplay);
    on(root, 'mouseleave', startAutoplay);
    on(root, 'focusin', stopAutoplay);
    on(root, 'focusout', function (event) { if (!root.contains(event.relatedTarget)) startAutoplay(); });
    on(document, 'visibilitychange', function () { document.hidden ? stopAutoplay() : startAutoplay(); });

    var touchX = 0;
    var touchY = 0;
    on(viewport, 'touchstart', function (event) {
      touchX = event.touches[0].clientX;
      touchY = event.touches[0].clientY;
      stopAutoplay();
    });
    on(viewport, 'touchend', function (event) {
      var dx = event.changedTouches[0].clientX - touchX;
      var dy = event.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) stepBy(dx < 0 ? 1 : -1);
      startAutoplay();
    });

    layout();
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

    var per = itemsFor();
    var step = 0;
    var offset = 0;
    var lastFrame = 0;
    var tween = null;
    var pointerOverCard = false;
    var focusInsideCard = false;
    var CONTINUOUS_SPEED = 24; // pixels por segundo
    var MANUAL_DURATION = 650;

    // O owl no site original mede a largura do container Elementor com o padding
    // incluído (20px a mais que a área útil), e é essa medida que define os cards.
    // Reproduzir isso mantém o layout idêntico — inclusive o transbordo do último card.
    var box = el.closest('.e-con') || el;

    var normalizeOffset = function () {
      if (!step) return;
      var loopStart = CLONES * step;
      var loopLength = n * step;
      while (offset >= loopStart + loopLength) offset -= loopLength;
      while (offset < loopStart) offset += loopLength;
    };
    var render = function () {
      if (!step) return;
      stage.style.transform = 'translate3d(' + (-offset) + 'px, 0, 0)';
      var viewportWidth = box.clientWidth;
      var firstCell = Math.floor(offset / step);
      cells.forEach(function (c, i) {
        var left = i * step - offset;
        var visible = left < viewportWidth && left + step - margin > 0;
        c.classList.toggle('active', visible);
        c.classList.toggle('uc-active-item', i === firstCell);
      });
      var logicalIndex = ((firstCell - CLONES) % n + n) % n;
      dots.forEach(function (b, i) { b.classList.toggle('active', i === logicalIndex); });
    };
    var layout = function () {
      var progress = step ? (offset - CLONES * step) / step : 0;
      per = itemsFor();
      var w = box.clientWidth / per - margin;
      step = w + margin;
      cells.forEach(function (c) { c.style.width = w + 'px'; c.style.marginRight = margin + 'px'; });
      stage.style.width = cells.length * step + 'px';
      stage.style.transition = 'none';
      stage.style.willChange = 'transform';
      offset = (CLONES + progress) * step;
      normalizeOffset();
      render();
    };
    var startTween = function (target) {
      tween = { from: offset, to: target, elapsed: 0 };
    };
    var go = function (to) {
      var current = (offset - CLONES * step) / step;
      var delta = to - current;
      while (delta > n / 2) delta -= n;
      while (delta < -n / 2) delta += n;
      startTween(offset + delta * step);
    };
    var isPaused = function () {
      return pointerOverCard || focusInsideCard || document.hidden;
    };
    var tick = function (time) {
      var elapsed = lastFrame ? Math.min(time - lastFrame, 50) : 0;
      lastFrame = time;
      if (!isPaused()) {
        if (tween) {
          tween.elapsed += elapsed;
          var progress = Math.min(tween.elapsed / MANUAL_DURATION, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          offset = tween.from + (tween.to - tween.from) * eased;
          if (progress === 1) {
            tween = null;
            normalizeOffset();
          }
        } else {
          offset += CONTINUOUS_SPEED * elapsed / 1000;
          normalizeOffset();
        }
        render();
      }
      window.requestAnimationFrame(tick);
    };

    // A esteira desliza continuamente e congela exatamente no ponto atual enquanto
    // o ponteiro (ou o foco do teclado) estiver dentro de qualquer card.
    cells.forEach(function (cell) {
      on(cell, 'mouseenter', function () {
        pointerOverCard = true;
      });
      on(cell, 'mouseleave', function () {
        pointerOverCard = false;
      });
      on(cell, 'focusin', function () {
        focusInsideCard = true;
      });
      on(cell, 'focusout', function (event) {
        if (cell.contains(event.relatedTarget)) return;
        focusInsideCard = false;
      });
    });

    on(nav.querySelector('.owl-prev'), 'click', function () { startTween(offset - step); });
    on(nav.querySelector('.owl-next'), 'click', function () { startTween(offset + step); });
    on(document, 'visibilitychange', function () { lastFrame = 0; });

    layout();
    window.requestAnimationFrame(tick);
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
    var speed = Math.max(+root.getAttribute('data-toogle-speed') || 0, 620);
    var easing = 'cubic-bezier(.22, 1, .36, 1)';

    var headers = [].slice.call(root.querySelectorAll('.eael-accordion-header'));
    var panelOf = function (h) { return document.getElementById(h.getAttribute('aria-controls')); };

    var slide = function (panel, show) {
      var animationId = (panel._faqAnimationId || 0) + 1;
      panel._faqAnimationId = animationId;

      var wasHidden = window.getComputedStyle(panel).display === 'none';
      if (wasHidden) panel.style.display = 'block';

      // Guarda o estado visual atual para permitir inverter a animação no meio sem
      // saltos, por exemplo quando o usuário clica rapidamente em outra pergunta.
      var liveStyle = window.getComputedStyle(panel);
      var startHeight = wasHidden ? 0 : panel.getBoundingClientRect().height;
      var startOpacity = wasHidden ? 0 : parseFloat(liveStyle.opacity) || 1;
      var startPaddingTop = wasHidden ? 0 : parseFloat(liveStyle.paddingTop) || 0;
      var startPaddingBottom = wasHidden ? 0 : parseFloat(liveStyle.paddingBottom) || 0;
      var startBorderTop = wasHidden ? 0 : parseFloat(liveStyle.borderTopWidth) || 0;
      var startBorderBottom = wasHidden ? 0 : parseFloat(liveStyle.borderBottomWidth) || 0;

      // Mede o painel completamente aberto. Padding e bordas precisam participar
      // da transição; caso contrário, seus 32px aparecem de uma vez e endurecem o efeito.
      panel.style.transition = 'none';
      panel.style.height = 'auto';
      panel.style.paddingTop = '';
      panel.style.paddingBottom = '';
      panel.style.borderTopWidth = '';
      panel.style.borderBottomWidth = '';
      var naturalStyle = window.getComputedStyle(panel);
      var naturalHeight = panel.getBoundingClientRect().height;
      var naturalPaddingTop = parseFloat(naturalStyle.paddingTop) || 0;
      var naturalPaddingBottom = parseFloat(naturalStyle.paddingBottom) || 0;
      var naturalBorderTop = parseFloat(naturalStyle.borderTopWidth) || 0;
      var naturalBorderBottom = parseFloat(naturalStyle.borderBottomWidth) || 0;

      panel.style.overflow = 'hidden';
      panel.style.height = startHeight + 'px';
      panel.style.opacity = String(startOpacity);
      panel.style.paddingTop = startPaddingTop + 'px';
      panel.style.paddingBottom = startPaddingBottom + 'px';
      panel.style.borderTopWidth = startBorderTop + 'px';
      panel.style.borderBottomWidth = startBorderBottom + 'px';
      panel.style.transform = wasHidden ? 'translateY(-10px)' : liveStyle.transform;
      panel.style.willChange = 'height, opacity, transform, padding';

      // Força o navegador a registrar o estado inicial em pixels. Sem essa leitura,
      // abertura e fechamento podem ser agrupados no mesmo frame e parecer instantâneos.
      panel.offsetHeight;

      var transition = [
        'height ' + speed + 'ms ' + easing,
        'padding-top ' + speed + 'ms ' + easing,
        'padding-bottom ' + speed + 'ms ' + easing,
        'border-top-width ' + speed + 'ms ' + easing,
        'border-bottom-width ' + speed + 'ms ' + easing,
        'opacity ' + Math.round(speed * 0.72) + 'ms ease-out',
        'transform ' + speed + 'ms ' + easing
      ].join(', ');
      panel.style.transition = transition;

      var timer;
      var finish = function (event) {
        if (event && (event.target !== panel || event.propertyName !== 'height')) return;
        panel.removeEventListener('transitionend', finish);
        clearTimeout(timer);
        if (panel._faqAnimationId !== animationId) return;

        panel.style.transition = '';
        panel.style.height = '';
        panel.style.opacity = '';
        panel.style.transform = '';
        panel.style.paddingTop = '';
        panel.style.paddingBottom = '';
        panel.style.borderTopWidth = '';
        panel.style.borderBottomWidth = '';
        panel.style.overflow = '';
        panel.style.willChange = '';
        if (!show) panel.style.display = 'none';
      };

      panel.addEventListener('transitionend', finish);
      timer = setTimeout(finish, speed + 100);
      requestAnimationFrame(function () {
        if (panel._faqAnimationId !== animationId) return;
        panel.style.height = (show ? naturalHeight : 0) + 'px';
        panel.style.paddingTop = (show ? naturalPaddingTop : 0) + 'px';
        panel.style.paddingBottom = (show ? naturalPaddingBottom : 0) + 'px';
        panel.style.borderTopWidth = (show ? naturalBorderTop : 0) + 'px';
        panel.style.borderBottomWidth = (show ? naturalBorderBottom : 0) + 'px';
        panel.style.opacity = show ? '1' : '0';
        panel.style.transform = show ? 'translateY(0)' : 'translateY(-10px)';
      });
    };

    var setState = function (header, show) {
      var panel = panelOf(header);
      header.classList.toggle('active', show);
      header.classList.toggle('show-this', show);
      header.setAttribute('aria-expanded', show ? 'true' : 'false');
      if (!panel) return;
      panel.classList.toggle('active', show);
      panel.setAttribute('aria-hidden', show ? 'false' : 'true');
      slide(panel, show);
    };

    headers.forEach(function (h) {
      var panel = panelOf(h);
      if (!panel) return;
      var initiallyOpen = h.classList.contains('active');
      h.setAttribute('role', 'button');
      h.setAttribute('aria-expanded', initiallyOpen ? 'true' : 'false');
      panel.setAttribute('aria-hidden', initiallyOpen ? 'false' : 'true');
      panel.classList.toggle('active', initiallyOpen);
      panel.style.display = initiallyOpen ? 'block' : 'none';

      on(h, 'click', function () {
        var isOpen = h.classList.contains('active');
        if (exclusive && !isOpen) {
          headers.forEach(function (o) {
            if (o === h || !o.classList.contains('active')) return;
            setState(o, false);
          });
        }
        setState(h, !isOpen);
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
    document.querySelectorAll('.lenise-reviews-carousel').forEach(reviewsCarousel);
    document.querySelectorAll('.uc_carousel.owl-carousel').forEach(ucCarousel);
    document.querySelectorAll('.elementor-posts-container.elementor-has-item-ratio').forEach(postThumbRatio);
    document.querySelectorAll('.eael-adv-accordion').forEach(accordion);
  }
  document.readyState === 'loading' ? on(document, 'DOMContentLoaded', init) : init();
})();
