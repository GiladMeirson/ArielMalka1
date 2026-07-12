/* Ariel Malka Engineers — shared site behaviors */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header scroll state + reading conductor ---------- */
  var header = document.getElementById('site-header');
  var conductor = document.querySelector('.scroll-conductor');
  if (header) {
    var scrollTick = false;
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 24);
      if (conductor) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        conductor.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      }
      scrollTick = false;
    };
    onScroll();
    window.addEventListener('scroll', function () {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(onScroll);
      }
    }, { passive: true });
  }

  /* ---------- Hero electric-field glow (fine pointers only) ---------- */
  var glow = document.querySelector('.hero-glow');
  if (glow && !prefersReduced && window.matchMedia('(pointer: fine)').matches) {
    var glowHero = glow.closest('.hero');
    var gx = 0, gy = 0, tx = 0, ty = 0, glowRaf = null;
    var glowStep = function () {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.setProperty('--gx', gx + 'px');
      glow.style.setProperty('--gy', gy + 'px');
      if (Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5) {
        glowRaf = requestAnimationFrame(glowStep);
      } else {
        glowRaf = null;
      }
    };
    glowHero.addEventListener('mousemove', function (e) {
      var r = glowHero.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      glow.classList.add('on');
      if (!glowRaf) glowRaf = requestAnimationFrame(glowStep);
    });
    glowHero.addEventListener('mouseleave', function () {
      glow.classList.remove('on');
    });
  }

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var open = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mainNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mainNav.classList.contains('open')) {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        navToggle.focus();
      }
    });
  }

  /* ---------- Services dropdown (click/keyboard; hover handled in CSS) ---------- */
  document.querySelectorAll('.has-dropdown').forEach(function (dd) {
    var btn = dd.querySelector(':scope > button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = dd.getAttribute('data-open') === 'true';
      dd.setAttribute('data-open', String(!open));
      btn.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) {
        dd.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    dd.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        dd.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });

    /* stagger siblings inside .reveal-stagger containers */
    document.querySelectorAll('.reveal-stagger').forEach(function (group) {
      var children = group.querySelectorAll(':scope > .reveal');
      children.forEach(function (child, i) {
        child.style.setProperty('--reveal-delay', (Math.min(i, 8) * 70) + 'ms');
      });
    });
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var runCounter = function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (prefersReduced || isNaN(target)) {
        el.textContent = target + suffix;
        return;
      }
      var dur = 1400;
      var start = null;
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window && !prefersReduced) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            cio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var lbImg = document.getElementById('lightbox-img');
    var lbCaption = document.getElementById('lightbox-caption');
    var lbClose = document.getElementById('lightbox-close');
    var lastFocus = null;

    var openLb = function (src, caption) {
      lastFocus = document.activeElement;
      lbImg.src = src;
      lbImg.alt = caption || '';
      lbCaption.textContent = caption || '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    };
    var closeLb = function () {
      lightbox.classList.remove('open');
      lbImg.src = '';
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };

    document.querySelectorAll('[data-lightbox]').forEach(function (card) {
      card.addEventListener('click', function () {
        openLb(card.getAttribute('data-lightbox'), card.getAttribute('data-caption'));
      });
    });
    lbClose.addEventListener('click', closeLb);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLb();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLb();
    });
  }

  /* ---------- Project filters ---------- */
  var filterTabs = document.querySelector('.filter-tabs');
  if (filterTabs) {
    var items = document.querySelectorAll('[data-cats]');
    filterTabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterTabs.querySelectorAll('.filter-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      var filter = btn.getAttribute('data-filter');
      items.forEach(function (item) {
        var show = filter === 'all' || item.getAttribute('data-cats').split(' ').indexOf(filter) !== -1;
        item.classList.toggle('project-hidden', !show);
      });
    });
  }

  /* ---------- Contact form → opens mail client with a ready message ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var v = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };
      var subjectMap = v('cf-subject') || 'פנייה כללית';
      var subject = 'פנייה מהאתר — ' + subjectMap + ' — ' + v('cf-name');
      var lines = [
        'שם: ' + v('cf-name'),
        'ארגון: ' + (v('cf-org') || '—'),
        'אימייל: ' + v('cf-email'),
        'טלפון: ' + v('cf-phone'),
        'נושא: ' + subjectMap,
        '',
        v('cf-msg')
      ];
      window.location.href = 'mailto:ariel@arielmalka1.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  /* ---------- Electric FX: click discharges + ambient arc flickers ---------- */
  var fxLayer = null;
  if (!prefersReduced) {
    fxLayer = document.createElement('div');
    fxLayer.id = 'fx-layer';
    fxLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fxLayer);
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* one jagged arc from (x,y) toward `angle`, `len` px long.
     variant: undefined = bright copper, 'blue' = bright azure, 'ambient' = faint azure */
  function spawnBolt(x, y, len, angle, variant) {
    if (!fxLayer || fxLayer.childElementCount > 20) return;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'bolt' + (variant ? ' ' + variant : ''));
    svg.setAttribute('viewBox', '-70 -70 140 140');
    svg.style.left = x + 'px';
    svg.style.top = y + 'px';

    var buildPath = function (a, l, x0, y0) {
      var segs = 4 + Math.floor(Math.random() * 3);
      var d = 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1);
      var mid = { x: x0, y: y0 };
      for (var i = 1; i <= segs; i++) {
        var t = i / segs;
        var jitter = (Math.random() - .5) * l * .42;
        var bx = x0 + Math.cos(a) * l * t + Math.cos(a + Math.PI / 2) * jitter;
        var by = y0 + Math.sin(a) * l * t + Math.sin(a + Math.PI / 2) * jitter;
        d += ' L' + bx.toFixed(1) + ' ' + by.toFixed(1);
        if (i === Math.ceil(segs / 2)) { mid = { x: bx, y: by }; }
      }
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
      return mid;
    };

    var mid = buildPath(angle, len, 0, 0);
    /* bright bolts sometimes fork mid-way, like a real arc */
    if (variant !== 'ambient' && Math.random() > .45) {
      buildPath(angle + (Math.random() > .5 ? .8 : -.8), len * .45, mid.x, mid.y);
    }

    fxLayer.appendChild(svg);
    setTimeout(function () { svg.remove(); }, 650);
  }

  /* click = discharge: expanding ring + 2-4 arcs bursting outward */
  function discharge(x, y) {
    if (!fxLayer) return;
    var ring = document.createElement('div');
    ring.className = 'discharge-ring';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    fxLayer.appendChild(ring);
    setTimeout(function () { ring.remove(); }, 520);

    var count = 2 + Math.floor(Math.random() * 3);
    var base = Math.random() * Math.PI * 2;
    for (var i = 0; i < count; i++) {
      spawnBolt(x, y,
        24 + Math.random() * 22,
        base + i * (Math.PI * 2 / count) + (Math.random() - .5) * .6);
    }
  }

  if (fxLayer) {
    /* pointerdown feels instant with a mouse; on touch use click so scrolling doesn't spark */
    var fxEvent = window.matchMedia('(pointer: fine)').matches ? 'pointerdown' : 'click';
    document.addEventListener(fxEvent, function (e) {
      if (e.clientX === 0 && e.clientY === 0) return;         /* keyboard "clicks" */
      if (e.target && e.target.closest &&
          e.target.closest('input, textarea, select')) return; /* stay quiet in forms */
      discharge(e.clientX, e.clientY);
    }, { passive: true });

    /* ambient arcs: an occasional faint flicker inside whichever dark section is on screen */
    var darkZones = document.querySelectorAll('.hero, .cta-band, .section.on-dark, .site-footer');
    if (darkZones.length) {
      setInterval(function () {
        if (document.hidden || Math.random() < .35) return;
        var visible = [];
        darkZones.forEach(function (z) {
          var r = z.getBoundingClientRect();
          if (r.bottom > 90 && r.top < window.innerHeight - 60 && r.height > 140) visible.push(r);
        });
        if (!visible.length) return;
        var r = visible[Math.floor(Math.random() * visible.length)];
        var top = Math.max(r.top, 0);
        var bottom = Math.min(r.bottom, window.innerHeight);
        spawnBolt(
          r.left + r.width * (.08 + Math.random() * .84),
          top + (bottom - top) * (.15 + Math.random() * .7),
          16 + Math.random() * 18,
          Math.random() * Math.PI * 2,
          'ambient');
      }, 3600);
    }

    /* ---------- Team aura: photos crackle like a charged field ---------- */
    var teamCards = document.querySelectorAll('.team-card');
    if (teamCards.length) {
      /* one arc at a random point on the photo's outline, hugging the edge */
      var perimeterArc = function (img, bright) {
        var r = img.getBoundingClientRect();
        if (r.width < 40 || r.bottom < 0 || r.top > window.innerHeight) return;
        var per = 2 * (r.width + r.height);
        var d = Math.random() * per;
        var x, y, tangent;
        if (d < r.width)                       { x = r.left + d;  y = r.top;    tangent = 0; }
        else if (d < r.width + r.height)       { x = r.right;     y = r.top + (d - r.width); tangent = Math.PI / 2; }
        else if (d < 2 * r.width + r.height)   { x = r.right - (d - r.width - r.height); y = r.bottom; tangent = 0; }
        else                                   { x = r.left;      y = r.bottom - (d - 2 * r.width - r.height); tangent = Math.PI / 2; }
        var angle = tangent + (Math.random() > .5 ? 0 : Math.PI) + (Math.random() - .5) * .9;
        spawnBolt(x, y, 13 + Math.random() * 15, angle,
          bright ? (Math.random() > .5 ? 'blue' : undefined) : 'ambient');
      };

      teamCards.forEach(function (card) {
        var img = card.querySelector('.team-photo');
        if (!img) return;
        var auraTimer = null;
        card.addEventListener('pointerenter', function () {
          card.classList.add('charged');
          if (auraTimer) return;
          perimeterArc(img, true);
          auraTimer = setInterval(function () { perimeterArc(img, true); }, 170);
        });
        card.addEventListener('pointerleave', function () {
          card.classList.remove('charged');
          clearInterval(auraTimer);
          auraTimer = null;
        });
      });

      /* idle crackle: now and then a random visible photo sparks briefly */
      setInterval(function () {
        if (document.hidden || Math.random() < .4) return;
        var visible = [];
        teamCards.forEach(function (c) {
          var r = c.getBoundingClientRect();
          if (r.top < window.innerHeight - 80 && r.bottom > 80) visible.push(c);
        });
        if (!visible.length) return;
        var img = visible[Math.floor(Math.random() * visible.length)].querySelector('.team-photo');
        if (img) { perimeterArc(img, false); perimeterArc(img, false); }
      }, 4200);
    }
  }

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
