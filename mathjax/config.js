// PlayPage MathJax config (no inline JS needed)
// MathJax is Apache-2.0 licensed; this file is project-owned glue code.
window.MathJax = {
  tex: {
    inlineMath: [
      ['$', '$'],
      ['\\(', '\\)']
    ],
    displayMath: [
      ['$$', '$$'],
      ['\\[', '\\]']
    ]
  },
  svg: {
    fontCache: 'local'
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
  },
  startup: {
    ready: () => {
      const mj = window.MathJax;
      mj.startup.defaultReady();
      mj.typesetPromise().catch((err) => console.warn('MathJax typeset error', err));
    }
  }
};
