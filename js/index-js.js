
    /*********************
     * Storage & Helpers *
     *********************/
    const LS_USERS = 'mf_users_v1';        // users map: username -> { password, displayName, bio }
    const LS_CURRENT = 'mf_current_v1';    // current username
    const LS_POSTS = 'mf_posts_v1';        // posts array
    const LS_USERLIKES = 'mf_userlikes_v1';// user-likes map: key `${user}:${postId}` -> true
    const LS_COMMENTS = 'mf_comments_v1';  // comments map: postId -> [{user,text,ts}]

    const safeParse = (s, d) => { try { return JSON.parse(s) ?? d; } catch { return d; } };
    const now = () => Date.now();

    // Users functions
    const getUsers = () => safeParse(localStorage.getItem(LS_USERS), {});
    const saveUsers = (u) => localStorage.setItem(LS_USERS, JSON.stringify(u));

    const getCurrentUser = () => localStorage.getItem(LS_CURRENT) || '';
    const setCurrentUser = (u) => {
      if (u) localStorage.setItem(LS_CURRENT, u);
      else localStorage.removeItem(LS_CURRENT);
    };

    // Posts
    const getPosts = () => safeParse(localStorage.getItem(LS_POSTS), defaultPosts());
    const savePosts = (p) => localStorage.setItem(LS_POSTS, JSON.stringify(p));

    // Likes
    const getUserLikes = () => safeParse(localStorage.getItem(LS_USERLIKES), {});
    const saveUserLikes = (m) => localStorage.setItem(LS_USERLIKES, JSON.stringify(m));

    // Comments
    const getComments = () => safeParse(localStorage.getItem(LS_COMMENTS), {});
    const saveComments = (c) => localStorage.setItem(LS_COMMENTS, JSON.stringify(c));

    // default sample posts
    function defaultPosts(){
      // one-time default posts if none exist
      return [
        { id: idFor(), author: 'Alice', text: 'Welcome to Mini Facebook — built with localStorage!', ts: now() - 1000*60*60*6 },
        { id: idFor(), author: 'Bob', text: 'Share updates, like, comment — no backend needed (yet).', ts: now() - 1000*60*30 }
      ];
    }

    function idFor(){
      // unique id using timestamp + random
      return `${Date.now()}_${Math.floor(Math.random()*9999)}`;
    }

    function timeAgo(ts){
      const s = Math.floor((Date.now()-ts)/1000);
      if (s < 60) return `${s}s`;
      const m = Math.floor(s/60);
      if (m < 60) return `${m}m`;
      const h = Math.floor(m/60);
      if (h < 24) return `${h}h`;
      const d = Math.floor(h/24);
      return `${d}d`;
    }

    /*********************
     * UI Elements
     *********************/
    const authSection = document.getElementById('auth');
    const app = document.getElementById('app');
    const profileDisplay = document.getElementById('profile-display');
    const profileUsername = document.getElementById('profile-username');
    const profileBio = document.getElementById('profile-bio');
    const sidebarUsername = document.getElementById('sidebar-username');

    const authTitle = document.getElementById('auth-title');
    const authError = document.getElementById('auth-error');
    const inputUsername = document.getElementById('input-username');
    const inputPassword = document.getElementById('input-password'); // intentionally undefined in some flows
    // fix element id: earlier we used input-password id is input-password; but in markup it's input-password? We used input-password in auth; ensure proper selector:
    const inputPasswordElem = document.getElementById('input-password') || document.querySelector('#input-password');

    // Actually our markup uses id="input-password" - we already fetched above incorrectly named variable; use direct selects below:
    const usernameField = document.getElementById('input-username');
    const passwordField = document.getElementById('input-password');

    const linkSwitch = document.getElementById('link-switch');

    const viewProfile = document.getElementById('view-profile');
    const viewCreate = document.getElementById('view-create');
    const viewFeed = document.getElementById('view-feed');

    const editDisplay = document.getElementById('edit-display');
    const editBio = document.getElementById('edit-bio');
    const btnSaveProfile = document.getElementById('btn-save-profile');

    const postText = document.getElementById('post-text');
    const btnPost = document.getElementById('btn-post');

    const navHome = document.getElementById('nav-home');
    const navFeed = document.getElementById('nav-feed');
    const navCreate = document.getElementById('nav-create');
    const navLogout = document.getElementById('nav-logout');
    const mainTitle = document.getElementById('main-title');

    /*********************
     * State & Init
     *********************/
    let isLoginMode = true; // login or register mode
    let current = getCurrentUser(); // username string or ''

    // Ensure initial storage values exist
    if (!localStorage.getItem(LS_POSTS)) savePosts(defaultPosts());

    // Wire up auth UI
    document.getElementById('btn-auth').addEventListener('click', handleAuth);
    linkSwitch.addEventListener('click', () => toggleAuthMode(!isLoginMode));
    // enter key
    usernameField.addEventListener('keydown', (e)=> { if (e.key === 'Enter') handleAuth(); });
    passwordField.addEventListener('keydown', (e)=> { if (e.key === 'Enter') handleAuth(); });

    function toggleAuthMode(mode){
      isLoginMode = mode;
      authTitle.textContent = isLoginMode ? 'Login' : 'Register';
      document.getElementById('btn-auth').textContent = isLoginMode ? 'Login' : 'Register';
      document.getElementById('switch-text').textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
      linkSwitch.textContent = isLoginMode ? ' Register' : ' Login';
      authError.style.display = 'none';
    }

    function showAuthError(msg){
      authError.textContent = msg;
      authError.style.display = 'block';
    }

    function handleAuth(){
      const u = usernameField.value.trim();
      const p = passwordField.value.trim();

      if (!u || !p) { showAuthError('Please fill username and password'); return; }
      if (/\s/.test(u)) { showAuthError('Username cannot contain spaces'); return; }

      const users = getUsers();

      if (isLoginMode){
        if (users[u] && users[u].password === p){
          // success
          setCurrentUser(u);
          current = u;
          usernameField.value = '';
          passwordField.value = '';
          openApp();
        } else {
          showAuthError('Invalid username or password');
        }
      } else {
        // register
        if (users[u]) { showAuthError('Username already exists'); return; }
        users[u] = { password: p, displayName: u, bio: '' };
        saveUsers(users);
        // auto login on register:
        setCurrentUser(u);
        current = u;
        usernameField.value = '';
        passwordField.value = '';
        openApp();
      }
    }

    /*********************
     * App navigation
     *********************/
    function openApp(){
      // hide auth, show app UI
      authSection.classList.add('hidden');
      app.classList.remove('hidden');
      app.setAttribute('aria-hidden','false');
      renderProfileSection();
      showProfile(); // default upon login: profile
    }

    function closeApp(){
      // show auth, hide app
      authSection.classList.remove('hidden');
      app.classList.add('hidden');
      app.setAttribute('aria-hidden','true');
      // clear fields
    }

    // nav handlers
    navHome.addEventListener('click', () => showProfile());
    navFeed.addEventListener('click', () => showFeed());
    navCreate.addEventListener('click', () => showCreate());
    navLogout.addEventListener('click', () => doLogout());
    document.getElementById('nav-logout').addEventListener('click', () => doLogout()); // just in case

    function doLogout(){
      setCurrentUser('');
      current = '';
      closeApp();
      toggleAuthMode(true);
    }

    /*********************
     * Profile
     *********************/
    function renderProfileSection(){
      const users = getUsers();
      const me = users[current] || { displayName: current, bio: '' };
      profileDisplay.textContent = me.displayName || current;
      profileUsername.textContent = '@' + current;
      profileBio.textContent = me.bio || 'No bio yet.';

      sidebarUsername.textContent = '@' + current;

      editDisplay.value = me.displayName || current;
      editBio.value = me.bio || '';
    }

    btnSaveProfile.addEventListener('click', ()=>{
      const users = getUsers();
      if (!users[current]) users[current] = { password: '', displayName: current, bio: '' };
      users[current].displayName = (editDisplay.value.trim() || current);
      users[current].bio = editBio.value.trim();
      saveUsers(users);
      renderProfileSection();
      alert('Profile saved');
    });

    function showProfile(){
      mainTitle.textContent = 'Profile';
      viewProfile.classList.remove('hidden');
      viewCreate.classList.add('hidden');
      viewFeed.classList.add('hidden');
      renderProfileSection();
    }

    /*********************
     * Create Post
     *********************/
    btnPost.addEventListener('click', ()=>{
      const txt = postText.value.trim();
      if (!txt) return;
      // create post object
      const posts = getPosts();
      const newPost = {
        id: idFor(),
        author: current,
        text: txt,
        ts: now()
      };
      posts.unshift(newPost);
      savePosts(posts);
      postText.value = '';
      alert('Posted to feed');
      showFeed(); // navigate to feed
    });

    function showCreate(){
      mainTitle.textContent = 'Create Post';
      viewProfile.classList.add('hidden');
      viewCreate.classList.remove('hidden');
      viewFeed.classList.add('hidden');
    }

    /*********************
     * Feed rendering + interactions
     *********************/
    function showFeed(){
      mainTitle.textContent = 'News Feed';
      viewProfile.classList.add('hidden');
      viewCreate.classList.add('hidden');
      viewFeed.classList.remove('hidden');
      renderFeed();
    }

    function renderFeed(){
      const posts = getPosts().slice().sort((a,b)=>b.ts - a.ts); // newest first
      const userLikes = getUserLikes();
      const comments = getComments();

      viewFeed.innerHTML = ''; // clear

      posts.forEach(post => {
        // card
        const card = document.createElement('div');
        card.className = 'card';
        card.style.position = 'relative';
        // calculate like count
        const likesCount = Object.values(userLikes).filter(v => v && v.postId === post.id).length;
        // but we save likes per key differently; earlier simpler approach: store map where key `${user}:${postId}` -> true.
        // Let's compute likesCount by scanning userLikes keys:
        const ul = userLikes;
        let cnt = 0;
        for (const k in ul) {
          if (ul[k] && typeof ul[k] === 'boolean') { // legacy boolean
            const parts = k.split(':');
            if (parts[1] === post.id) cnt++;
          } else {
            // support both shapes: if value contains postId property (robust)
            // ignore
          }
        }

        // Build innerHTML
        card.innerHTML = `
          <div class="post-author">${escapeHtml(post.author)}</div>
          <div class="post-meta">${timeAgo(post.ts)} • ${new Date(post.ts).toLocaleString()}</div>
          <div class="post-text">${escapeHtml(post.text)}</div>
          <div class="post-actions">
            <button class="like-btn ${userLikes[`${current}:${post.id}`] ? 'liked' : ''}" data-id="${post.id}">
              ${userLikes[`${current}:${post.id}`] ? '❤️ Liked' : '👍 Like'}
            </button>
            <div class="count" id="count-${post.id}">${cnt} ${cnt===1?'like':'likes'}</div>
          </div>
          <div class="heart" id="heart-${post.id}">❤️</div>
          <div class="comments" id="comments-${post.id}"></div>

          <div class="comment-input" style="margin-top:10px;display:flex;gap:8px">
            <input id="comment-input-${post.id}" placeholder="Write a comment..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #ddd"/>
            <button class="btn" data-id="${post.id}" id="comment-btn-${post.id}" style="padding:8px 10px">Comment</button>
          </div>
        `;

        viewFeed.appendChild(card);

        // Attach events
        const likeBtn = card.querySelector('.like-btn');
        likeBtn.addEventListener('click', ()=> toggleLike(post.id, true));

        // double-tap / double-click to like (ignore clicks on inputs/buttons)
        let lastTap = 0;
        card.addEventListener('click', (e)=>{
          if (e.target.closest('button') || e.target.tagName === 'INPUT') return;
          const t = Date.now();
          if (t - lastTap < 400 && t - lastTap > 0) {
            if (!getUserLikes()[`${current}:${post.id}`]) toggleLike(post.id, true);
          }
          lastTap = t;
        });

        // comment button
        card.querySelector(`#comment-btn-${post.id}`).addEventListener('click', ()=>{
          const input = document.getElementById(`comment-input-${post.id}`);
          const txt = input.value.trim();
          if (!txt) return;
          addComment(post.id, current, txt);
          input.value = '';
          renderCommentsFor(post.id);
        });

        // render existing comments
        renderCommentsFor(post.id);
      });
    }

    function renderCommentsFor(postId){
      const box = document.getElementById(`comments-${postId}`);
      if (!box) return;
      const comments = getComments();
      box.innerHTML = '';
      const arr = comments[postId] || [];
      arr.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `<strong>${escapeHtml(c.user)}:</strong> ${escapeHtml(c.text)} <div style="font-size:11px;color:var(--muted);margin-top:6px">${timeAgo(c.ts)}</div>`;
        box.appendChild(div);
      });
    }

    function addComment(postId, user, text){
      const comments = getComments();
      if (!comments[postId]) comments[postId] = [];
      comments[postId].push({ user, text, ts: now() });
      saveComments(comments);
    }

    // toggleLike flips the like state for current user on a post
    function toggleLike(postId, animate=false){
      if (!current) { alert('Please login'); return; }
      const ul = getUserLikes();
      const key = `${current}:${postId}`;
      if (ul[key]) {
        // unlike
        ul[key] = false;
      } else {
        ul[key] = true;
      }
      saveUserLikes(ul);
      // re-render the feed (keeps consistent and reattaches events)
      renderFeed();
      if (animate && ul[key]) {
        // show heart
        setTimeout(()=>{
          const heart = document.getElementById(`heart-${postId}`);
          if (heart) {
            heart.classList.add('show-heart');
            setTimeout(()=> heart.classList.remove('show-heart'), 600);
          }
        }, 20);
      }
    }

    /*********************
     * Utilities
     *********************/
    function escapeHtml(s){
      if (!s && s !== '') return '';
      return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
    }

    /*********************
     * Startup
     *********************/
    // If user logged in previously -> open app
    const prev = getCurrentUser();
    if (prev){
      current = prev;
      // ensure user exists in users db (if not, create minimal)
      const uobj = getUsers();
      if (!uobj[current]) {
        uobj[current] = { password: '', displayName: current, bio: '' };
        saveUsers(uobj);
      }
      openApp();
    } else {
      // stay on auth screen
      toggleAuthMode(true);
    }
