class ReadersNav extends HTMLElement {
  connectedCallback() {
    // Check if we are on the index page
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '';
    const prefix = isIndexPage ? '' : 'index.html';

    this.innerHTML = `
      <div style="background:oklch(0.98 0.008 80 / 0.9);backdrop-filter:blur(8px);border-bottom:1px solid oklch(0.9 0.01 60);width:100%;">
        <div style="max-width:1200px;margin:0 auto;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
          <a href="${prefix}#" style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:24px;letter-spacing:-0.01em;color:inherit;text-decoration:none;">Reader's Club</a>
          <div style="display:flex;gap:32px;font-size:14px;font-weight:500;color:oklch(0.4 0.02 60);">
            <a href="${prefix}#notice" style="color:#2A6B52;text-decoration:none;">공지</a>
            <a href="${prefix}#book" style="color:#2A6B52;text-decoration:none;">이번달 책</a>
            <a href="${prefix}#apply" style="color:#2A6B52;text-decoration:none;">Topic 등록</a>
            <a href="${prefix}#archive" style="color:#2A6B52;text-decoration:none;">지난 모임</a>
          </div>
        </div>
      </div>
    `;

    // Add CSS transitions and host styles
    const style = document.createElement('style');
    style.textContent = `
      readers-nav {
        display: block;
        position: sticky;
        top: 0;
        z-index: 50;
        width: 100%;
      }
      readers-nav a {
        transition: color 0.2s ease;
      }
      readers-nav a:hover {
        color: #1E4D3B !important;
      }
    `;
    this.appendChild(style);
  }
}

customElements.define('readers-nav', ReadersNav);
