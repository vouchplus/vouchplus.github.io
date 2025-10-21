// Mobile Navigation Handler for Vouch+
document.addEventListener('DOMContentLoaded', function() {
  const navToggle = document.getElementById('nav-toggle');
  const navInner = document.querySelector('.nav-inner');
  
  if (!navToggle || !navInner) return;

  function openMenu() {
    navInner.classList.add('mobile-open');
    document.body.classList.add('menu-open');
    navToggle.setAttribute('aria-expanded', 'true');
    
    // Update icon to close (X)
    const icon = navToggle.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-times';
    }
  }

  function closeMenu() {
    navInner.classList.remove('mobile-open');
    document.body.classList.remove('menu-open');
    navToggle.setAttribute('aria-expanded', 'false');
    
    // Update icon to menu (hamburger)
    const icon = navToggle.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-bars';
    }
  }

  function toggleMenu() {
    if (navInner.classList.contains('mobile-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  // Toggle menu on button click
  navToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleMenu();
  });
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', function(event) {
    if (!navInner.classList.contains('mobile-open')) return;
    if (navInner.contains(event.target)) return;
    if (navToggle.contains(event.target)) return;
    closeMenu();
  });
  
  // Close mobile menu when pressing Escape
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && navInner.classList.contains('mobile-open')) {
      closeMenu();
      navToggle.focus();
    }
  });
  
  // Close mobile menu when window is resized to desktop size
  const mq = window.matchMedia('(min-width: 769px)');
  function handleBreakpointChange(mqEvent) {
    if (mqEvent.matches && navInner.classList.contains('mobile-open')) {
      closeMenu();
    }
  }
  
  // Initial check
  handleBreakpointChange(mq);
  
  // Listen for changes
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handleBreakpointChange);
  } else {
    mq.addListener(handleBreakpointChange); // older browsers
  }
});

// Utility function to handle responsive behavior
function handleResponsiveElements() {
  // Handle responsive text sizing
  const responsiveElements = document.querySelectorAll('.text-responsive, .text-responsive-lg, .text-responsive-xl');
  responsiveElements.forEach(element => {
    if (window.innerWidth <= 640) {
      element.classList.add('text-sm', 'text-base', 'text-lg');
    }
  });
  
  // Handle responsive spacing
  const spacingElements = document.querySelectorAll('.p-responsive, .px-responsive, .py-responsive');
  spacingElements.forEach(element => {
    if (window.innerWidth <= 640) {
      element.classList.add('p-4', 'px-4', 'py-4');
    }
  });
}

// Initialize responsive behavior
document.addEventListener('DOMContentLoaded', handleResponsiveElements);
window.addEventListener('resize', handleResponsiveElements);

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// Handle form submissions on mobile
document.addEventListener('DOMContentLoaded', function() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      // Add loading state for better UX
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
      }
    });
  });
});

// Handle touch events for better mobile interaction
document.addEventListener('DOMContentLoaded', function() {
  // Add touch feedback for buttons
  const buttons = document.querySelectorAll('button, .btn, a[role="button"]');
  buttons.forEach(button => {
    button.addEventListener('touchstart', function() {
      this.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('touchend', function() {
      this.style.transform = 'scale(1)';
    });
  });
});

// Handle orientation changes
window.addEventListener('orientationchange', function() {
  // Close mobile menu on orientation change
  const navInner = document.querySelector('.nav-inner');
  if (navInner && navInner.classList.contains('mobile-open')) {
    navInner.classList.remove('mobile-open');
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
      const icon = navToggle.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-bars';
      }
    }
  }
  
  // Recalculate responsive elements
  setTimeout(handleResponsiveElements, 100);
});