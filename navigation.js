const API_URL = "https://script.google.com/macros/s/AKfycbxqJukWhIxtRm-XmZLZUNdfQLu0vfL6QnAwG_K4uCubRVqrWC-9dOpNAMYuvxJEUy44Kg/exec";

class ReadersNav extends HTMLElement {
  connectedCallback() {
    // Check if we are on the index page
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '';
    const prefix = isIndexPage ? '' : 'index.html';

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <div style="background:oklch(0.98 0.008 80 / 0.9);backdrop-filter:blur(8px);border-bottom:1px solid oklch(0.9 0.01 60);width:100%;">
        <div style="max-width:1200px;margin:0 auto;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
          <a href="${prefix}#" style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:24px;letter-spacing:-0.01em;color:inherit;text-decoration:none;">Book Club</a>
          <div style="display:flex;align-items:center;gap:32px;font-size:14px;font-weight:500;color:oklch(0.4 0.02 60);">
            <a href="${prefix}#notice" style="color:#2A6B52;text-decoration:none;">공지</a>
            <a href="${prefix}#book" style="color:#2A6B52;text-decoration:none;">이번달 책</a>
            <a href="${prefix}#apply" style="color:#2A6B52;text-decoration:none;">Topic 등록</a>
            <a href="${prefix}#archive" style="color:#2A6B52;text-decoration:none;">지난 모임</a>
            
            <!-- Login State Container -->
            <div id="auth-container" style="display:flex;align-items:center;gap:12px;">
              <!-- Will be populated dynamically -->
            </div>
          </div>
        </div>
      </div>

      <!-- Login Modal Overlay -->
      <div id="login-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
        <div style="background:white; padding:32px; border-radius:12px; width:360px; box-shadow:0 20px 40px rgba(0,0,0,0.2); box-sizing:border-box; font-family:'Noto Sans KR',sans-serif; position:relative; color: #333;">
          <button id="modal-close-btn" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:22px; cursor:pointer; color:#999; line-height:1;">&times;</button>
          <h3 style="margin:0 0 20px; font-size:18px; font-weight:700; color:#2A6B52;">로그인</h3>
          
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:12px; color:#666; margin-bottom:6px; font-weight:600;">사용자 ID (이름)</label>
            <input type="text" id="login-id-input" placeholder="이름을 입력하세요" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <div style="margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="signup-check" style="cursor:pointer; width:16px; height:16px;">
            <label for="signup-check" style="font-size:13px; cursor:pointer; user-select:none; font-weight:500;">최초 가입입니다</label>
          </div>
          
          <div id="code-field" style="display:none; margin-bottom:20px;">
            <label style="display:block; font-size:12px; color:#666; margin-bottom:6px; font-weight:600;">가입 코드</label>
            <input type="text" id="signup-code-input" placeholder="가입 코드를 입력하세요" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <div id="modal-error-msg" style="color:#d93025; font-size:12px; margin-bottom:16px; display:none; line-height:1.4;"></div>
          
          <button id="modal-submit-btn" style="width:100%; background:#2A6B52; color:white; border:none; padding:12px; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer; transition:background 0.2s ease;">확인</button>
        </div>
      </div>

      <!-- Topic Registration Modal Overlay -->
      <div id="topic-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
        <div style="background:white; padding:32px; border-radius:12px; width:420px; box-shadow:0 20px 40px rgba(0,0,0,0.2); box-sizing:border-box; font-family:'Noto Sans KR',sans-serif; position:relative; color: #333;">
          <button id="topic-modal-close-btn" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:22px; cursor:pointer; color:#999; line-height:1;">&times;</button>
          
          <h3 style="margin:0 0 4px; font-size:18px; font-weight:700; color:#2A6B52;">Topic 등록하기</h3>
          <div id="topic-user-display" style="font-size:13px; color:#666; margin-bottom:24px; font-weight:500;">등록자: 님</div>
          
          <div style="margin-bottom:20px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">어떤 책에 대한 토픽인가요?</label>
            <select id="topic-book-select" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit; background: white; cursor: pointer;">
              <!-- Loaded dynamically -->
            </select>
          </div>
          
          <div style="margin-bottom:24px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">이 책에 대해 함께 이야기하고 싶은 질문은 무엇인가요?</label>
            <textarea id="topic-content-input" placeholder="이야기 나누고 싶은 질문이나 토픽 내용을 입력해 주세요." style="width:100%; height:120px; padding:12px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit; resize: none; line-height:1.5;"></textarea>
          </div>
          
          <div id="topic-modal-error-msg" style="color:#d93025; font-size:12px; margin-bottom:16px; display:none; line-height:1.4;"></div>
          
          <button id="topic-modal-submit-btn" style="width:100%; background:#2A6B52; color:white; border:none; padding:12px; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer; transition:background 0.2s ease;">등록 완료</button>
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

    const authContainer = shadow.getElementById("auth-container");
    const loginModal = shadow.getElementById("login-modal");
    const closeBtn = shadow.getElementById("modal-close-btn");
    const submitBtn = shadow.getElementById("modal-submit-btn");
    const idInput = shadow.getElementById("login-id-input");
    const signupCheck = shadow.getElementById("signup-check");
    const codeField = shadow.getElementById("code-field");
    const codeInput = shadow.getElementById("signup-code-input");
    const errorMsg = shadow.getElementById("modal-error-msg");

    // Topic Modal elements
    const topicModal = shadow.getElementById("topic-modal");
    const topicCloseBtn = shadow.getElementById("topic-modal-close-btn");
    const topicSubmitBtn = shadow.getElementById("topic-modal-submit-btn");
    const topicUserDisplay = shadow.getElementById("topic-user-display");
    const bookSelect = shadow.getElementById("topic-book-select");
    const contentInput = shadow.getElementById("topic-content-input");
    const topicErrorMsg = shadow.getElementById("topic-modal-error-msg");

    // Check login state
    const updateAuthState = () => {
      const savedUser = localStorage.getItem("readers_user_id");
      if (savedUser) {
        authContainer.innerHTML = `
          <span style="color:#2A6B52; font-weight:600; font-size:13px;">${savedUser} 님</span>
          <button id="logout-btn" style="background:none; border:1px solid #2A6B52; color:#2A6B52; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px; font-family:'Noto Sans KR',sans-serif; transition:all 0.2s ease; line-height:1.2;">로그아웃</button>
        `;
        // Attach logout listener
        authContainer.querySelector("#logout-btn").addEventListener("click", () => {
          localStorage.removeItem("readers_user_id");
          updateAuthState();
          window.dispatchEvent(new CustomEvent("readers-logout"));
        });
      } else {
        authContainer.innerHTML = `
          <button id="login-btn" style="background:#2A6B52; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px; font-family:'Noto Sans KR',sans-serif; transition:background 0.2s ease;">로그인</button>
        `;
        // Attach login listener
        authContainer.querySelector("#login-btn").addEventListener("click", () => {
          errorMsg.style.display = "none";
          idInput.value = "";
          signupCheck.checked = false;
          codeField.style.display = "none";
          codeInput.value = "";
          loginModal.style.display = "flex";
        });
      }
    };

    // Close Modals
    closeBtn.addEventListener("click", () => {
      loginModal.style.display = "none";
    });
    topicCloseBtn.addEventListener("click", () => {
      topicModal.style.display = "none";
    });

    // Toggle Sign-up Code field
    signupCheck.addEventListener("change", () => {
      if (signupCheck.checked) {
        codeField.style.display = "block";
      } else {
        codeField.style.display = "none";
      }
    });

    // Submit login/registration
    submitBtn.addEventListener("click", async () => {
      const idVal = idInput.value.trim();
      errorMsg.style.display = "none";

      if (!idVal) {
        errorMsg.textContent = "ID(이름)를 입력해 주세요.";
        errorMsg.style.display = "block";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "처리 중...";

      try {
        if (signupCheck.checked) {
          // Signup process
          const codeVal = codeInput.value.trim();
          if (codeVal !== "bookclub") {
            throw new Error("가입 코드가 올바르지 않습니다.");
          }

          // Register in members sheet
          const res = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: {
              "Content-Type": "text/plain"
            },
            body: JSON.stringify({
              action: "addMember",
              id: idVal
            })
          });
          const result = await res.json();
          if (!result.success) {
            throw new Error(result.error || "가입 처리에 실패했습니다.");
          }
        } else {
          // Login check process
          const res = await fetch(`${API_URL}?action=checkMember&id=${encodeURIComponent(idVal)}`);
          const result = await res.json();
          if (!result.exists) {
            throw new Error("존재하지 않는 회원 ID입니다. 최초 가입이시라면 체크박스를 활성화해 주세요.");
          }
        }

        // Successfully logged in/registered
        localStorage.setItem("readers_user_id", idVal);
        loginModal.style.display = "none";
        updateAuthState();
        
        window.dispatchEvent(new CustomEvent("readers-login", { detail: idVal }));
      } catch (err) {
        errorMsg.textContent = err.message || err.toString();
        errorMsg.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "확인";
      }
    });

