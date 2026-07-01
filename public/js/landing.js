(function () {
  const items = document.querySelectorAll('.landing-reveal');
  if (!items.length) return;

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

  const sections = ['hero', 'features', 'pillars', 'process', 'cta'];
  const links = document.querySelectorAll('.landing-nav-links a');

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
})();
