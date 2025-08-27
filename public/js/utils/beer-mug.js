// public/js/utils/beer-mug.js
// Reusable beer-mug progress animator used across pages (import/delete/modify)

/**
 * Update a beer-mug SVG by id prefix generated per page.
 * Expects elements: beer-fill-${prefix}, beer-foam-${prefix}
 * Optionally supports: beer-foam-overflow-${prefix}, beer-foam-drop-${prefix}
 *
 * @param {string} prefix - id suffix, e.g., 'import' | 'delete' | 'modify'
 * @param {number} percentage - 0..100
 */
export function updateBeerMug(prefix, percentage) {
  try {
    const fillEl = document.getElementById(`beer-fill-${prefix}`);
    const foamPath = document.getElementById(`beer-foam-${prefix}`);
    const overflowRect = document.getElementById(`beer-foam-overflow-${prefix}`);
    const drop = document.getElementById(`beer-foam-drop-${prefix}`);

    const pct = Math.max(0, Math.min(100, Number(percentage) || 0));
    const fillH = Math.max(0, Math.min(16, (pct / 100) * 16));
    const crest = 26 - fillH; // top of liquid

    if (fillEl) {
      fillEl.setAttribute('y', String(crest));
      fillEl.setAttribute('height', String(fillH));
      // Make beer appear edge-to-edge by slightly widening and shifting fill
      try { fillEl.setAttribute('x', '8.5'); fillEl.setAttribute('width', '17'); } catch (_) {}
    }

    // Enhanced foam path
    if (foamPath && foamPath.tagName.toLowerCase() === 'path') {
      const wave = `M9 ${crest} C11 ${crest - amplitude*1.5}, 13 ${crest + amplitude}, 15 ${crest - amplitude/2} C17 ${crest + amplitude*1.2}, 19 ${crest - amplitude}, 21 ${crest + amplitude/2} C23 ${crest - amplitude*0.8}, 25 ${crest}, 25 ${crest} L25 ${crest + 4} L9 ${crest + 4} Z`;
      foamPath.setAttribute('d', wave);
      foamPath.setAttribute('fill', 'url(#foamGradient)'); // Assume gradient exists
    }

    // Update bubbles section
    const bubbles = [
      document.getElementById(`beer-bubble1-${prefix}`),
      document.getElementById(`beer-bubble2-${prefix}`),
      document.getElementById(`beer-bubble3-${prefix}`),
      document.getElementById(`beer-bubble4-${prefix}`)
    ];
    bubbles.forEach((bubble, idx) => {
      if (bubble && pct > 0) {
        bubble.style.display = 'block';
        bubble.setAttribute('r', String(0.5 + Math.random() * 1)); // Vary size 0.5-1.5
        bubble.setAttribute('fill', 'white');
        bubble.setAttribute('opacity', '0.8');
        bubble.style.animation = `bubbleRise ${1.5 + idx * 0.5}s linear infinite`;
        const bubbleY = crest + fillH * Math.random(); // Random within liquid
        const bubbleX = 9 + Math.random() * 16; // Within mug width
        bubble.setAttribute('cy', String(bubbleY));
        bubble.setAttribute('cx', String(bubbleX));
      } else if (bubble) {
        bubble.style.display = 'none';
      }
    });

    // Enhanced overflow
    if (overflowRect && drop && pct >= 90) {
      const extra = Math.min(5, (pct - 90) / 10 * 5);
      overflowRect.style.display = 'block';
      overflowRect.setAttribute('height', String(extra));
      overflowRect.setAttribute('y', String(26 - fillH - extra)); // Position at top of foam
      if (pct >= 95) {
        drop.style.display = 'block';
        drop.classList.add('foam-drip-anim'); // Renamed for leaking effect
        setTimeout(() => drop.classList.remove('foam-drip-anim'), 1500);
      }
    }
  } catch (_) { /* non-blocking */ }
}

export default { updateBeerMug };


