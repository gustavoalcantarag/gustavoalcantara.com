/* ========================================
   GusPad Soundboard - Main JavaScript
   Version: 1.6
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initSmoothScroll();
    initDemoPads();
});

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Interactive demo pads animation
 */
function initDemoPads() {
    document.querySelectorAll('.demo-pad').forEach(pad => {
        pad.addEventListener('click', function() {
            // Scale down animation
            this.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                // Scale up animation
                this.style.transform = 'scale(1.1)';
                
                setTimeout(() => {
                    // Reset to original state
                    this.style.transform = '';
                }, 100);
            }, 100);
        });
        
        // Add touch feedback for mobile
        pad.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        }, { passive: true });
        
        pad.addEventListener('touchend', function() {
            this.style.transform = '';
        }, { passive: true });
    });
}

/**
 * Header scroll effect (optional enhancement)
 */
function initHeaderScroll() {
    const header = document.querySelector('header');
    
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.style.background = 'rgba(10, 10, 10, 0.98)';
            } else {
                header.style.background = 'rgba(10, 10, 10, 0.95)';
            }
        }, { passive: true });
    }
}
