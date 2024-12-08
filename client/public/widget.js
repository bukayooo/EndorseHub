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
      max-width: 100%;
      margin: 0 auto;
    }
    .testimonial-card {
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
      background: white;
    }
    .testimonial-author {
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .testimonial-content {
      color: #4a5568;
      line-height: 1.5;
    }
    .testimonial-rating {
      color: #eab308;
      margin-bottom: 0.5rem;
    }
  `;
  document.head.appendChild(style);

  // Fetch widget data
  fetch(`${window.location.origin}/embed/${widgetId}`)
    .then(response => response.json())
    .then(data => {
      if (!data.testimonials) return;
      
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
        </div>
      `).join('');

      container.innerHTML = `
        <div class="testimonial-widget">
          ${testimonials}
        </div>
      `;
    })
    .catch(error => {
      console.error('Error loading testimonial widget:', error);
      container.innerHTML = '<p>Error loading testimonials</p>';
    });
})();
