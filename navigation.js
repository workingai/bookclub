(() => {
const NAV_API_URL = "https://script.google.com/macros/s/AKfycbxqJukWhIxtRm-XmZLZUNdfQLu0vfL6QnAwG_K4uCubRVqrWC-9dOpNAMYuvxJEUy44Kg/exec";

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
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
               <label style="font-size:13px; color:#444; font-weight:600; margin:0;">어떤 책에 대한 토픽인가요?</label>
               <button id="topic-to-book-btn" style="background:#E8F0ED; color:#2A6B52; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.2s ease;">책추천</button>
             </div>
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

      <!-- Admin Modal Overlay -->
      <div id="admin-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
        <div style="background:white; padding:32px; border-radius:12px; width:440px; box-shadow:0 20px 40px rgba(0,0,0,0.2); box-sizing:border-box; font-family:'Noto Sans KR',sans-serif; position:relative; color: #333; max-height: 90vh; overflow-y: auto;">
          <button id="admin-modal-close-btn" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:22px; cursor:pointer; color:#999; line-height:1;">&times;</button>
          
          <h3 style="margin:0 0 24px; font-size:18px; font-weight:700; color:#2A6B52; border-bottom: 2px solid #E8F0ED; padding-bottom: 12px;">모임 일정 관리 (Admin)</h3>
          
          <!-- Date -->
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">날짜를 입력하세요</label>
            <input type="date" id="admin-date-input" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <!-- Start Time -->
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">시작 시간을 입력하세요</label>
            <div style="display:flex; gap:8px;">
              <select id="admin-start-ampm" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px; outline:none; background:white; font-family:inherit;">
                <option value="오후">오후</option>
                <option value="오전">오전</option>
              </select>
              <select id="admin-start-hour" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px; outline:none; background:white; font-family:inherit;">
                <option value="2">2시</option>
                <option value="1">1시</option>
                <option value="3">3시</option>
                <option value="4">4시</option>
                <option value="5">5시</option>
                <option value="6">6시</option>
                <option value="7">7시</option>
                <option value="8">8시</option>
                <option value="9">9시</option>
                <option value="10">10시</option>
                <option value="11">11시</option>
                <option value="12">12시</option>
              </select>
              <select id="admin-start-min" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px; outline:none; background:white; font-family:inherit;">
                <option value="00">00분</option>
                <option value="30">30분</option>
              </select>
            </div>
          </div>

          <!-- End Time -->
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">종료 시간을 입력하세요</label>
            <div style="display:flex; gap:8px;">
              <select id="admin-end-ampm" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px; outline:none; background:white; font-family:inherit;">
                <option value="오후">오후</option>
                <option value="오전">오전</option>
              </select>
              <select id="admin-end-hour" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px; outline:none; background:white; font-family:inherit;">
                <option value="5">5시</option>
                <option value="1">1시</option>
                <option value="2">2시</option>
                <option value="3">3시</option>
                <option value="4">4시</option>
                <option value="6">6시</option>
                <option value="7">7시</option>
                <option value="8">8시</option>
                <option value="9">9시</option>
                <option value="10">10시</option>
                <option value="11">11시</option>
                <option value="12">12시</option>
              </select>
              <select id="admin-end-min" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px; outline:none; background:white; font-family:inherit;">
                <option value="00">00분</option>
                <option value="30">30분</option>
              </select>
            </div>
          </div>
          
          <!-- Notice -->
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">공지할 사항이 있나요?</label>
            <input type="text" id="admin-notice-input" placeholder="공지할 내용을 입력해 주세요" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <!-- Place & Map URL -->
          <div style="margin-bottom:24px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">장소를 등록하세요</label>
            <input type="text" id="admin-place-input" placeholder="장소명 (예: 강남역 인근 커뮤니티룸)" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit; margin-bottom:8px;">
            <input type="url" id="admin-map-input" placeholder="지도의 URL 링크를 입력하세요" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <div id="admin-modal-error-msg" style="color:#d93025; font-size:12px; margin-bottom:16px; display:none; line-height:1.4;"></div>
          <button id="admin-modal-submit-btn" style="width:100%; background:#2A6B52; color:white; border:none; padding:12px; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer; transition:background 0.2s ease;">등록 완료</button>
        </div>
      </div>

      <!-- Book Recommendation Modal Overlay -->
      <div id="book-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
        <div style="background:white; padding:32px; border-radius:12px; width:420px; box-shadow:0 20px 40px rgba(0,0,0,0.2); box-sizing:border-box; font-family:'Noto Sans KR',sans-serif; position:relative; color: #333;">
          <button id="book-modal-close-btn" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:22px; cursor:pointer; color:#999; line-height:1;">&times;</button>
          
          <h3 style="margin:0 0 4px; font-size:18px; font-weight:700; color:#2A6B52;">책 추천하기</h3>
          <div id="book-user-display" style="font-size:13px; color:#666; margin-bottom:24px; font-weight:500;">추천자: 님</div>
          
          <div style="margin-bottom:20px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">추천하실 책은 무엇인가요?</label>
            <input type="text" id="book-name-input" placeholder="책 제목을 입력해 주세요" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <div style="margin-bottom:24px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">책 이미지 링크를 알면 입력해주세요 (yes24 기준)</label>
            <input type="url" id="book-url-input" placeholder="http:// 또는 https://로 시작하는 이미지 주소" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <div id="book-modal-error-msg" style="color:#d93025; font-size:12px; margin-bottom:16px; display:none; line-height:1.4;"></div>
          
          <button id="book-modal-submit-btn" style="width:100%; background:#2A6B52; color:white; border:none; padding:12px; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer; transition:background 0.2s ease;">추천 완료</button>
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
          const res = await fetch(NAV_API_URL, {
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
          const res = await fetch(`${NAV_API_URL}?action=checkMember&id=${encodeURIComponent(idVal)}`);
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

    // Prefetch book list on page load
    let cachedBooks = [];
    const prefetchBooks = () => {
      fetch(NAV_API_URL + "?action=getBooks")
        .then(res => res.json())
        .then(books => {
          cachedBooks = books;
        })
        .catch(err => {
          console.error("Failed to prefetch books list", err);
        });
    };
    prefetchBooks();

    // Re-prefetch when a book is added
    window.addEventListener("readers-book-added", () => {
      prefetchBooks();
    });

    // Handle "책추천" transition button
    const topicToBookBtn = shadow.getElementById("topic-to-book-btn");
    topicToBookBtn.addEventListener("click", (e) => {
      e.preventDefault();
      topicModal.style.display = "none";
      window.dispatchEvent(new CustomEvent("open-book-modal"));
    });

    // openTopicModal implementation
    const openTopicModal = (username) => {
      topicUserDisplay.textContent = `등록자: ${username} 님`;
      contentInput.value = "";
      topicErrorMsg.style.display = "none";

      // Set default placeholder option
      bookSelect.innerHTML = `<option value="" disabled selected>책을 선택해 주세요</option>`;
      
      if (cachedBooks && cachedBooks.length > 0) {
        cachedBooks.forEach(b => {
          if (b.name) {
            const opt = document.createElement("option");
            opt.value = b.name;
            opt.textContent = b.name;
            bookSelect.appendChild(opt);
          }
        });
      } else {
        // Fetch on-demand if cache is empty
        fetch(NAV_API_URL + "?action=getBooks")
          .then(res => res.json())
          .then(books => {
            cachedBooks = books;
            bookSelect.innerHTML = `<option value="" disabled selected>책을 선택해 주세요</option>`;
            if (books.length === 0) {
              const opt = document.createElement("option");
              opt.value = "자유 선택 도서";
              opt.textContent = "자유 선택 도서";
              bookSelect.appendChild(opt);
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
            console.error("Failed to load books for select on-demand", err);
            const opt = document.createElement("option");
            opt.value = "자유 선택 도서";
            opt.textContent = "자유 선택 도서";
            bookSelect.appendChild(opt);
          });
      }

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
        const res = await fetch(NAV_API_URL, {
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

        const optimisticTopic = {
          ID: savedUser,
          Date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
          Book: bookVal,
          Topic: topicVal
        };

        topicModal.style.display = "none";
        alert("Topic이 성공적으로 등록되었습니다!");
        
        // Notify other components (like ReadersTopics) to refresh list
        window.dispatchEvent(new CustomEvent("readers-topic-added", { detail: optimisticTopic }));
      } catch (err) {
        topicErrorMsg.textContent = err.message || err.toString();
        topicErrorMsg.style.display = "block";
      } finally {
        topicSubmitBtn.disabled = false;
        topicSubmitBtn.textContent = "등록 완료";
      }
    });

    // Admin Modal elements
    const adminModal = shadow.getElementById("admin-modal");
    const adminCloseBtn = shadow.getElementById("admin-modal-close-btn");
    const adminSubmitBtn = shadow.getElementById("admin-modal-submit-btn");
    const adminDateInput = shadow.getElementById("admin-date-input");
    const adminStartAmPm = shadow.getElementById("admin-start-ampm");
    const adminStartHour = shadow.getElementById("admin-start-hour");
    const adminStartMin = shadow.getElementById("admin-start-min");
    const adminEndAmPm = shadow.getElementById("admin-end-ampm");
    const adminEndHour = shadow.getElementById("admin-end-hour");
    const adminEndMin = shadow.getElementById("admin-end-min");
    const adminNoticeInput = shadow.getElementById("admin-notice-input");
    const adminPlaceInput = shadow.getElementById("admin-place-input");
    const adminMapInput = shadow.getElementById("admin-map-input");
    const adminErrorMsg = shadow.getElementById("admin-modal-error-msg");

    // Close admin modal
    adminCloseBtn.addEventListener("click", () => {
      adminModal.style.display = "none";
    });

    // Listen to admin event trigger
    window.addEventListener("open-admin-modal", () => {
      const savedUser = localStorage.getItem("readers_user_id");
      if (savedUser !== "정훈") {
        alert("관리자만 접근할 수 있습니다.");
        return;
      }
      
      // Reset fields
      adminDateInput.value = "";
      adminNoticeInput.value = "";
      adminPlaceInput.value = "";
      adminMapInput.value = "";
      adminErrorMsg.style.display = "none";
      
      adminModal.style.display = "flex";
    });

    // Admin Submit
    adminSubmitBtn.addEventListener("click", async () => {
      const dateVal = adminDateInput.value;
      const startAmPmVal = adminStartAmPm.value;
      const startHourVal = adminStartHour.value;
      const startMinVal = adminStartMin.value;
      const endAmPmVal = adminEndAmPm.value;
      const endHourVal = adminEndHour.value;
      const endMinVal = adminEndMin.value;
      const noticeVal = adminNoticeInput.value.trim();
      const placeVal = adminPlaceInput.value.trim();
      const mapVal = adminMapInput.value.trim();
      
      adminErrorMsg.style.display = "none";

      if (!dateVal) {
        adminErrorMsg.textContent = "날짜를 입력하세요.";
        adminErrorMsg.style.display = "block";
        return;
      }
      if (!placeVal) {
        adminErrorMsg.textContent = "장소명을 입력하세요.";
        adminErrorMsg.style.display = "block";
        return;
      }

      const startVal = `${startAmPmVal} ${startHourVal}시 ${startMinVal}분`;
      const endVal = `${endAmPmVal} ${endHourVal}시 ${endMinVal}분`;

      adminSubmitBtn.disabled = true;
      adminSubmitBtn.textContent = "등록 중...";

      try {
        const res = await fetch(NAV_API_URL, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            action: "addMeeting",
            date: dateVal,
            start: startVal,
            end: endVal,
            notice: noticeVal,
            place: placeVal,
            map: mapVal
          })
        });
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error || "등록에 실패했습니다.");
        }

        alert("다음 모임 일정이 성공적으로 등록되었습니다!");
        adminModal.style.display = "none";
        
        // Notify page to refresh notices if applicable
        window.dispatchEvent(new CustomEvent("readers-meeting-added"));
      } catch (err) {
        adminErrorMsg.textContent = err.message || err.toString();
        adminErrorMsg.style.display = "block";
      } finally {
        adminSubmitBtn.disabled = false;
        adminSubmitBtn.textContent = "등록 완료";
      }
    });

    // Book Recommendation Modal elements
    const bookModal = shadow.getElementById("book-modal");
    const bookCloseBtn = shadow.getElementById("book-modal-close-btn");
    const bookSubmitBtn = shadow.getElementById("book-modal-submit-btn");
    const bookNameInput = shadow.getElementById("book-name-input");
    const bookUrlInput = shadow.getElementById("book-url-input");
    const bookUserDisplay = shadow.getElementById("book-user-display");
    const bookErrorMsg = shadow.getElementById("book-modal-error-msg");

    bookCloseBtn.addEventListener("click", () => {
      bookModal.style.display = "none";
    });

    const openBookModal = (username) => {
      bookUserDisplay.textContent = `추천자: ${username} 님`;
      bookNameInput.value = "";
      bookUrlInput.value = "";
      bookErrorMsg.style.display = "none";
      bookModal.style.display = "flex";
    };

    window.addEventListener("open-book-modal", () => {
      const savedUser = localStorage.getItem("readers_user_id");
      if (!savedUser) {
        alert("책을 추천하려면 먼저 로그인해 주세요.");
        const loginModal = shadow.getElementById("login-modal");
        if (loginModal) loginModal.style.display = "flex";
        return;
      }
      openBookModal(savedUser);
    });

    bookSubmitBtn.addEventListener("click", async () => {
      const nameVal = bookNameInput.value.trim();
      const urlVal = bookUrlInput.value.trim();
      const savedUser = localStorage.getItem("readers_user_id");

      bookErrorMsg.style.display = "none";

      if (!nameVal) {
        bookErrorMsg.textContent = "추천할 책 제목을 입력해 주세요.";
        bookErrorMsg.style.display = "block";
        return;
      }

      bookSubmitBtn.disabled = true;
      bookSubmitBtn.textContent = "등록 중...";

      try {
        const res = await fetch(NAV_API_URL, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            action: "addBook",
            id: savedUser,
            name: nameVal,
            url: urlVal
          })
        });
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error || "등록에 실패했습니다.");
        }

        alert("책 추천이 성공적으로 등록되었습니다!");
        bookModal.style.display = "none";
        
        // Notify pages to reload books list
        window.dispatchEvent(new CustomEvent("readers-book-added"));
      } catch (err) {
        bookErrorMsg.textContent = err.message || err.toString();
        bookErrorMsg.style.display = "block";
      } finally {
        bookSubmitBtn.disabled = false;
        bookSubmitBtn.textContent = "추천 완료";
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
    fetchWithTimeout(NAV_API_URL + "?action=getArchive")
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
        .topic-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .topic-item {
          background: #FCFCFC;
          border: 1px solid #ECECEC;
          border-radius: 12px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 24px;
          box-sizing: border-box;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .topic-item:hover {
          background: #F7FAF9;
          border-color: #2A6B52;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(42, 107, 82, 0.06);
        }
        .book-badge {
          background: #E8F0ED;
          color: #2A6B52;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          min-width: 100px;
          max-width: 160px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .topic-text {
          font-size: 15px;
          color: #333;
          line-height: 1.6;
          flex: 1;
          font-weight: 500;
        }
        .user-id {
          font-size: 13px;
          color: oklch(0.5 0.02 60);
          white-space: nowrap;
          font-weight: 600;
          margin-left: 12px;
        }
        @media (max-width: 680px) {
          .topic-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .book-badge {
            align-self: flex-start;
            min-width: unset;
            max-width: 100%;
          }
          .user-id {
            align-self: flex-end;
            margin-left: 0;
          }
        }
      </style>
      <div id="topics-container" class="topic-list">
        <div style="text-align: center; color: oklch(0.5 0.02 60); font-size: 14px; padding: 40px 0;">질문 목록을 불러오는 중입니다...</div>
      </div>
    `;

    let topicsData = [];
    let rollInterval = null;
    const container = shadow.getElementById("topics-container");

    const startRolling = () => {
      if (rollInterval) clearInterval(rollInterval);
      if (topicsData.length <= 5) {
        container.style.maxHeight = "";
        container.style.overflow = "";
        return;
      }

      rollInterval = setInterval(() => {
        const firstChild = container.querySelector(".topic-item");
        if (!firstChild) return;

        // Slide up smoothly
        firstChild.style.transition = "margin-top 0.8s ease, opacity 0.8s ease";
        firstChild.style.marginTop = `-${firstChild.offsetHeight + 16}px`; // 16px is gap
        firstChild.style.opacity = "0";

        setTimeout(() => {
          // Reset styles
          firstChild.style.transition = "";
          firstChild.style.marginTop = "";
          firstChild.style.opacity = "";
          // Move to the end of the list
          container.appendChild(firstChild);
        }, 800);
      }, 3500); // Shift every 3.5 seconds
    };

    // Pause on hover, resume on mouse leave
    container.addEventListener("mouseenter", () => {
      if (rollInterval) clearInterval(rollInterval);
    });
    container.addEventListener("mouseleave", () => {
      startRolling();
    });

    const renderTopics = () => {
      if (rollInterval) clearInterval(rollInterval);
      container.innerHTML = "";
      if (topicsData.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: oklch(0.5 0.02 60); font-size: 14px; padding: 40px 0;">등록된 질문이 없습니다. 첫 질문을 등록해 보세요!</div>`;
        return;
      }

      topicsData.forEach(item => {
        const row = document.createElement("div");
        row.className = "topic-item";
        row.innerHTML = `
          <div class="book-badge" title="${item.Book || '자유 선택'}">
            ${item.Book || '자유 선택'}
          </div>
          <div class="topic-text">
            ${item.Topic || '질문 내용이 없습니다.'}
          </div>
          <div class="user-id">
            — ${item.ID || '익명'}
          </div>
        `;
        container.appendChild(row);
      });

      // Show exactly 5 items, hide and roll the rest
      if (topicsData.length > 5) {
        setTimeout(() => {
          const items = container.querySelectorAll(".topic-item");
          if (items.length > 5) {
            let totalHeight = 0;
            for (let i = 0; i < 5; i++) {
              totalHeight += items[i].offsetHeight + 16; // height + gap
            }
            container.style.maxHeight = `${totalHeight - 16}px`;
            container.style.overflow = "hidden";
            startRolling();
          }
        }, 150);
      } else {
        container.style.maxHeight = "";
        container.style.overflow = "";
      }
    };

    const loadData = () => {
      fetch(NAV_API_URL + "?action=getTopics")
        .then(res => res.json())
        .then(data => {
          data.sort((a, b) => {
            const valA = String(a.Date || a.date || '').replace(/[^0-9]/g, '');
            const valB = String(b.Date || b.date || '').replace(/[^0-9]/g, '');
            return Number(valB) - Number(valA);
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
    window.addEventListener("readers-topic-added", (e) => {
      if (e.detail) {
        // Optimistic UI Update: Prepend newly added topic immediately
        topicsData = [e.detail, ...topicsData.filter(item => !(item.Topic === e.detail.Topic && item.ID === e.detail.ID))];
        localStorage.setItem(CACHE_KEY, JSON.stringify(topicsData));
        renderTopics();
      }
      loadData();
    });
  }
}
customElements.define('readers-topics', ReadersTopics);

// ============================================================
// Meeting Info Loader — no cache, always fetch from API
// ============================================================
function renderMeeting(latest) {
  if (!latest) return;

  let displayDate = latest.date || '';
  if (latest.date) {
    const dObj = new Date(latest.date);
    if (dObj && !isNaN(dObj.getTime())) {
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      displayDate = `${dObj.getMonth() + 1}월 ${dObj.getDate()}일 (${weekdays[dObj.getDay()]})`;
    }
  }

  const parseTimeStr = (t) => {
    if (!t) return '';
    if (String(t).includes('T')) {
      const d = new Date(t);
      if (d && !isNaN(d.getTime())) {
        let hour = d.getHours();
        const min = d.getMinutes();
        const ampm = hour >= 12 ? '오후' : '오전';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        const minStr = min > 0 ? ` ${min}분` : '';
        return `${ampm} ${hour}시${minStr}`;
      }
    }
    return String(t);
  };

  const formatTimeRange = (start, end) => {
    const sParsed = parseTimeStr(start);
    if (!sParsed) return '';
    const cleanTime = (t) => t.replace(' 00분', '').trim();
    const sClean = cleanTime(sParsed);
    const eParsed = parseTimeStr(end);
    if (!eParsed) return sClean;
    const eClean = cleanTime(eParsed);
    const sParts = sClean.split(' ');
    const eParts = eClean.split(' ');
    if (sParts.length === 2 && eParts.length === 2 && sParts[0] === eParts[0]) {
      return `${sParts[0]} ${sParts[1]}~${eParts[1]}`;
    }
    return `${sClean}~${eClean}`;
  };
  const displayTime = formatTimeRange(latest.start || latest.time, latest.end);

  const heroTime = document.getElementById("hero-meeting-time");
  const heroPlace = document.getElementById("hero-meeting-place");
  if (heroTime) heroTime.textContent = `${displayDate} ${displayTime}`;
  if (heroPlace) heroPlace.textContent = latest.place || '';

  const noticeDate = document.getElementById("notice-date");
  const noticeTime = document.getElementById("notice-time");
  const noticePlace = document.getElementById("notice-place");
  const noticeMapIcon = document.getElementById("notice-map-icon");
  const noticeMemo = document.getElementById("notice-memo");

  if (noticeDate) noticeDate.textContent = displayDate;
  if (noticeTime) noticeTime.textContent = displayTime;
  if (noticePlace) noticePlace.textContent = latest.place || '';
  
  if (noticeMapIcon && latest.map) {
    noticeMapIcon.innerHTML = `
      <a href="${latest.map}" target="_blank" title="지도 보기" style="display:inline-flex; align-items:center; color:#2A6B52; transition:color 0.2s ease;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; cursor:pointer;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </a>
    `;
  } else if (noticeMapIcon) {
    noticeMapIcon.innerHTML = '';
  }

  if (noticeMemo) {
    noticeMemo.innerHTML = latest.notice ? `📌 ${latest.notice}` : '📌 특별한 공지사항이 없습니다.';
  }
}

function loadLatestMeeting() {
  fetch(NAV_API_URL + "?action=getMeetings")
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.length > 0) {
        var latest = data[data.length - 1];
        renderMeeting(latest);
      }
    })
    .catch(function(err) {
      console.error("Failed to load meeting info:", err);
    });
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadLatestMeeting);
} else {
  loadLatestMeeting();
}

// Reload when admin registers a new meeting
window.addEventListener("readers-meeting-added", loadLatestMeeting);

})();