    // openTopicModal implementation
    const openTopicModal = (username) => {
      topicUserDisplay.textContent = `등록자: ${username} 님`;
      contentInput.value = "";
      topicErrorMsg.style.display = "none";

      // Load books options dynamically from books sheet
      bookSelect.innerHTML = `<option value="">책 목록을 불러오는 중...</option>`;
      fetch(API_URL + "?action=getBooks")
        .then(res => res.json())
        .then(books => {
          bookSelect.innerHTML = "";
          if (books.length === 0) {
            bookSelect.innerHTML = `<option value="자유 선택 도서">자유 선택 도서</option>`;
          } else {
            books.forEach(b => {
              if (b.name) {
                const opt = document.createElement("option");
                opt.value = b.name;
                opt.textContent = b.name;
                bookSelect.appendChild(opt);
              }
            });
          }
        })
        .catch(err => {
          console.error("Failed to load books for select", err);
          bookSelect.innerHTML = `<option value="자유 선택 도서">자유 선택 도서</option>`;
        });

      topicModal.style.display = "flex";
    };

    // Listen to global open-topic-modal trigger event
    window.addEventListener("open-topic-modal", () => {
      const savedUser = localStorage.getItem("readers_user_id");
      if (!savedUser) {
        alert("질문을 등록하려면 먼저 로그인이 필요합니다.");
        // Auto open login modal
        errorMsg.style.display = "none";
        idInput.value = "";
        signupCheck.checked = false;
        codeField.style.display = "none";
        codeInput.value = "";
        loginModal.style.display = "flex";
      } else {
        openTopicModal(savedUser);
      }
    });

