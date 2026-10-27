/* =========================================================
   LE CABANON BLEU — Animations et interactions
   ---------------------------------------------------------
   Dépendances (CDN, versions fixes, chargées avant ce fichier) :
   - GSAP 3.12.5 + ScrollTrigger : animations liées au scroll
   - Lenis 1.1.13 : scroll fluide

   Principe : amélioration progressive.
   Sans JavaScript, si le CDN ne répond pas, ou si le visiteur
   a choisi « réduire les animations », le site reste complet
   et lisible : ce fichier ne fait qu'ajouter du mouvement.

   Sommaire
   1. Préparation et garde-fous
   2. En-tête : passage en barre claire au scroll
   3. Scroll fluide (Lenis) synchronisé avec ScrollTrigger
   4. Découpe du texte en mots (sans plugin payant)
   5. Hero : entrée cinéma + parallaxe en plusieurs plans
   6. Section horizontale épinglée (ordinateur)
   7. Révélations au scroll (titres, fondus, masques d'images)
   8. Bandeau cinétique
   9. Boutons magnétiques (souris uniquement)
   ========================================================= */

(() => {
  'use strict';

  /* -------------------------------------------------------
     1. PRÉPARATION ET GARDE-FOUS
     ------------------------------------------------------- */
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  const hasGsap =
    typeof window.gsap !== 'undefined' &&
    typeof window.ScrollTrigger !== 'undefined';

  // Si GSAP manque, le CSS ré-affiche immédiatement le hero.
  if (!hasGsap) root.classList.add('no-gsap');

  /* -------------------------------------------------------
     2. EN-TÊTE
     Sur l'accueil, la barre reste transparente au-dessus de la
     photo, puis devient claire à mi-hauteur du hero (avant que
     le titre, qui remonte, ne passe dessous).
     Fonctionne aussi sans GSAP (simple écouteur de scroll).
     ------------------------------------------------------- */
  if (header) {
    const updateHeader = () => {
      const limit = hero ? hero.offsetHeight * 0.45 : 10;
      header.classList.toggle('is-scrolled', window.scrollY > limit);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader);
  }

  // À partir d'ici, tout est du mouvement : on s'arrête si
  // GSAP est absent ou si le visiteur préfère moins d'animations.
  if (!hasGsap || reduceMotion) return;

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  /* -------------------------------------------------------
     3. SCROLL FLUIDE (Lenis)
     Lenis pilote le défilement ; ScrollTrigger est mis à jour
     à chaque frame via le ticker de GSAP (une seule boucle).
     ------------------------------------------------------- */
  let lenis = null;

  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Zones qui gardent leur propre défilement (menu mobile, calendrier)
    document
      .querySelectorAll('.nav-links, .stay-calendar')
      .forEach((el) => el.setAttribute('data-lenis-prevent', ''));

    // Le calendrier est une fenêtre modale : on fige la page dessous.
    const calendar = document.querySelector('.stay-calendar');
    if (calendar) {
      new MutationObserver(() =>
        calendar.open ? lenis.stop() : lenis.start(),
      ).observe(calendar, { attributes: true, attributeFilter: ['open'] });
    }

    // Liens d'ancre de la page : défilement fluide, en tenant compte
    // de la hauteur de l'en-tête, puis focus sur la cible (clavier).
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href*="#"]');
      if (!link || link.classList.contains('skip-link')) return;

      const url = new URL(link.href, window.location.href);
      if (url.pathname !== window.location.pathname || !url.hash) return;

      const target = document.getElementById(url.hash.slice(1));
      if (!target) return;

      event.preventDefault();
      lenis.scrollTo(target, {
        offset: -(header ? header.offsetHeight : 0) - 16,
        onComplete: () => {
          if (!target.hasAttribute('tabindex'))
            target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        },
      });
      history.pushState(null, '', url.hash);
    });
  }

  /* -------------------------------------------------------
     4. DÉCOUPE DU TEXTE EN MOTS
     Chaque mot est placé dans un masque (.split-line) pour
     pouvoir glisser de bas en haut. Les balises internes
     (<em>, <br>) sont conservées. Le titre garde son texte
     complet pour les lecteurs d'écran via aria-label.
     ------------------------------------------------------- */
  function splitWords(element) {
    element.setAttribute(
      'aria-label',
      element.textContent.replace(/\s+/g, ' ').trim(),
    );

    const wrapTextNodes = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName !== 'BR') wrapTextNodes(child);
          return;
        }
        if (child.nodeType !== Node.TEXT_NODE) return;

        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            fragment.append(document.createTextNode(' '));
            return;
          }
          const mask = document.createElement('span');
          const word = document.createElement('span');
          mask.className = 'split-line';
          mask.setAttribute('aria-hidden', 'true');
          word.className = 'split-word';
          word.textContent = part;
          mask.append(word);
          fragment.append(mask);
        });
        child.replaceWith(fragment);
      });
    };

    wrapTextNodes(element);
    return element.querySelectorAll('.split-word');
  }

  /* -------------------------------------------------------
     5. HERO
     Entrée : la photo se pose (zoom arrière lent), puis le
     titre monte mot par mot, puis le reste apparaît.
     Scroll : trois plans à des vitesses différentes —
     la photo descend lentement (profondeur), le texte monte
     plus vite et s'efface, les légendes suivent un 3e rythme.
     ------------------------------------------------------- */
  if (hero) {
    const media = hero.querySelector('.hero-media');
    const image = hero.querySelector('.hero-img');
    const content = hero.querySelector('.hero-content');
    const title = hero.querySelector('.hero-title');
    const details = hero.querySelectorAll('.hero-subtitle, .hero-foot');
    const captions = hero.querySelectorAll('.hero-scroll, .hero-caption');
    const words = splitWords(title);

    // Le CSS masquait le hero pendant la préparation : on le rend visible,
    // les éléments démarrent ensuite depuis leur état « avant animation ».
    gsap.set([content, ...captions], { opacity: 1 });

    gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .from(image, { scale: 1.25, duration: 2.6, ease: 'power3.out' }, 0)
      .from(words, { yPercent: 115, duration: 1.5, stagger: 0.07 }, 0.15)
      .from(details, { y: 32, opacity: 0, duration: 1.4, stagger: 0.12 }, 0.6)
      .from(captions, { opacity: 0, duration: 1.2 }, 1.1);

    gsap
      .timeline({
        defaults: { duration: 1 }, // 1 = tout le parcours du hero
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
      .to(media, { yPercent: 28, ease: 'none' }, 0)
      .to(content, { yPercent: -22, ease: 'none' }, 0)
      // le texte s'efface sur la première moitié du parcours seulement
      .to(content, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 0)
      .to(captions, { yPercent: -260, ease: 'none' }, 0);
  }

  /* -------------------------------------------------------
     6. SECTION HORIZONTALE ÉPINGLÉE (ordinateur uniquement)
     Créée AVANT les autres déclencheurs situés plus bas : GSAP
     calcule les positions dans l'ordre de création, et le pin
     ajoute de la hauteur à la page.
     La section reste fixée à l'écran ; le scroll vertical fait
     glisser la piste des services vers la gauche. Chaque photo
     glisse aussi un peu dans son cadre (parallaxe horizontale).
     gsap.matchMedia annule tout proprement sous 901 px : on
     retrouve alors le carrousel tactile natif défini en CSS.
     ------------------------------------------------------- */
  const services = document.querySelector('.services');
  const mm = gsap.matchMedia();

  if (services) {
    mm.add('(min-width: 901px)', () => {
      const track = services.querySelector('.services-track');
      const progress = services.querySelector('.services-progress span');
      const distance = () => track.offsetWidth - window.innerWidth;

      services.classList.add('is-pinned');
      track.removeAttribute('tabindex'); // plus de défilement interne au clavier

      const slide = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: services,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => gsap.set(progress, { scaleX: self.progress }),
        },
      });

      track.querySelectorAll('.service-photo').forEach((photo) => {
        gsap.fromTo(
          photo,
          { xPercent: -6 },
          {
            xPercent: 6,
            ease: 'none',
            scrollTrigger: {
              trigger: photo.closest('.service-item'),
              containerAnimation: slide,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          },
        );
      });

      return () => {
        services.classList.remove('is-pinned');
        track.setAttribute('tabindex', '0');
      };
    });
  }

  /* -------------------------------------------------------
     7. RÉVÉLATIONS AU SCROLL
     - [data-split]  : titres révélés mot par mot
     - [data-reveal] : fondus décalés (par lots, de haut en bas)
     - [data-mask]   : images dévoilées par un masque (clip-path)
                       pendant que la photo se « pose » (zoom arrière)
     Les styles posés par GSAP sont nettoyés à la fin, pour que
     les effets de survol en CSS reprennent la main.
     ------------------------------------------------------- */
  gsap.utils.toArray('[data-split]').forEach((heading) => {
    const words = splitWords(heading);
    gsap.set(heading, { visibility: 'visible' });
    gsap.from(words, {
      yPercent: 115,
      duration: 1.3,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
    });
  });

  gsap.set('[data-reveal]', { opacity: 0, y: 40 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.1,
        clearProps: 'transform,opacity',
      }),
  });

  gsap.utils.toArray('[data-mask]').forEach((frame) => {
    const image = frame.querySelector('img');
    gsap
      .timeline({
        scrollTrigger: { trigger: frame, start: 'top 88%', once: true },
        onComplete: () => gsap.set([frame, image], { clearProps: 'all' }),
      })
      .fromTo(
        frame,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' },
      )
      .fromTo(
        image,
        { scale: 1.35 },
        { scale: 1, duration: 2, ease: 'expo.out' },
        0.15,
      );
  });

  /* -------------------------------------------------------
     8. BANDEAU CINÉTIQUE
     Deux lignes de texte géant qui glissent en sens opposés
     pendant que le bandeau traverse l'écran.
     ------------------------------------------------------- */
  gsap.utils.toArray('.bandeau-row').forEach((row, index) => {
    const toLeft = index % 2 === 0;
    gsap.fromTo(
      row,
      { xPercent: toLeft ? 0 : -30 },
      {
        xPercent: toLeft ? -30 : 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.bandeau',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );
  });

  /* -------------------------------------------------------
     9. BOUTONS MAGNÉTIQUES (souris uniquement)
     Les boutons sont attirés par le pointeur puis reviennent
     en place avec un petit rebond. Rien n'est activé sur écran
     tactile ou stylet imprécis.
     ------------------------------------------------------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document
      .querySelectorAll('.btn-primary, .btn-reserver, .footer-top')
      .forEach((button) => {
        const moveX = gsap.quickTo(button, 'x', {
          duration: 0.8,
          ease: 'elastic.out(1, 0.4)',
        });
        const moveY = gsap.quickTo(button, 'y', {
          duration: 0.8,
          ease: 'elastic.out(1, 0.4)',
        });

        button.addEventListener('pointermove', (event) => {
          const box = button.getBoundingClientRect();
          moveX((event.clientX - (box.left + box.width / 2)) * 0.3);
          moveY((event.clientY - (box.top + box.height / 2)) * 0.4);
        });
        button.addEventListener('pointerleave', () => {
          moveX(0);
          moveY(0);
        });
      });
  }

  // Les polices modifient les hauteurs : on recalcule les déclencheurs.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
