class ReadersNav extends HTMLElement {
  connectedCallback() {
    // Check if we are on the index page
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '';
    const prefix = isIndexPage ? '' : 'index.html';

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
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

    // Add styles to Shadow Root
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        position: sticky;
        top: 0;
        z-index: 50;
        width: 100%;
      }
      a {
        transition: color 0.2s ease;
      }
      a:hover {
        color: #1E4D3B !important;
      }
    `;
    shadow.appendChild(style);
  }
}

customElements.define('readers-nav', ReadersNav);


class ReadersArchive extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }
      </style>
      <div id="archive-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;">
        <div style="grid-column: span 4; text-align: center; color: oklch(0.5 0.02 60); font-size: 14px; padding: 40px 0;">도서 목록을 불러오는 중입니다...</div>
      </div>
      <div style="text-align:center;margin-top:48px;">
        <button id="more-archive-btn" style="display:none;background:none;border:none;color:#2A6B52;font-size:15px;font-weight:700;cursor:pointer;padding:12px 28px;transition:all 0.2s ease;font-family:'Fredoka',sans-serif;letter-spacing:0.05em;border:2px solid #2A6B52;border-radius:30px;">more →</button>
      </div>
    `;

    const API_URL = "https://script.google.com/macros/s/AKfycbzYkkbDw6IFe926bTiSu7qYIeqTFeH3m8nxScZJF454rc_BLxB0SVUYdMKsWd8g1qdjVQ/exec";
    let archiveData = [];
    let visibleCount = 4;

    const grid = shadow.querySelector("#archive-grid");
    const btn = shadow.querySelector("#more-archive-btn");

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#2A6B52";
      btn.style.color = "#fff";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "none";
      btn.style.color = "#2A6B52";
    });

    const fetchWithTimeout = (url, options = {}, timeout = 8000) => {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('요청 시간 초과 (Timeout)')), timeout))
      ]);
    };

    const renderArchive = () => {
      grid.innerHTML = "";
      const slice = archiveData.slice(0, visibleCount);
      slice.forEach(book => {
        const dateVal = book.date || book.data;
        const dObj = new Date(dateVal);
        let monthString = "";
        if (dObj && !isNaN(dObj)) {
          monthString = `${dObj.getMonth() + 1}월 모임`;
        } else {
          monthString = dateVal || "";
        }

        const item = document.createElement("div");
        item.style.opacity = "0";
        item.style.transform = "translateY(15px)";
        item.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        
        item.innerHTML = `
          <div style="aspect-ratio:3/4.4; border-radius:8px; overflow:hidden; margin-bottom:12px; box-shadow:0 8px 24px rgba(0,0,0,0.06); background:#fcfcfc;">
            <img src="${book.url || ''}" alt="${book.name || ''}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%23efefef\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'12\\' fill=\\'%23999\\'>이미지 없음</text></svg>'">
          </div>
          <div style="font-size:14px; font-weight:600; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Noto Sans KR',sans-serif;">${book.name || '제목 없음'}</div>
          <div style="font-size:12px; color:oklch(0.5 0.02 60); display:flex; justify-content:space-between; align-items:center; font-family:'Noto Sans KR',sans-serif;">
            <span>${monthString}</span>
            <span style="font-size:11px; opacity:0.8;">${book.author || ''}</span>
          </div>
        `;
        grid.appendChild(item);
        
        setTimeout(() => {
          item.style.opacity = "1";
          item.style.transform = "translateY(0)";
        }, 30);
      });

      if (visibleCount < archiveData.length) {
        btn.style.display = "inline-block";
      } else {
        btn.style.display = "none";
      }
    };

    btn.addEventListener("click", () => {
      visibleCount += 8;
      renderArchive();
    });

    fetchWithTimeout(API_URL + "?action=getArchive")
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP 에러! 상태코드: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        data.sort((a, b) => {
          const dateA = new Date(a.date || a.data);
          const dateB = new Date(b.date || b.data);
          return dateB - dateA;
        });
        archiveData = data;
        renderArchive();
      })
      .catch(err => {
        console.error("Failed to load archive", err);
        grid.innerHTML = `
          <div style="grid-column: span 4; text-align: center; color: #ff4d4f; font-size: 14px; padding: 40px 0; font-family:'Noto Sans KR',sans-serif;">
            목록을 불러오지 못했습니다.<br>
            <span style="font-size:12px; color:oklch(0.5 0.02 60); display:inline-block; margin-top:8px;">상세 오류: ${err.message || err.toString()}</span>
          </div>
        `;
      });
  }
}
customElements.define('readers-archive', ReadersArchive);
