(function() {
  // Find the widget container
  const container = document.getElementById('testimonial-widget');
  if (!container) return;

  const widgetId = container.getAttribute('data-widget-id');
  if (!widgetId) return;

  // Apply base styles
  const style = document.createElement('style');
  style.textContent = `
    .testimonial-widget {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      box-sizing: border-box;
    }
    .testimonial-card {
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 0.75rem;
      padding: 2rem;
      margin-bottom: 1.5rem;
      background: var(--card-bg, white);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    }
    .testimonial-author {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
    }
    .testimonial-content {
      color: #4a5568;
      line-height: 1.6;
      font-size: 0.95rem;
    }
    .testimonial-rating {
      color: #eab308;
      margin-bottom: 0.75rem;
      font-size: 1.1rem;
    }
    .testimonial-date {
      color: #718096;
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
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      }
    }
    @media (min-width: 1024px) {
      .testimonial-grid {
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      }
    }
  `;
  document.head.appendChild(style);

  // Fetch widget data
  fetch(`${window.location.origin}/embed/${widgetId}`)
    .then(response => response.json())
    .then(data => {
      if (!data.testimonials) return;
      
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
