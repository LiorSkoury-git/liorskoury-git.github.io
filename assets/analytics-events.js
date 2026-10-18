// Record portfolio actions without collecting visitor input or identifiers.
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href]');
  if (!link || !window.umami?.track) return;

  const href = link.getAttribute('href');
  if (href === '/assets/Vitae/Lior_Skoury_CV.docx') {
    window.umami.track('cv-download-click');
  } else if (href.startsWith('mailto:')) {
    window.umami.track('contact-email-click');
  } else if (link.closest('.publication')) {
    const title = link.closest('.publication').querySelector('h3, h4')?.textContent.trim();
    if (title) window.umami.track('publication-open', { title });
  } else if (link.closest('.social-links')) {
    window.umami.track('profile-open', { profile: link.textContent.trim().replace(/\s*↗$/, '') });
  } else if (link.closest('.demo-card, .satellite-card, .demonstrator-body')) {
    const project = link.closest('.demo-card, .satellite-card')?.querySelector('h2, h3')?.textContent.trim() || document.querySelector('.project-header h1')?.textContent.trim();
    if (project && link.origin !== location.origin) window.umami.track('project-source-open', { project });
  }
});
