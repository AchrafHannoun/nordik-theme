/**
 * Returns a function that as long as it continues to be invoked, won't be triggered.
 * @param {Function} fn - Callback function.
 * @param {number} [wait=300] - Delay (in milliseconds).
 * @returns {Function}
 */
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

if (!customElements.get('quick-links')) {
  class QuickLinks extends HTMLElement {
    constructor() {
      super();
      this.list = this.querySelector('.quick-links__list');
      this.toggle = this.querySelector('.quick-links__toggle');
      this.previousWidth = null;
      this.minListHeight = Math.round(this.list.getBoundingClientRect().height);
      this.transitionsEnabled = null;

      if (this.list && this.toggle) {
        const debouncedResizeHandler = debounce(this.handleResize.bind(this), 300);
        this.resizeObserver = new ResizeObserver(debouncedResizeHandler);
        this.toggle.addEventListener('click', this.handleToggle.bind(this));
      }
    }

    connectedCallback() {
      if (this.resizeObserver) {
        this.resizeObserver.observe(this.list);
      }
    }

    disconnectedCallback() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
    }

    /**
     * Handles resize-related updates on the list element.
     * @param {Array} entries - Array of ResizeObserverEntry objects.
     */
    handleResize(entries) {
      const currentWidth = Math.round(entries[0].contentRect.width);

      if (this.previousWidth === null) {
        this.previousWidth = currentWidth;
        this.updateListHeight();
        this.updateListVisibilityOnResize();
      } else if (currentWidth !== this.previousWidth) {
        this.previousWidth = currentWidth;
        this.updateListHeight();
        this.updateListVisibilityOnResize();
      } else {
        this.updateListHeight();
      }
    }

    /**
     * Handles 'click' events on the toggle element.
     * @param {object} evt - Event object.
     */
    handleToggle(evt) {
      evt.preventDefault();

      if (this.transitionsEnabled === null) {
        this.transitionsEnabled = window.getComputedStyle(this.list).transitionDuration !== '0s';
      }

      if (!this.classList.contains('is-expanded')) {
        this.open();
      } else {
        this.close();
      }
    }

    /**
     * Opens the list element.
     */
    open() {
      if (this.classList.contains('is-expanded') || (this.classList.contains('quick-links--carousel') && !theme.mediaMatches.md)) return;

      this.updateListHeight();
      this.classList.add('is-expanded');
      this.updateListVisibilityOnToggle();
      this.toggle.textContent = this.dataset.showLessText;
    }

    /**
     * Closes the list element.
     */
    close() {
      if (!this.classList.contains('is-expanded') || (this.classList.contains('quick-links--carousel') && !theme.mediaMatches.md)) return;

      this.updateListHeight();
      this.classList.remove('is-expanded');
      this.updateListVisibilityOnToggle();
      this.toggle.textContent = this.dataset.showMoreText;
    }

    updateListHeight() {
      if (this.classList.contains('quick-links--carousel') && !theme.mediaMatches.md) {
        this.style.removeProperty('--list-height-max');
      } else {
        this.style.setProperty('--list-height-max', `${Math.round(this.list.scrollHeight)}px`);
      }
    }

    updateListVisibilityOnResize() {
      const isCarousel = this.classList.contains('quick-links--carousel') && !theme.mediaMatches.md;
      const isExpanded = this.classList.contains('is-expanded');
      const currentHeight = Math.round(this.list.clientHeight);

      if (!isCarousel && !isExpanded && currentHeight > this.minListHeight) {
        this.minListHeight = Math.round(this.list.getBoundingClientRect().height);
      }

      const targetHeight = isExpanded ? Math.round(this.list.scrollHeight) : this.minListHeight;
      const listStart = Math.round(this.list.getBoundingClientRect().top);
      const listEnd = Math.round(listStart + targetHeight);

      Array.from(this.list.children).forEach((item) => {
        const isHidden = item.getBoundingClientRect().top > listEnd;
        QuickLinks.updateListItemVisibility(item, isHidden);
      });
    }

    updateListVisibilityOnToggle() {
      const targetHeight = this.classList.contains('is-expanded') ? Math.round(this.list.scrollHeight) : this.minListHeight;
      const listStart = Math.round(this.list.getBoundingClientRect().top);
      const listEnd = Math.round(listStart + targetHeight);

      Array.from(this.list.children).forEach((item) => {
        const isHidden = item.getBoundingClientRect().top > listEnd;
        QuickLinks.updateListItemVisibility(item, isHidden);
      });
    }

    static updateListItemVisibility(item, hidden) {
      if (!item) return;

      if (!hidden) {
        item.classList.remove('is-hidden');
        item.removeAttribute('aria-hidden');
        item.querySelector('a')?.removeAttribute('tabindex');
      } else {
        item.classList.add('is-hidden');
        item.setAttribute('aria-hidden', true);
        item.querySelector('a')?.setAttribute('tabindex', -1);
      }
    }
  }

  customElements.define('quick-links', QuickLinks);
}
