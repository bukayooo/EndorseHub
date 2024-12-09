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
  `;
  document.head.appendChild(style);

  // Apply theme variables
  const applyTheme = (theme = 'default') => {
    const themeVars = themes[theme] || themes.default;
    Object.entries(themeVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  };

  // Fetch widget data and render
  fetch(`${window.location.origin}/embed/${widgetId}`)
    .then(response => response.json())
    .then(data => {
      if (!data.testimonials) return;
      
      // Apply theme from widget settings
      if (data.theme) {
        applyTheme(data.theme);
      }

      // Format date
      const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };

      // Render testimonials
      const testimonials = data.testimonials.map(testimonial => `
        <div class="testimonial-card">
          <div class="testimonial-author">${testimonial.authorName}</div>
          ${testimonial.rating ? `
            <div class="testimonial-rating">
              ${'★'.repeat(testimonial.rating)}${'☆'.repeat(5 - testimonial.rating)}
            </div>
          ` : ''}
          <div class="testimonial-content">${testimonial.content}</div>
          ${testimonial.createdAt ? `
            <div class="testimonial-date">${formatDate(testimonial.createdAt)}</div>
          ` : ''}
        </div>
      `).join('');

      container.innerHTML = `
        <div class="testimonial-widget">
          <div class="testimonial-grid">
            ${testimonials}
          </div>
        </div>
      `;
    })
    .catch(error => {
      console.error('Error loading testimonial widget:', error);
      container.innerHTML = '<p>Error loading testimonials</p>';
    });
})();