    // Submit Topic Registration
    topicSubmitBtn.addEventListener("click", async () => {
      const savedUser = localStorage.getItem("readers_user_id");
      if (!savedUser) {
        topicErrorMsg.textContent = "로그인 정보가 유실되었습니다. 다시 로그인해 주세요.";
        topicErrorMsg.style.display = "block";
        return;
      }

      const bookVal = bookSelect.value;
      const topicVal = contentInput.value.trim();
      topicErrorMsg.style.display = "none";

      if (!bookVal) {
        topicErrorMsg.textContent = "도서를 선택해 주세요.";
        topicErrorMsg.style.display = "block";
        return;
      }
      if (!topicVal) {
        topicErrorMsg.textContent = "질문 내용을 입력해 주세요.";
        topicErrorMsg.style.display = "block";
        return;
      }

      topicSubmitBtn.disabled = true;
      topicSubmitBtn.textContent = "등록 중...";

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            action: "addTopic",
            id: savedUser,
            book: bookVal,
            topic: topicVal
          })
        });
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error || "질문 등록에 실패했습니다.");
        }

        alert("Topic이 성공적으로 등록되었습니다!");
        topicModal.style.display = "none";
        
        // Notify other components (like ReadersTopics) to refresh list
        window.dispatchEvent(new CustomEvent("readers-topic-added"));
      } catch (err) {
        topicErrorMsg.textContent = err.message || err.toString();
        topicErrorMsg.style.display = "block";
      } finally {
        topicSubmitBtn.disabled = false;
        topicSubmitBtn.textContent = "등록 완료";
      }
    });

    updateAuthState();
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
      <div id="archive-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;align-items:start;">
        <div style="grid-column: span 4; text-align: center; color: oklch(0.5 0.02 60); font-size: 14px; padding: 40px 0;">도서 목록을 불러오는 중입니다...</div>
      </div>
      <div style="text-align:center;margin-top:48px;">
        <button id="more-archive-btn" style="display:none;background:none;border:none;color:#2A6B52;font-size:15px;font-weight:700;cursor:pointer;padding:12px 28px;transition:all 0.2s ease;font-family:'Fredoka',sans-serif;letter-spacing:0.05em;border:2px solid #2A6B52;border-radius:30px;">more →</button>
      </div>
    `;

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
          <div style="width:100%; height:0; padding-top:146.67%; border-radius:8px; overflow:hidden; margin-bottom:12px; box-shadow:0 8px 24px rgba(0,0,0,0.06); background:#fcfcfc; position:relative;">
            <img src="${book.url || ''}" alt="${book.name || ''}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%23efefef\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'12\\' fill=\\'%23999\\'>이미지 없음</text></svg>'">
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

    // 1. Load from Cache (localStorage) immediately for instant display
    const CACHE_KEY = "readers_archive_cache";
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        archiveData = JSON.parse(cachedData);
        renderArchive();
      } catch (e) {
        console.error("Failed to load archive cache", e);
      }
    }

    // 2. Fetch from sheet in the background and check if there are any updates
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

        // Only update DOM and cache if the data is actually different (new items added/edited)
        const hasUpdates = JSON.stringify(data) !== JSON.stringify(archiveData);
        if (hasUpdates) {
          archiveData = data;
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          renderArchive();
        }
      })
      .catch(err => {
        console.error("Background sync failed", err);
        // If there is no cache loaded, show the error message to the user
        if (archiveData.length === 0) {
          grid.innerHTML = `
            <div style="grid-column: span 4; text-align: center; color: #ff4d4f; font-size: 14px; padding: 40px 0; font-family:'Noto Sans KR',sans-serif;">
              목록을 불러오지 못했습니다.<br>
              <span style="font-size:12px; color:oklch(0.5 0.02 60); display:inline-block; margin-top:8px;">상세 오류: ${err.message || err.toString()}</span>
            </div>
          `;
        }
      });
  }
}
customElements.define('readers-archive', ReadersArchive);


class ReadersTopics extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          font-family: 'Noto Sans KR', sans-serif;
        }
        .topic-card {
          flex: 0 0 calc((100% - 48px) / 3);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          padding: 28px 24px;
          background: #FFFFFF;
          border: 1px solid #DCDCDC;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          min-height: 220px;
          justify-content: space-between;
        }
        @media (max-width: 900px) {
          .topic-card {
            flex: 0 0 calc((100% - 24px) / 2);
          }
        }
        @media (max-width: 600px) {
          .topic-card {
            flex: 0 0 100%;
          }
        }
      </style>
      <div style="display: flex; align-items: center; justify-content: center; position: relative; width: 100%; box-sizing: border-box;">
        <span style="font-family: Georgia, serif; font-size: 100px; color: #2A6B52; opacity: 0.15; line-height: 1; margin-right: 16px; user-select: none; align-self: flex-start; margin-top: -24px;">“</span>
        
        <div id="carousel-viewport" style="overflow: hidden; width: 100%; position: relative;">
          <div id="carousel-track" style="display: flex; gap: 24px; transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); padding: 12px 4px;">
            <div style="width: 100%; text-align: center; color: oklch(0.5 0.02 60); font-size: 14px; padding: 40px 0;">질문 목록을 불러오는 중입니다...</div>
          </div>
        </div>
        
        <span style="font-family: Georgia, serif; font-size: 100px; color: #2A6B52; opacity: 0.15; line-height: 1; margin-left: 16px; user-select: none; align-self: flex-end; margin-bottom: -44px;">”</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; width: 100%; box-sizing: border-box; padding: 0 4px;">
        <div></div>
        <div style="display: flex; gap: 12px;">
          <button id="prev-btn" style="background: white; border: 1px solid #DCDCDC; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #2A6B52; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.05); transition: all 0.2s ease;">&lt;</button>
          <button id="next-btn" style="background: white; border: 1px solid #DCDCDC; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #2A6B52; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.05); transition: all 0.2s ease;">&gt;</button>
        </div>
      </div>
    `;

    let topicsData = [];
    let currentIndex = 0;

    const track = shadow.getElementById("carousel-track");
    const prevBtn = shadow.getElementById("prev-btn");
    const nextBtn = shadow.getElementById("next-btn");

    const getVisibleCount = () => {
      const width = window.innerWidth;
      if (width <= 600) return 1;
      if (width <= 900) return 2;
      return 3;
    };

    const getMaxIndex = () => {
      return Math.max(0, topicsData.length - getVisibleCount());
    };

    const updateCarousel = () => {
      if (track.children.length === 0 || topicsData.length === 0) return;
      const cardWidth = track.children[0].getBoundingClientRect().width;
      const gap = 24;
      const offset = currentIndex * (cardWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;

      const maxIdx = getMaxIndex();
      prevBtn.style.opacity = currentIndex === 0 ? "0.3" : "1";
      prevBtn.style.cursor = currentIndex === 0 ? "default" : "pointer";
      nextBtn.style.opacity = currentIndex >= maxIdx ? "0.3" : "1";
      nextBtn.style.cursor = currentIndex >= maxIdx ? "default" : "pointer";
    };

    prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });

    nextBtn.addEventListener("click", () => {
      if (currentIndex < getMaxIndex()) {
        currentIndex++;
        updateCarousel();
      }
    });

    window.addEventListener("resize", () => {
      if (currentIndex > getMaxIndex()) {
        currentIndex = getMaxIndex();
      }
      updateCarousel();
    });

    const renderTopics = () => {
      track.innerHTML = "";
      if (topicsData.length === 0) {
        track.innerHTML = `<div style="width: 100%; text-align: center; color: oklch(0.5 0.02 60); font-size: 14px; padding: 40px 0;">등록된 질문이 없습니다. 첫 질문을 등록해 보세요!</div>`;
        return;
      }

      topicsData.forEach(item => {
        const card = document.createElement("div");
        card.className = "topic-card";
        card.innerHTML = `
          <div>
            <div style="background: #E8F0ED; color: #2A6B52; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 14px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family:'Noto Sans KR', sans-serif;">
              ${item.Book || '자유 선택 도서'}
            </div>
            <div style="font-size: 15px; font-weight: 500; line-height: 1.6; color: #333; font-family:'Noto Sans KR', sans-serif; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
              ${item.Topic || '질문 내용이 없습니다.'}
            </div>
          </div>
          <div style="font-size: 13px; color: oklch(0.5 0.02 60); font-weight: 600; text-align: right; margin-top: 14px; font-family:'Noto Sans KR', sans-serif;">
            — ${item.ID || '익명'}
          </div>
        `;
        track.appendChild(card);
      });

      currentIndex = 0;
      setTimeout(updateCarousel, 50);
    };

    const loadData = () => {
      fetch(API_URL + "?action=getTopics")
        .then(res => res.json())
        .then(data => {
          data.sort((a, b) => {
            const dateA = new Date(a.date || a.Data || 0);
            const dateB = new Date(b.date || b.Data || 0);
            return dateB - dateA;
          });

          const hasUpdates = JSON.stringify(data) !== JSON.stringify(topicsData);
          if (hasUpdates) {
            topicsData = data;
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            renderTopics();
          }
        })
        .catch(err => {
          console.error("Failed to load topics in background", err);
        });
    };

    const CACHE_KEY = "readers_topics_cache";
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        topicsData = JSON.parse(cached);
        renderTopics();
      } catch (e) {
        console.error("Failed to parse topics cache", e);
      }
    }

    loadData();

    // Listen to custom event when a new topic is added
    window.addEventListener("readers-topic-added", () => {
      loadData();
    });
  }
}
customElements.define('readers-topics', ReadersTopics);
