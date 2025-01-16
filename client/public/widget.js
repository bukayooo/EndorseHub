(function() {
  // Find the widget container
  const container = document.getElementById('testimonial-widget');
  if (!container) return;

  const widgetId = container.getAttribute('data-widget-id');
  if (!widgetId) return;

  // Define theme variables
  const themes = {
    default: {
      '--bg-color': '#ffffff',
      '--text-color': '#1a1a1a',
      '--border-color': '#e2e8f0',
      '--card-bg': '#ffffff',
      '--content-color': '#4a5568',
      '--date-color': '#718096',
      '--rating-color': '#eab308'
    },
    light: {
      '--bg-color': '#f8fafc',
      '--text-color': '#1a1a1a',
      '--border-color': '#e2e8f0',
      '--card-bg': '#ffffff',
      '--content-color': '#4a5568',
      '--date-color': '#94a3b8',
      '--rating-color': '#eab308'
    },
    dark: {
      '--bg-color': '#1a1a1a',
      '--text-color': '#ffffff',
      '--border-color': '#2d2d2d',
      '--card-bg': '#2d2d2d',
      '--content-color': '#d1d5db',
      '--date-color': '#9ca3af',
      '--rating-color': '#fbbf24'
    },
    brand: {
      '--bg-color': '#f0f9ff',
      '--text-color': '#0c4a6e',
      '--border-color': '#bae6fd',
      '--card-bg': '#ffffff',
      '--content-color': '#0369a1',
      '--date-color': '#0284c7',
      '--rating-color': '#0ea5e9'
    }
  };

  // Apply base styles
  const style = document.createElement('style');
  style.textContent = `
    .testimonial-widget {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
      box-sizing: border-box;
      background: var(--bg-color);
      color: var(--text-color);
      position: relative;
    }
    @media (min-width: 768px) {
      .testimonial-widget {
        padding: 2rem;
      }
    }
    .testimonial-card {
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      background: var(--card-bg);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    }
    @media (min-width: 768px) {
      .testimonial-card {
        padding: 2rem;
      }
    }
    .testimonial-author {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text-color);
    }
    .testimonial-content {
      color: var(--content-color);
      line-height: 1.6;
      font-size: 0.95rem;
      margin: 1rem 0;
    }
    .testimonial-rating {
      color: var(--rating-color);
      margin-bottom: 0.75rem;
      font-size: 1.1rem;
    }
    .testimonial-date {
      color: var(--date-color);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .testimonial-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 640px) {
      .testimonial-grid {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }
    }
    .testimonial-carousel {
      position: relative;
      overflow: visible;
      width: 100%;
      padding: 0 3rem;
    }
    .testimonial-carousel-content {
      display: flex;
      transition: transform 0.3s ease;
      overflow: hidden;
    }
    .testimonial-carousel-item {
      flex: 0 0 100%;
      padding: 1rem;
      box-sizing: border-box;
    }
    .testimonial-nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      background: var(--bg-color);
      border: 1px solid var(--border-color);
      color: var(--text-color);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      white-space: nowrap;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
      cursor: pointer;
      outline: none;
      z-index: 10;
    }
    .testimonial-nav-button:hover {
      background: var(--border-color);
    }
    .testimonial-nav-button:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--border-color), 0 0 0 4px var(--text-color);
    }
    .testimonial-nav-button:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    .testimonial-nav-button svg {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }
    .testimonial-nav-prev {
      left: -3rem;
    }
    .testimonial-nav-next {
      right: -3rem;
    }
  `;
  document.head.appendChild(style);

  // Apply theme variables
  const applyTheme = (theme = 'default') => {
    console.log('Applying theme:', theme);
    const themeVars = themes[theme] || themes.default;
    console.log('Theme variables:', themeVars);
    Object.entries(themeVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
      console.log('Setting CSS variable:', key, value);
    });
    // Apply theme to widget container as well
    container.style.setProperty('--widget-theme', theme);
  };

  // Get widget data from the window object
  const data = window.WIDGET_DATA;
  console.log('[Widget] Received widget data:', JSON.stringify(data, null, 2));
  
  if (!data || !data.testimonials) {
    console.error('[Widget] Widget data not found or invalid');
    return;
  }

  if (!data.template) {
    console.error('[Widget] Template not specified, defaulting to grid');
    data.template = 'grid';
  }

  console.log('[Widget] Using template:', data.template);
  console.log('[Widget] Number of testimonials:', data.testimonials.length);

  // Apply theme and customization settings
  const customization = data.customization || {
    theme: 'default',
    showRatings: true
  };
  
  console.log('[Widget] Using customization:', customization);
  
  // Apply theme
  applyTheme(customization.theme);

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Initialize carousel state
  let currentSlide = 0;
  const updateCarousel = () => {
    console.log('[Widget] Updating carousel, current slide:', currentSlide);
    const carouselContent = container.querySelector('.testimonial-carousel-content');
    if (carouselContent) {
      carouselContent.style.transform = `translateX(-${currentSlide * 100}%)`;
      
      // Update button states
      const prevButton = container.querySelector('.testimonial-nav-prev');
      const nextButton = container.querySelector('.testimonial-nav-next');
      if (prevButton) {
        prevButton.disabled = currentSlide === 0;
        console.log('[Widget] Prev button state:', prevButton.disabled);
      } else {
        console.error('[Widget] Previous button not found');
      }
      if (nextButton) {
        nextButton.disabled = currentSlide === data.testimonials.length - 1;
        console.log('[Widget] Next button state:', nextButton.disabled);
      } else {
        console.error('[Widget] Next button not found');
      }
    } else {
      console.error('[Widget] Carousel content not found');
    }
  };

  // Navigation functions
  const goToNextSlide = () => {
    console.log('[Widget] Attempting to go to next slide');
    if (currentSlide < data.testimonials.length - 1) {
      currentSlide++;
      updateCarousel();
    }
  };

  const goToPrevSlide = () => {
    console.log('[Widget] Attempting to go to previous slide');
    if (currentSlide > 0) {
      currentSlide--;
      updateCarousel();
    }
  };

  // Render testimonials with carousel structure if template is carousel
  console.log('[Widget] Rendering template:', data.template);
  const testimonialContent = data.template === 'carousel' 
    ? `
      <div class="testimonial-carousel">
        <div class="testimonial-carousel-content">
          ${data.testimonials.map((testimonial, index) => `
            <div class="testimonial-carousel-item" data-index="${index}">
              <div class="testimonial-card">
                <div class="testimonial-author">${testimonial.authorName}</div>
                ${customization.showRatings && testimonial.rating ? `
                  <div class="testimonial-rating">
                    ${'★'.repeat(testimonial.rating)}${'☆'.repeat(5 - testimonial.rating)}
                  </div>
                ` : ''}
                <div class="testimonial-content">${testimonial.content}</div>
                ${testimonial.createdAt ? `
                  <div class="testimonial-date">${formatDate(testimonial.createdAt)}</div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        <button class="testimonial-nav-button testimonial-nav-prev" aria-label="Previous testimonial" type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button class="testimonial-nav-button testimonial-nav-next" aria-label="Next testimonial" type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    `
    : `<div class="testimonial-grid">
        ${data.testimonials.map(testimonial => `
          <div class="testimonial-card">
            <div class="testimonial-author">${testimonial.authorName}</div>
            ${customization.showRatings && testimonial.rating ? `
              <div class="testimonial-rating">
                ${'★'.repeat(testimonial.rating)}${'☆'.repeat(5 - testimonial.rating)}
              </div>
            ` : ''}
            <div class="testimonial-content">${testimonial.content}</div>
            ${testimonial.createdAt ? `
              <div class="testimonial-date">${formatDate(testimonial.createdAt)}</div>
            ` : ''}
          </div>
        `).join('')}
      </div>`;

  console.log('[Widget] Setting container HTML');
  container.innerHTML = `
    <div class="testimonial-widget">
      ${testimonialContent}
    </div>
  `;

  // Add event listeners for carousel navigation if template is carousel
  if (data.template === 'carousel') {
    console.log('[Widget] Setting up carousel navigation');
    const prevButton = container.querySelector('.testimonial-nav-prev');
    const nextButton = container.querySelector('.testimonial-nav-next');
    
    // Debug button elements
    console.log('[Widget] Navigation buttons:', {
      prevButton: prevButton ? {
        className: prevButton.className,
        style: prevButton.style.cssText,
        rect: prevButton.getBoundingClientRect()
      } : null,
      nextButton: nextButton ? {
        className: nextButton.className,
        style: nextButton.style.cssText,
        rect: nextButton.getBoundingClientRect()
      } : null
    });
    
    if (prevButton) {
      console.log('[Widget] Adding prev button listener');
      prevButton.addEventListener('click', (e) => {
        console.log('[Widget] Prev button clicked', e);
        goToPrevSlide();
      });
    } else {
      console.error('[Widget] Previous button not found after render');
    }
    if (nextButton) {
      console.log('[Widget] Adding next button listener');
      nextButton.addEventListener('click', (e) => {
        console.log('[Widget] Next button clicked', e);
        goToNextSlide();
      });
    } else {
      console.error('[Widget] Next button not found after render');
    }
    
    // Initialize carousel state
    console.log('[Widget] Initializing carousel state');
    updateCarousel();
  } else {
    console.log('[Widget] Not a carousel template, skipping navigation setup');
  }
})();
