(function () {
  const items = document.querySelectorAll('.landing-reveal');
  if (items.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    );

    items.forEach((item) => observer.observe(item));
  }

  const sections = ['hero', 'features', 'pillars', 'process', 'cta'];

  function setActiveNav() {
    const scrollY = window.scrollY + 120;
    sections.forEach((id) => {
      const el = document.getElementById(id);
      const link = document.querySelector(`.landing-nav-links a[href="#${id}"]`);
      if (!el || !link) return;
      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      link.classList.toggle('is-active', scrollY >= top && scrollY < bottom);
    });
  }

  window.addEventListener('scroll', setActiveNav, { passive: true });
  setActiveNav();

  const menuBtn = document.getElementById('landing-menu-btn');
  const navLinks = document.getElementById('landing-nav-links');

  function closeLandingMenu() {
    navLinks?.classList.remove('is-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuBtn?.addEventListener('click', () => {
    const isOpen = navLinks?.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeLandingMenu);
  });
})();
