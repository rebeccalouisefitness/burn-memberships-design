/* Display-only price wording (Rebecca, 15 Oct: "everything just ninety nine").
 * Annual is shown as $6.99 / $13.99 / $18.99 a month, COMPLETE billed $227.99 a year.
 * This file only rewrites text on the marketing pages. It does NOT change the prices
 * site.js sends to checkout - the plumbing owns those (window.BURN_PRICES, Stripe). */
(function () {
  'use strict';
  var MAP = [
    ['$7.00', '$6.99'], ['$14.00', '$13.99'], ['$18.75', '$18.99'], ['$224.99', '$227.99'],
    ['Save 33%', 'Save 32%'], ['save 33%', 'save 32%'], ['up to 33%', 'up to 32%']
  ];
  function fix(node) {
    var t = node.nodeValue, n = t;
    for (var i = 0; i < MAP.length; i++) if (n.indexOf(MAP[i][0]) > -1) n = n.split(MAP[i][0]).join(MAP[i][1]);
    if (n !== t) node.nodeValue = n;
  }
  function walk(root) {
    if (root.nodeType === 3) return fix(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), x;
    while ((x = w.nextNode())) fix(x);
  }
  function run() { walk(document.body); }
  run();
  document.addEventListener('burn:billing', run);
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'characterData') fix(m.target);
      else m.addedNodes.forEach(function (n) { walk(n); });
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
