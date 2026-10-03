// Sizes every nstarkman.space card iframe on the page to its card. Include it
// once, anywhere: <script src="https://nstarkman.space/embed/resize.js" async></script>
//
// A frame only ever resizes itself — the message is matched to the iframe it
// came from — so it is not worth checking the sender's origin.
addEventListener('message', (e) => {
  if (e.data?.type !== 'nstarkman-embed' || !(e.data.height > 0)) return;
  for (const f of document.getElementsByTagName('iframe')) {
    if (f.contentWindow === e.source) f.style.height = `${e.data.height}px`;
  }
});
