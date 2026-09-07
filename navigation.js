(() => {
const NAV_API_URL = "https://script.google.com/macros/s/AKfycbxAOsg5g3sr2w4HrbpSMXc51hbC96h0cYnzoZoEq3v4-4lOjrWi2DnMuMY_CSG82XfNJA/exec";

async function topicRequestJSON(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return await response.json();
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("응답 대기 시간이 초과되었습니다."));
          controller.abort();
        }, timeout);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function registerTopic(payload) {
  const matches = item => String(item.ID ?? "") === payload.id &&
    String(item.Book ?? "") === payload.book &&
    String(item.Subject ?? "") === payload.subject &&
    String(item.Topic ?? "") === payload.topic;
  const readTopics = async () => {
    const rows = await topicRequestJSON(NAV_API_URL + "?action=getTopics&_=" + Date.now());
    if (!Array.isArray(rows)) throw new Error(rows?.error || "토픽 조회 응답 오류");
    return rows;
  };
  // A baseline prevents an older identical post from confirming a failed write.
  let previousCount = null;
  try { previousCount = (await readTopics()).filter(matches).length; } catch (err) {
    console.warn("Topic preflight read:", err);
  }
  let result;
  try {
    result = await topicRequestJSON(NAV_API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "addTopic", ...payload })
    });
  } catch (err) {
    try {
      const matching = (await readTopics()).filter(matches);
      if (previousCount !== null && matching.length > previousCount) {
        return matching[matching.length - 1];
      }
    } catch (readError) { console.warn("Topic verification:", readError); }
    throw new Error("저장 결과를 확인하지 못했습니다. 중복 등록을 피하려면 목록을 새로고침해 확인한 후 다시 시도해 주세요.");
  }
  if (!result.success) throw new Error(result.error || "Topic 등록에 실패했습니다.");
  return {
    ID: payload.id, Book: payload.book, Subject: payload.subject, Topic: payload.topic,
    Date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date())
  };
}

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
          
          <div class="nav-links">
            <a href="${prefix}#notice" style="color:#2A6B52;text-decoration:none;">공지</a>
            <a href="${prefix}#book" style="color:#2A6B52;text-decoration:none;">이번달 책</a>
            <a href="${prefix}#discussion" style="color:#2A6B52;text-decoration:none;">Topic 등록</a>
            <a href="${prefix}#archive" style="color:#2A6B52;text-decoration:none;">지난 모임</a>
            
            <!-- Login State Container -->
            <div id="auth-container" style="display:flex;align-items:center;gap:12px;">
              <!-- Will be populated dynamically -->
            </div>
          </div>

          <button id="hamburger-btn" class="hamburger-btn">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        
        <div id="mobile-menu" class="mobile-menu">
          <a href="${prefix}#notice">공지</a>
          <a href="${prefix}#book">이번달 책</a>
          <a href="${prefix}#discussion">Topic 등록</a>
          <a href="${prefix}#archive">지난 모임</a>
          <div id="auth-container-mobile" style="display:flex;align-items:center;gap:12px;margin-top:8px;">
            <!-- Will be populated dynamically -->
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
      <div id="topic-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:20px; box-sizing:border-box;">
        <div style="background:white; padding:36px 36px 32px; border-radius:14px; width:620px; max-width:100%; max-height:92vh; overflow-y:auto; box-shadow:0 24px 48px rgba(0,0,0,0.25); box-sizing:border-box; font-family:'Noto Sans KR',sans-serif; position:relative; color: #333;">
          <button id="topic-modal-close-btn" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; color:#999; line-height:1;">&times;</button>
          
          <h3 style="margin:0 0 6px; font-size:20px; font-weight:700; color:#2A6B52;">Topic 등록하기</h3>
          <div id="topic-user-display" style="font-size:13.5px; color:#666; margin-bottom:22px; font-weight:500;">등록자: 님</div>
          
          <div style="margin-bottom:18px;">
            <label style="display:block; font-size:13.5px; color:#374151; margin-bottom:7px; font-weight:600;">어떤 작품, 이슈에 대한 토픽인가요?</label>
            <input type="text" id="topic-book-input" placeholder="작품명 또는 이슈를 입력해 주세요 (예: 히가시노 게이고 소설, 독서 모임 주제 등)" style="width:100%; padding:11px 14px; border:1px solid #D1D5DB; border-radius:8px; box-sizing:border-box; font-size:14.5px; outline:none; font-family:inherit;">
          </div>

          <div style="margin-bottom:18px;">
            <label style="display:block; font-size:13.5px; color:#374151; margin-bottom:7px; font-weight:600;">제목</label>
            <input type="text" id="topic-subject-input" placeholder="토픽의 핵심 제목을 입력해 주세요" style="width:100%; padding:11px 14px; border:1px solid #D1D5DB; border-radius:8px; box-sizing:border-box; font-size:14.5px; outline:none; font-family:inherit;">
          </div>
          
          <div style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:7px;">
              <label style="display:block; font-size:13.5px; color:#374151; font-weight:600;">함께 이야기하고 싶은 Topic을 입력해 주세요.</label>
              <span style="font-size:12px; color:#6B7280;">(300~400자 권장)</span>
            </div>
            <textarea id="topic-content-input" placeholder="함께 이야기 나누고 싶은 질문이나 토픽 내용을 자세히 입력해 주세요." style="width:100%; height:220px; min-height:180px; padding:14px 16px; border:1px solid #D1D5DB; border-radius:8px; box-sizing:border-box; font-size:14.5px; outline:none; font-family:inherit; resize: vertical; line-height:1.65;"></textarea>
          </div>
          
          <div id="topic-modal-error-msg" style="color:#d93025; font-size:12.5px; margin-bottom:16px; display:none; line-height:1.4;"></div>
          
          <button id="topic-modal-submit-btn" style="width:100%; background:#2A6B52; color:white; border:none; padding:14px; border-radius:8px; font-weight:700; font-size:15px; cursor:pointer; transition:background 0.2s ease;">등록하기</button>
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
          
          <!-- Subject -->
          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">모임 주제를 입력하세요 (예: 히가시노 게이고 특집)</label>
            <input type="text" id="admin-subject-input" placeholder="모임 주제를 입력해 주세요" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
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
          
          <h3 style="margin:0 0 4px; font-size:18px; font-weight:700; color:#2A6B52;">작품/주제 등록하기</h3>
          <div id="book-user-display" style="font-size:13px; color:#666; margin-bottom:24px; font-weight:500;">등록자: 님</div>
          
          <div style="margin-bottom:20px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">추천하실 작품이나 주제는 무엇인가요?</label>
            <input type="text" id="book-name-input" placeholder="작품명 또는 주제를 입력해 주세요" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <div style="margin-bottom:24px;">
            <label style="display:block; font-size:13px; color:#444; margin-bottom:8px; font-weight:600;">작품 이미지 링크를 알면 입력해주세요 (yes24 등 기준)</label>
            <input type="url" id="book-url-input" placeholder="http:// 또는 https://로 시작하는 이미지 주소" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px; outline:none; font-family:inherit;">
          </div>
          
          <div id="book-modal-error-msg" style="color:#d93025; font-size:12px; margin-bottom:16px; display:none; line-height:1.4;"></div>
          
          <button id="book-modal-submit-btn" style="width:100%; background:#2A6B52; color:white; border:none; padding:12px; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer; transition:background 0.2s ease;">등록하기</button>
        </div>
      </div>
    `;

    // Add styles to Shadow Root
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
        width: 100%;
      }
      a {
        transition: color 0.2s ease;
      }
      a:hover {
        color: #1E4D3B !important;
      }
      .nav-links {
        display: flex;
        align-items: center;
        gap: 32px;
        font-size: 14px;
        font-weight: 500;
        color: oklch(0.4 0.02 60);
      }
      .hamburger-btn {
        display: none;
        flex-direction: column;
        justify-content: space-between;
        width: 24px;
        height: 18px;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        z-index: 1001;
      }
      .hamburger-btn span {
        display: block;
        width: 100%;
        height: 2px;
        background-color: #2A6B52;
        border-radius: 2px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .mobile-menu {
        display: none;
        width: 100%;
        background: oklch(0.98 0.008 80 / 0.95);
        backdrop-filter: blur(12px);
        border-top: 1px solid oklch(0.9 0.01 60);
        border-bottom: 1px solid oklch(0.9 0.01 60);
        box-sizing: border-box;
        padding: 20px 24px;
        flex-direction: column;
        gap: 16px;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-in-out, opacity 0.2s ease-in-out, padding 0.3s ease-in-out;
        opacity: 0;
      }
      .mobile-menu.active {
        display: flex;
        max-height: 300px;
        opacity: 1;
      }
      .mobile-menu a {
        color: #2A6B52;
        text-decoration: none;
        font-size: 15px;
        font-weight: 600;
      }
      .hamburger-btn.active span:nth-child(1) {
        transform: translateY(8px) rotate(45deg);
      }
      .hamburger-btn.active span:nth-child(2) {
        opacity: 0;
      }
      .hamburger-btn.active span:nth-child(3) {
        transform: translateY(-8px) rotate(-45deg);
      }
      @media (max-width: 767px) {
        .nav-links {
          display: none;
        }
        .hamburger-btn {
          display: flex;
        }
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
    const bookInput = shadow.getElementById("topic-book-input");
    const subjectInput = shadow.getElementById("topic-subject-input");
    const contentInput = shadow.getElementById("topic-content-input");
    const topicErrorMsg = shadow.getElementById("topic-modal-error-msg");

    const authContainerMobile = shadow.getElementById("auth-container-mobile");

    // Check login state
    const updateAuthState = () => {
      const savedUser = localStorage.getItem("readers_user_id");
      const makeAuthHTML = (isMobile) => {
        if (savedUser) {
          return `
            <span style="color:#2A6B52; font-weight:600; font-size:${isMobile ? '14px' : '13px'};">${savedUser} 님</span>
            <button class="logout-btn" style="background:none; border:1px solid #2A6B52; color:#2A6B52; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px; font-family:'Noto Sans KR',sans-serif; transition:all 0.2s ease; line-height:1.2;">로그아웃</button>
          `;
        } else {
          return `
            <button class="login-btn" style="background:#2A6B52; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px; font-family:'Noto Sans KR',sans-serif; transition:background 0.2s ease;">로그인</button>
          `;
        }
      };

      if (authContainer) authContainer.innerHTML = makeAuthHTML(false);
      if (authContainerMobile) authContainerMobile.innerHTML = makeAuthHTML(true);

      // Attach logout listener
      shadow.querySelectorAll(".logout-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          localStorage.removeItem("readers_user_id");
          updateAuthState();
          window.dispatchEvent(new CustomEvent("readers-logout"));
          hamburgerBtn.classList.remove("active");
          mobileMenu.classList.remove("active");
        });
      });

      // Attach login listener
      shadow.querySelectorAll(".login-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          errorMsg.style.display = "none";
          idInput.value = "";
          signupCheck.checked = false;
          codeField.style.display = "none";
          codeInput.value = "";
          loginModal.style.display = "flex";
          hamburgerBtn.classList.remove("active");
          mobileMenu.classList.remove("active");
        });
      });
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

    // Handle "책추천" transition button if exists
    const topicToBookBtn = shadow.getElementById("topic-to-book-btn");
    if (topicToBookBtn) {
      topicToBookBtn.addEventListener("click", (e) => {
        e.preventDefault();
        topicModal.style.display = "none";
        window.dispatchEvent(new CustomEvent("open-book-modal"));
      });
    }

    let editingTopicData = null;

    // openTopicModal implementation (supports both new creation and edit modes)
    const openTopicModal = (username, editItem = null) => {
      editingTopicData = editItem;
      const modalTitle = shadow.querySelector("#topic-modal h3");
      if (editItem) {
        if (modalTitle) modalTitle.textContent = "Topic 수정하기";
        topicSubmitBtn.textContent = "수정하기";
        topicUserDisplay.textContent = `등록자: ${editItem.ID || editItem.id || editItem.Writer || editItem.writer || username} 님`;
        bookInput.value = editItem.Book || editItem.book || "";
        subjectInput.value = editItem.Subject || editItem.subject || editItem.Title || editItem.title || "";
        contentInput.value = editItem.Topic || editItem.topic || editItem.Content || editItem.content || "";
      } else {
        if (modalTitle) modalTitle.textContent = "Topic 등록하기";
        topicSubmitBtn.textContent = "등록하기";
        topicUserDisplay.textContent = `등록자: ${username} 님`;
        bookInput.value = "";
        subjectInput.value = "";
        contentInput.value = "";
      }
      topicErrorMsg.style.display = "none";
      topicModal.style.display = "flex";
    };

    // Listen to global open-topic-modal trigger event
    window.addEventListener("open-topic-modal", () => {
      const savedUser = localStorage.getItem("readers_user_id");
      if (!savedUser) {
        alert("Topic을 등록하려면 먼저 로그인이 필요합니다.");
        // Auto open login modal
        errorMsg.style.display = "none";
        idInput.value = "";
        signupCheck.checked = false;
        codeField.style.display = "none";
        codeInput.value = "";
        loginModal.style.display = "flex";
      } else {
        openTopicModal(savedUser, null);
      }
    });

    // Listen to global open-edit-topic-modal trigger event
    window.addEventListener("open-edit-topic-modal", (e) => {
      const savedUser = localStorage.getItem("readers_user_id");
      const editItem = e.detail;
      if (!savedUser) {
        alert("Topic을 수정하려면 먼저 로그인이 필요합니다.");
        return;
      }
      openTopicModal(savedUser, editItem);
    });

    // Submit Topic Registration or Edit
    topicSubmitBtn.addEventListener("click", async () => {
      const savedUser = localStorage.getItem("readers_user_id");
      if (!savedUser) {
        topicErrorMsg.textContent = "로그인 정보가 유실되었습니다. 다시 로그인해 주세요.";
        topicErrorMsg.style.display = "block";
        return;
      }

      const bookVal = bookInput.value.trim();
      const subjectVal = subjectInput.value.trim();
      const topicVal = contentInput.value.trim();
      topicErrorMsg.style.display = "none";

      if (!bookVal) {
        topicErrorMsg.textContent = "작품명 또는 이슈를 입력해 주세요.";
        topicErrorMsg.style.display = "block";
        return;
      }
      if (!subjectVal) {
        topicErrorMsg.textContent = "제목을 입력해 주세요.";
        topicErrorMsg.style.display = "block";
        return;
      }
      if (!topicVal) {
        topicErrorMsg.textContent = "Topic 내용을 입력해 주세요.";
        topicErrorMsg.style.display = "block";
        return;
      }

      const isEditMode = Boolean(editingTopicData);
      topicSubmitBtn.disabled = true;
      topicSubmitBtn.textContent = isEditMode ? "수정 중..." : "등록 중...";

      try {
        if (isEditMode) {
          const updatedTopic = {
            ...editingTopicData,
            Book: bookVal,
            Subject: subjectVal,
            Topic: topicVal,
            ID: editingTopicData.ID || editingTopicData.id || editingTopicData.Writer || editingTopicData.writer || savedUser,
            Date: editingTopicData.Date || editingTopicData.date || new Date().toISOString().slice(0, 10).replace(/-/g, "")
          };

          const res = await fetch(NAV_API_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "updateTopic",
              id: savedUser,
              author: updatedTopic.ID,
              oldBook: editingTopicData.Book ?? editingTopicData.book ?? "",
              oldSubject: editingTopicData.Subject ?? editingTopicData.subject ?? "",
              oldTopic: editingTopicData.Topic ?? editingTopicData.topic ?? "",
              book: bookVal,
              subject: subjectVal,
              topic: topicVal,
              date: editingTopicData.Date ?? editingTopicData.date ?? ""
            })
          });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const result = await res.json();
          if (!result.success) throw new Error(result.error || "Topic 수정에 실패했습니다.");

          topicModal.style.display = "none";
          window.dispatchEvent(new CustomEvent("readers-topic-updated", {
            detail: {
              oldTopic: editingTopicData,
              updatedTopic: updatedTopic
            }
          }));
          editingTopicData = null;
          alert("Topic이 성공적으로 수정되었습니다!");
        } else {
          const registeredTopic = await registerTopic({
            id: savedUser, book: bookVal, subject: subjectVal, topic: topicVal
          });
          topicModal.style.display = "none";
          window.dispatchEvent(new CustomEvent("readers-topic-added", { detail: registeredTopic }));
        }
      } catch (err) {
        topicErrorMsg.textContent = err.message || err.toString();
        topicErrorMsg.style.display = "block";
      } finally {
        topicSubmitBtn.disabled = false;
        topicSubmitBtn.textContent = isEditMode ? "수정하기" : "등록하기";
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
    const adminSubjectInput = shadow.getElementById("admin-subject-input");
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
      adminSubjectInput.value = "";
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
      const subjectVal = adminSubjectInput.value.trim();
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
            subject: subjectVal,
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
      bookUserDisplay.textContent = `등록자: ${username} 님`;
      bookNameInput.value = "";
      bookUrlInput.value = "";
      bookErrorMsg.style.display = "none";
      bookModal.style.display = "flex";
    };

    window.addEventListener("open-book-modal", () => {
      const savedUser = localStorage.getItem("readers_user_id");
      if (!savedUser) {
        alert("작품/주제를 등록하려면 먼저 로그인해 주세요.");
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
        bookErrorMsg.textContent = "추천할 작품명 또는 주제를 입력해 주세요.";
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
            name: nameVal,
            url: urlVal,
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            recommender: savedUser
          })
        });
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error || "등록에 실패했습니다.");
        }

        alert("성공적으로 등록되었습니다!");
        bookModal.style.display = "none";
        location.reload();
        
        // Notify pages to reload books list
        window.dispatchEvent(new CustomEvent("readers-book-added"));
      } catch (err) {
        bookErrorMsg.textContent = err.message || err.toString();
        bookErrorMsg.style.display = "block";
      } finally {
        bookSubmitBtn.disabled = false;
        bookSubmitBtn.textContent = "등록하기";
      }
    });

    const hamburgerBtn = shadow.getElementById("hamburger-btn");
    const mobileMenu = shadow.getElementById("mobile-menu");
    
    if (hamburgerBtn && mobileMenu) {
      hamburgerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        hamburgerBtn.classList.toggle("active");
        mobileMenu.classList.toggle("active");
      });
      
      // Close menu when clicking outside
      document.addEventListener("click", (e) => {
        if (!this.contains(e.target)) {
          hamburgerBtn.classList.remove("active");
          mobileMenu.classList.remove("active");
        }
      });
      
      // Close menu when clicking any link inside the mobile menu
      mobileMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
          hamburgerBtn.classList.remove("active");
          mobileMenu.classList.remove("active");
        });
      });
    }

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
        #archive-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 32px 24px;
          width: 100%;
        }
        .archive-item {
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(15px);
          transition: opacity 0.5s ease, transform 0.5s ease;
          width: 260px;
        }
        .book-cover-wrap {
          width: 260px;
          height: 380px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          background: #fcfcfc;
        }
        .book-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: 'Noto Sans KR', sans-serif;
          text-align: left;
          width: 260px;
        }
        .book-meta {
          font-size: 12px;
          color: oklch(0.5 0.02 60);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'Noto Sans KR', sans-serif;
          width: 260px;
        }
        @media (max-width: 767px) {
          .book-title {
            font-size: 13px;
          }
          .book-meta {
            font-size: 11px;
          }
        }
      </style>
      <div id="archive-grid">
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
        item.className = "archive-item";
        
        item.innerHTML = `
          <div class="book-cover-wrap">
            <img src="${book.url || ''}" alt="${book.name || ''}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%23efefef\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'12\\' fill=\\'%23999\\'>이미지 없음</text></svg>'">
          </div>
          <div class="book-title">${book.name || '제목 없음'}</div>
          <div class="book-meta">
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
        const parsed = JSON.parse(cachedData);
        if (parsed.length > 0 && parsed[0].name === "공정하다는 착각") {
          parsed.reverse();
        }
        archiveData = parsed;
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
        // Reverse array so latest meetings (e.g. 곽민수의 다시 만난 고대문명(이집트)) appear first
        data.reverse();

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
          gap: 14px;
          width: 100%;
        }
        .topic-item {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          user-select: none;
        }
        .topic-item:hover {
          background: #F7FAF9;
          border-color: #2A6B52;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(42, 107, 82, 0.08);
        }
        .topic-item:hover .topic-title {
          color: #2A6B52;
        }
        .topic-item:hover .arrow-icon {
          transform: translateX(4px);
          color: #2A6B52;
        }
        .book-badge {
          background: #E8F0ED;
          color: #2A6B52;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          min-width: 90px;
          max-width: 160px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex-shrink: 0;
        }
        .topic-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .topic-title {
          font-size: 16px;
          color: #1F2937;
          font-weight: 600;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.15s ease;
        }
        .topic-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .user-id {
          font-size: 13px;
          color: #4B5563;
          white-space: nowrap;
          font-weight: 600;
        }
        .topic-date {
          font-size: 12px;
          color: #9CA3AF;
          white-space: nowrap;
        }
        .arrow-icon {
          font-size: 16px;
          color: #D1D5DB;
          font-weight: 700;
          transition: transform 0.2s ease, color 0.2s ease;
          flex-shrink: 0;
          margin-left: 4px;
        }

        /* Detail View Styles */
        .topic-detail-view {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 28px 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .detail-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F3F4F6;
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F3F4F6;
          color: #374151;
          border: 1px solid #E5E7EB;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .back-btn:hover {
          background: #2A6B52;
          color: #FFFFFF;
          border-color: #2A6B52;
        }
        .detail-meta-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .detail-badge {
          background: #E8F0ED;
          color: #2A6B52;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          overflow-wrap: anywhere;
          min-width: 0;
        }
        .detail-writer-info {
          font-size: 13px;
          color: #6B7280;
        }
        .detail-writer-info strong {
          color: #1F2937;
          font-weight: 600;
        }
        .detail-title {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          line-height: 1.4;
          margin: 0;
          padding-bottom: 24px;
          overflow-wrap: anywhere;
          border-bottom: 1px solid #E5E7EB;
          font-family: 'Noto Sans KR', sans-serif;
        }
        .detail-content-box {
          padding: 28px 0;
          min-height: 160px;
        }
        .detail-body.is-empty {
          color: #9CA3AF;
          font-size: 14px;
        }
        .detail-body {
          font-size: 15px;
          line-height: 1.75;
          color: #2D3748;
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
        }
        .detail-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid #F3F4F6;
          margin-top: 24px;
          flex-wrap: wrap;
        }
        .detail-action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .action-btn svg {
          vertical-align: middle;
        }
        .action-btn.edit-btn {
          background: #FFFFFF;
          color: #2A6B52;
          border: 1.5px solid #2A6B52;
        }
        .action-btn.edit-btn:hover {
          background: #2A6B52;
          color: #FFFFFF;
        }
        .action-btn.delete-btn {
          background: #FFF5F5;
          color: #E53E3E;
          border: 1.5px solid #FEB2B2;
        }
        .action-btn.delete-btn:hover {
          background: #E53E3E;
          color: #FFFFFF;
          border-color: #E53E3E;
        }

        @media (max-width: 680px) {
          .topic-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            padding: 16px;
          }
          .book-badge {
            align-self: flex-start;
            min-width: unset;
            max-width: 100%;
          }
          .topic-meta {
            width: 100%;
            justify-content: space-between;
          }
          .arrow-icon {
            display: none;
          }
          .topic-detail-view {
            padding: 20px 18px;
          }
          .detail-title {
            font-size: 18px;
          }
          .detail-footer {
            flex-direction: column-reverse;
            align-items: stretch;
            gap: 12px;
          }
          .detail-action-buttons {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .action-btn {
            justify-content: center;
            padding: 10px;
          }
          .back-btn {
            justify-content: center;
            width: 100%;
            padding: 10px;
          }
        }
      </style>
      <div id="topics-root">
        <div id="topics-container" class="topic-list">
          <div style="text-align: center; color: oklch(0.5 0.02 60); font-size: 14px; padding: 40px 0;">토픽 목록을 불러오는 중입니다...</div>
        </div>
      </div>
    `;

    let topicsData = [];
    let currentDetailItem = null;
    let rollInterval = null;
    const root = shadow.getElementById("topics-root");

    const CACHE_KEY = "readers_topics_cache";
    const DELETED_KEY = "readers_topics_deleted";
    const EDITED_KEY = "readers_topics_edited";

    const getDeletedList = () => {
      try {
        return JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
      } catch (e) {
        return [];
      }
    };

    const getEditedList = () => {
      try {
        return JSON.parse(localStorage.getItem(EDITED_KEY) || "[]");
      } catch (e) {
        return [];
      }
    };

    const isSameTopic = (a, b) => {
      if (!a || !b) return false;
      const aSub = String(a.Subject || a.subject || a.Title || a.title || '').trim();
      const bSub = String(b.Subject || b.subject || b.Title || b.title || '').trim();
      const aBook = String(a.Book || a.book || '').trim();
      const bBook = String(b.Book || b.book || '').trim();
      const aID = String(a.ID || a.id || a.Writer || a.writer || '').trim();
      const bID = String(b.ID || b.id || b.Writer || b.writer || '').trim();
      return aSub === bSub && aBook === bBook && aID === bID;
    };

    const applyLocalOverrides = (rawList) => {
      const deleted = getDeletedList();
      const edited = getEditedList();

      let list = rawList.filter(item => !deleted.some(d => isSameTopic(d, item)));

      list = list.map(item => {
        const editMatch = edited.find(e => isSameTopic(e.oldTopic, item));
        return editMatch ? { ...item, ...editMatch.updatedTopic } : item;
      });

      return list;
    };

    const formatDate = (val) => {
      if (!val) return '';
      const str = String(val).trim();
      if (/^\d{8}$/.test(str)) {
        return `${str.slice(0, 4)}.${str.slice(4, 6)}.${str.slice(6, 8)}`;
      }
      if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}.${m}.${day}`;
        }
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.slice(0, 10).replace(/-/g, '.');
      }
      return str;
    };

    const startRolling = (container) => {
      if (rollInterval) clearInterval(rollInterval);
      if (topicsData.length <= 3) {
        container.style.maxHeight = "";
        container.style.overflow = "";
        return;
      }

      rollInterval = setInterval(() => {
        const firstChild = container.querySelector(".topic-item");
        if (!firstChild) return;

        // Slide up smoothly
        firstChild.style.transition = "margin-top 0.8s ease, opacity 0.8s ease";
        firstChild.style.marginTop = `-${firstChild.offsetHeight + 14}px`; // 14px is gap
        firstChild.style.opacity = "0";

        setTimeout(() => {
          // Reset styles
          firstChild.style.transition = "";
          firstChild.style.marginTop = "";
          firstChild.style.opacity = "";
          // Move to the end of the list
          container.appendChild(firstChild);
        }, 800);
      }, 4000); // Shift every 4 seconds
    };

    const renderList = () => {
      if (rollInterval) clearInterval(rollInterval);
      currentDetailItem = null;

      root.innerHTML = `<div id="topics-container" class="topic-list"></div>`;
      const container = root.querySelector("#topics-container");

      if (topicsData.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: oklch(0.5 0.02 60); font-size: 14px; padding: 40px 0;">등록된 토픽이 없습니다. 첫 번째 토픽을 등록해 보세요!</div>`;
        return;
      }

      topicsData.forEach((item) => {
        const bookText = item.Book || item.book || '자유 도서/이슈';
        const subjectText = String(item.Subject ?? '').trim() || '제목 없음';
        const writerText = item.ID || item.id || item.Writer || item.writer || '익명';
        const dateText = formatDate(item.Date || item.date);

        const row = document.createElement("div");
        row.className = "topic-item";
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.title = "클릭하여 내용 보기";
        row.innerHTML = `
          <div class="book-badge" title="${bookText}">
            ${bookText}
          </div>
          <div class="topic-main">
            <div class="topic-title"></div>
          </div>
          <div class="topic-meta">
            ${dateText ? `<span class="topic-date">${dateText}</span>` : ''}
            <span class="user-id">— ${writerText}</span>
            <span class="arrow-icon">→</span>
          </div>
        `;

        row.querySelector(".topic-title").textContent = subjectText;

        row.addEventListener("click", () => {
          renderDetail(item);
        });
        row.addEventListener("keydown", (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            renderDetail(item);
          }
        });

        container.appendChild(row);
      });

      // Pause rolling on hover, resume on mouse leave
      container.addEventListener("mouseenter", () => {
        if (rollInterval) clearInterval(rollInterval);
      });
      container.addEventListener("mouseleave", () => {
        if (!currentDetailItem) {
          startRolling(container);
        }
      });

      // Show exactly 3 items, roll the rest
      if (topicsData.length > 3) {
        setTimeout(() => {
          const items = container.querySelectorAll(".topic-item");
          if (items.length > 3) {
            let totalHeight = 0;
            for (let i = 0; i < 3; i++) {
              totalHeight += items[i].offsetHeight + 14; // height + gap
            }
            container.style.maxHeight = `${totalHeight - 14}px`;
            container.style.overflow = "hidden";
            startRolling(container);
          }
        }, 150);
      } else {
        container.style.maxHeight = "";
        container.style.overflow = "";
      }
    };

    const renderDetail = (item) => {
      if (rollInterval) clearInterval(rollInterval);
      currentDetailItem = item;

      const bookText = item.Book || item.book || '자유 도서/이슈';
      const subjectText = String(item.Subject ?? '').trim() || '제목 없음';
      const topicText = String(item.Topic ?? '');
      const writerText = item.ID || item.id || item.Writer || item.writer || '익명';
      const dateText = formatDate(item.Date || item.date);

      const currentUser = localStorage.getItem("readers_user_id");
      const isAuthor = currentUser && (
        String(currentUser).trim().toLowerCase() === String(writerText).trim().toLowerCase() ||
        String(currentUser).trim() === 'admin' ||
        String(currentUser).trim() === '관리자'
      );

      root.innerHTML = `
        <div class="topic-detail-view">
          <div class="detail-top-nav">
            <button type="button" class="back-btn" id="detail-back-btn-top">
              ← 목록으로 돌아가기
            </button>
            ${dateText ? `<div class="topic-date">등록일: ${dateText}</div>` : ''}
          </div>

          <div class="detail-meta-bar">
            <span class="detail-badge"></span>
            <span class="detail-writer-info">등록자: <strong></strong> 님</span>
          </div>

          <h2 class="detail-title"></h2>

          <div class="detail-content-box">
            <div class="detail-body"></div>
          </div>

          <div class="detail-footer">
            <div class="detail-action-buttons">
              ${isAuthor ? `
                <button type="button" class="action-btn edit-btn" id="detail-edit-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  수정
                </button>
                <button type="button" class="action-btn delete-btn" id="detail-delete-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  삭제
                </button>
              ` : ''}
            </div>
            <button type="button" class="back-btn" id="detail-back-btn-bottom">
              ← 전체 목록 보기
            </button>
          </div>
        </div>
      `;

      // Render sheet values as text and preserve the body\'s line breaks.
      root.querySelector(".detail-badge").textContent = bookText;
      root.querySelector(".detail-writer-info strong").textContent = writerText;
      root.querySelector(".detail-title").textContent = subjectText;
      const detailBody = root.querySelector(".detail-body");
      detailBody.textContent = String(topicText).trim() ? topicText : "본문이 비어 있습니다.";
      detailBody.classList.toggle("is-empty", !String(topicText).trim());

      const backBtnTop = root.querySelector("#detail-back-btn-top");
      const backBtnBottom = root.querySelector("#detail-back-btn-bottom");
      const editBtn = root.querySelector("#detail-edit-btn");
      const deleteBtn = root.querySelector("#detail-delete-btn");

      const handleBack = () => {
        renderList();
      };

      if (backBtnTop) backBtnTop.addEventListener("click", handleBack);
      if (backBtnBottom) backBtnBottom.addEventListener("click", handleBack);

      if (editBtn) {
        editBtn.addEventListener("click", () => {
          window.dispatchEvent(new CustomEvent("open-edit-topic-modal", { detail: item }));
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (deleteBtn.disabled || !confirm("삭제하시겠습니까?")) return;
          deleteBtn.disabled = true;
          try {
            const res = await fetch(NAV_API_URL, {
              method: "POST",
              mode: "cors",
              headers: { "Content-Type": "text/plain" },
              body: JSON.stringify({
                action: "deleteTopic",
                id: localStorage.getItem("readers_user_id"),
                author: item.ID ?? item.id ?? item.Writer ?? item.writer ?? "",
                book: item.Book ?? item.book ?? "",
                subject: item.Subject ?? item.subject ?? "",
                topic: item.Topic ?? item.topic ?? "",
                date: item.Date ?? item.date ?? ""
              })
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const result = await res.json();
            if (!result.success) throw new Error(result.error || "토픽 삭제에 실패했습니다.");
            topicsData = topicsData.filter(t => t !== item);
            localStorage.setItem(CACHE_KEY, JSON.stringify(topicsData));
            window.dispatchEvent(new CustomEvent("readers-topic-deleted", { detail: item }));
            renderList();
            alert("토픽이 삭제되었습니다.");
          } catch (err) {
            alert(err.message || "토픽 삭제에 실패했습니다.");
          } finally {
            deleteBtn.disabled = false;
          }
        });
      }
    };

    let topicLoadVersion = 0;
    const loadData = () => {
      const version = ++topicLoadVersion;
      topicRequestJSON(NAV_API_URL + "?action=getTopics&_=" + Date.now())
        .then(data => {
          if (version !== topicLoadVersion) return;
          if (!Array.isArray(data)) throw new Error(data?.error || "토픽 조회 응답 형식이 올바르지 않습니다.");
          // Reversing the array places the latest registered topics at the top
          data.reverse();

          // A successful sheet response takes precedence over stale local edits.
          const processed = data;
          const hasUpdates = JSON.stringify(processed) !== JSON.stringify(topicsData);
          if (hasUpdates || !root.querySelector(".topic-item, .topic-detail-view")) {
            topicsData = processed;
            localStorage.setItem(CACHE_KEY, JSON.stringify(topicsData));
            if (!currentDetailItem) {
              renderList();
            } else {
              const matched = topicsData.find(t => isSameTopic(t, currentDetailItem));
              if (matched) {
                currentDetailItem = matched;
                renderDetail(matched);
              } else {
                renderList();
              }
            }
          }
        })
        .catch(err => {
          if (version !== topicLoadVersion) return;
          console.error("Failed to load topics in background", err);
          if (topicsData.length === 0) {
            root.textContent = "토픽을 불러오지 못했습니다. 새로고침하여 다시 시도해 주세요.";
          }
        });
    };

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const rawCached = JSON.parse(cached);
        topicsData = Array.isArray(rawCached) ? rawCached : [];
        renderList();
      } catch (e) {
        console.error("Failed to parse topics cache", e);
      }
    }

    loadData();

    // Listen to custom event when a new topic is added
    window.addEventListener("readers-topic-added", (e) => {
      if (e.detail) {
        // Optimistic UI Update: Prepend newly added topic immediately
        topicsData = [e.detail, ...topicsData.filter(item => !isSameTopic(item, e.detail))];
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(topicsData)); } catch (err) { console.warn("Topic cache:", err); }
        renderDetail(e.detail);
      }
      loadData();
    });

    // Listen to custom event when a topic is updated
    window.addEventListener("readers-topic-updated", (e) => {
      if (e.detail) {
        const { oldTopic, updatedTopic } = e.detail;
        const edited = getEditedList().filter(ed => !isSameTopic(ed.oldTopic, oldTopic));
        edited.push({ oldTopic, updatedTopic });
        localStorage.setItem(EDITED_KEY, JSON.stringify(edited));

        topicsData = topicsData.map(item => isSameTopic(item, oldTopic) ? updatedTopic : item);
        localStorage.setItem(CACHE_KEY, JSON.stringify(topicsData));

        if (currentDetailItem && isSameTopic(currentDetailItem, oldTopic)) {
          currentDetailItem = updatedTopic;
          renderDetail(updatedTopic);
        } else {
          renderList();
        }
      }
    });

    // Listen to login/logout to update button visibility dynamically
    window.addEventListener("readers-login", () => {
      if (currentDetailItem) {
        renderDetail(currentDetailItem);
      }
    });
    window.addEventListener("readers-logout", () => {
      if (currentDetailItem) {
        renderDetail(currentDetailItem);
      }
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
  const heroSubject = document.getElementById("hero-meeting-subject");
  if (heroTime) heroTime.textContent = `${displayDate} ${displayTime}`;
  if (heroPlace) heroPlace.textContent = latest.place || '';
  if (heroSubject) heroSubject.textContent = latest.subject || '자유 선택 도서 (자유 주제)';

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

function renderMeetingError(msg) {
  const heroTime = document.getElementById("hero-meeting-time");
  const heroPlace = document.getElementById("hero-meeting-place");
  const heroSubject = document.getElementById("hero-meeting-subject");
  if (heroTime) heroTime.textContent = msg;
  if (heroPlace) heroPlace.textContent = "-";
  if (heroSubject) heroSubject.textContent = "-";

  const noticeDate = document.getElementById("notice-date");
  const noticeTime = document.getElementById("notice-time");
  const noticePlace = document.getElementById("notice-place");
  const noticeMemo = document.getElementById("notice-memo");

  if (noticeDate) noticeDate.textContent = msg;
  if (noticeTime) noticeTime.textContent = "-";
  if (noticePlace) noticePlace.textContent = "-";
  if (noticeMemo) noticeMemo.innerHTML = "📌 구글 Apps Script 연동 상태를 확인해 주세요.";
}

const MEETING_CACHE_KEY = "readers_meeting_cache";

function isMeetingCacheValid(cachedMeeting) {
  if (!cachedMeeting || typeof cachedMeeting !== 'object') return false;
  if (!cachedMeeting.date && !cachedMeeting.subject) return false;

  const dateRaw = String(cachedMeeting.date || '').trim();
  if (!dateRaw) return true; // If no date field but has subject/place, consider valid

  let cutoffDate = null;

  // Clean date string: replace '.', '년', '월', '일' with '-'
  const cleanDate = dateRaw.replace(/[.\s년월일]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const parts = cleanDate.split('-');

  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      cutoffDate = new Date(year, month, day, 18, 0, 0); // 18:00 (6 PM) on meeting day
    }
  }

  if (!cutoffDate || isNaN(cutoffDate.getTime())) {
    const parsed = Date.parse(dateRaw);
    if (!isNaN(parsed)) {
      cutoffDate = new Date(parsed);
      cutoffDate.setHours(18, 0, 0, 0);
    }
  }

  if (!cutoffDate || isNaN(cutoffDate.getTime())) {
    return true; // If date cannot be parsed, treat as valid to prevent flickering
  }

  const now = new Date();
  return now.getTime() <= cutoffDate.getTime();
}

function loadLatestMeeting(forceRefresh) {
  let cachedData = null;
  const cachedStr = localStorage.getItem(MEETING_CACHE_KEY);

  if (cachedStr) {
    try {
      cachedData = JSON.parse(cachedStr);
    } catch(e) {
      console.error("Failed to parse meeting cache", e);
    }
  }

  const hasCachedMeeting = cachedData && cachedData.meeting && (cachedData.meeting.date || cachedData.meeting.subject || cachedData.meeting.place);

  // 1. Render cached meeting immediately if present (0ms lag)
  if (hasCachedMeeting) {
    renderMeeting(cachedData.meeting);
  }

  // Always refresh from the sheet after displaying cached content.
  fetch(NAV_API_URL + "?action=getMeetings")
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function(data) {
      if (!Array.isArray(data)) throw new Error(data?.error || "모임 조회 응답 형식이 올바르지 않습니다.");
      if (data.length > 0) {
        var latest = data[data.length - 1];
        localStorage.setItem(MEETING_CACHE_KEY, JSON.stringify({
          meeting: latest,
          timestamp: Date.now()
        }));
        renderMeeting(latest);
      } else {
        localStorage.removeItem(MEETING_CACHE_KEY);
        renderMeetingError("등록된 모임이 없습니다");
      }
    })
    .catch(function(err) {
      console.error("Failed to load meeting info:", err);
      // ONLY render error if we don't already have a valid cached meeting
      if (!hasCachedMeeting) {
        renderMeetingError("연동 실패 (구글시트 Apps Script URL 확인 필요)");
      }
    });
}

let isRestoringMeeting = false;
function setupMeetingObserver() {
  if (window.__meetingObserverActive) return;
  window.__meetingObserverActive = true;

  const observer = new MutationObserver(function() {
    if (isRestoringMeeting) return;
    const heroTime = document.getElementById("hero-meeting-time");
    const noticeDate = document.getElementById("notice-date");

    if ((heroTime && heroTime.textContent === "로딩 중...") || (noticeDate && noticeDate.textContent === "로딩 중...")) {
      const cachedStr = localStorage.getItem(MEETING_CACHE_KEY);
      if (cachedStr) {
        try {
          const cachedData = JSON.parse(cachedStr);
          if (cachedData && cachedData.meeting && (cachedData.meeting.date || cachedData.meeting.subject)) {
            isRestoringMeeting = true;
            renderMeeting(cachedData.meeting);
            isRestoringMeeting = false;
          }
        } catch(e) {}
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    setupMeetingObserver();
    loadLatestMeeting(false);
  });
} else {
  setupMeetingObserver();
  loadLatestMeeting(false);
}

// Reload when admin registers a new meeting
window.addEventListener("readers-meeting-added", function() { loadLatestMeeting(true); });

})();

