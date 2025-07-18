/**
 * Circular Progress Spinner Component
 * Usage: createCircularProgress({ value, label, state, id })
 * - value: 0-100 (percent)
 * - label: status message (optional)
 * - state: '', 'error', 'warning', 'complete', 'ready' (optional)
 * - id: DOM id (optional)
 * 
 * Fixes visual duplication and rendering bugs in progress spinner during async operations
 */
export function createCircularProgress({ value = 0, label = '', state = '', id = '' } = {}) {
  // Ensure proper sizing and rendering calculations
  const size = 80;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Clamp value between 0 and 100
  const percent = Math.max(0, Math.min(100, value));
  
  // Calculate stroke dash array for proper circular progress
  const dashOffset = circumference - (percent / 100) * circumference;
  
  // Generate unique ID if not provided
  const elementId = id || `circular-progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create wrapper element with proper state management
  const wrapper = document.createElement('div');
  wrapper.className = `circular-progress${state ? ' ' + state : ''}`;
  wrapper.id = elementId;
  wrapper.setAttribute('role', 'progressbar');
  wrapper.setAttribute('aria-valuenow', percent);
  wrapper.setAttribute('aria-valuemin', 0);
  wrapper.setAttribute('aria-valuemax', 100);
  wrapper.setAttribute('aria-label', label ? `${label} ${percent}%` : `${percent}%`);
  
  // Add data attributes for debugging and state tracking
  wrapper.setAttribute('data-percent', percent);
  wrapper.setAttribute('data-state', state);
  wrapper.setAttribute('data-created', new Date().toISOString());

  // Create SVG with proper viewBox and dimensions
  wrapper.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle 
        class="circular-bg" 
        cx="${size/2}" 
        cy="${size/2}" 
        r="${radius}" 
        fill="none"
        stroke="#e0e0e0"
        stroke-width="${stroke}"
      />
      <!-- Foreground progress circle -->
      <circle 
        class="circular-fg" 
        cx="${size/2}" 
        cy="${size/2}" 
        r="${radius}" 
        fill="none"
        stroke="var(--brand-color, #7c3aed)"
        stroke-width="${stroke}"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${dashOffset}"
        transform="rotate(-90 ${size/2} ${size/2})"
      />
    </svg>
    <!-- Percentage label -->
    <span class="circular-label">${Math.round(percent)}%</span>
    ${label ? `<span class="circular-status">${label}</span>` : ''}
  `;
  
  // Add debug logging for spinner creation
  console.debug('Circular Progress Created:', {
    id: elementId,
    percent,
    state,
    size,
    stroke,
    radius,
    circumference,
    dashOffset,
    label
  });
  
  return wrapper;
} 