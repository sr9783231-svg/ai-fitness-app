let currentUserId = null;
let currentUsername = "";
let isLoginMode = true;

window.onload = () => {
    const ctx = document.getElementById('loginChart');
    if (ctx) {
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: ['Week 1', 'Week 4', 'Week 8', 'Week 12'], datasets: [{ label: 'Avg Strength Increase (%)', data: [2, 12, 28, 45], backgroundColor: '#00d4ff', borderRadius: 6, borderSkipped: false }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { display: false, beginAtZero: true }, x: { grid: { display: false }, ticks: { color: '#8888a8', font: { family: 'Outfit' } } } }, animation: { duration: 2000, easing: 'easeOutQuart' } }
        });
    }
};

function toggleAuth() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-mode-title').innerText = isLoginMode ? "Sign In" : "Create Account";
    document.querySelector('.toggle-text').innerHTML = isLoginMode ? "Don't have an account? <span class='lime'>Sign Up</span>" : "Already have an account? <span class='lime'>Sign In</span>";
    document.getElementById('auth-msg').innerText = "";
}

async function handleAuth() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const endpoint = isLoginMode ? '/login' : '/register';
    if(!user || !pass) return document.getElementById('auth-msg').innerText = "Please fill fields.";
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
    const data = await res.json();
    if (data.success) {
        if (!isLoginMode) { alert("Account Created! Please Sign in."); toggleAuth(); } 
        else { currentUserId = data.userId; currentUsername = user; document.getElementById('auth-screen').classList.add('hidden'); checkUserOnboarding(); }
    } else { document.getElementById('auth-msg').innerText = data.error; }
}

function logout() { location.reload(); }

async function checkUserOnboarding() {
    const res = await fetch(`/profile/${currentUserId}`);
    const data = await res.json();
    if (!data.success || !data.profile || !data.profile.weight) { document.getElementById('onboarding-screen').classList.remove('hidden'); } 
    else { document.getElementById('app-screen').classList.remove('hidden'); document.getElementById('user-display-name').innerText = currentUsername.toUpperCase(); loadProfileData(data.profile); }
}

async function completeOnboarding() {
    const age = document.getElementById('ob-age').value, height = document.getElementById('ob-height').value, weight = document.getElementById('ob-weight').value;
    if(!age || !height || !weight) return;
    await fetch('/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUserId, age, gender: document.getElementById('ob-gender').value, height, weight, goal: document.getElementById('ob-goal').value, activity: document.getElementById('ob-activity').value }) });
    document.getElementById('onboarding-screen').classList.add('hidden'); document.getElementById('app-screen').classList.remove('hidden'); document.getElementById('user-display-name').innerText = currentUsername.toUpperCase();
    const res = await fetch(`/profile/${currentUserId}`); const data = await res.json(); loadProfileData(data.profile);
}

// --- INNOVATIVE TAB SWITCHING LOGIC ---
function switchTab(tabId, event) {
    document.querySelectorAll('.tab-section').forEach(el => {
        el.classList.add('hidden');
        el.style.animation = 'none'; 
    });

    const activeTab = document.getElementById(`tab-${tabId}`);
    activeTab.classList.remove('hidden');
    
    void activeTab.offsetWidth; 
    
    activeTab.style.animation = 'tabFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';

    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

async function saveProfile() {
    await fetch('/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUserId, age: document.getElementById('age').value, gender: document.getElementById('gender').value, height: document.getElementById('height').value, weight: document.getElementById('weight').value, goal: document.getElementById('goal').value, activity: document.getElementById('activity').value }) });
    const res = await fetch(`/profile/${currentUserId}`); const data = await res.json(); loadProfileData(data.profile);
}

async function loadDailyQuote() {
    try {
        const res = await fetch('/api/daily-quote');
        const data = await res.json();
        if (data.success && data.quote) {
            document.getElementById('daily-quote').innerHTML = `<em>"${data.quote}"</em><br><span style="color:#00d4ff;">- ${data.author}</span>`;
        }
    } catch (e) { console.error("Could not load quote."); }
}

function loadProfileData(p) {
    ['age', 'gender', 'height', 'weight', 'goal', 'activity'].forEach(id => document.getElementById(id).value = p[id] || "");
    if(p.height && p.weight) {
        document.getElementById('home-bmi').innerText = (p.weight / Math.pow(p.height/100, 2)).toFixed(1);
        let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age) + (p.gender === 'male' ? 5 : -161);
        let tdee = bmr * parseFloat(p.activity || 1.2) + (p.goal === 'loss' ? -500 : p.goal === 'gain' ? 500 : 0);
        document.getElementById('home-kcal').innerText = Math.round(tdee);
    }
    loadDailyQuote(); loadWeightChart(); loadWorkouts();
}

let weightChartInstance = null;
async function loadWeightChart() {
    const res = await fetch(`/api/weight-history/${currentUserId}`); const data = await res.json();
    if (data.success && data.logs.length > 0) {
        if (weightChartInstance) weightChartInstance.destroy();
        weightChartInstance = new Chart(document.getElementById('weightChart').getContext('2d'), { type: 'line', data: { labels: data.logs.map(l=>l.date), datasets: [{ data: data.logs.map(l=>l.weight), borderColor: '#00d4ff', backgroundColor: 'rgba(0, 212, 255, 0.1)', fill: true, tension: 0.4 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { display: false } } } });
    }
}

async function logWorkout() {
    await fetch('/api/workouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUserId, exercise: document.getElementById('wo-exercise').value, sets: document.getElementById('wo-sets').value, reps: document.getElementById('wo-reps').value, weight: document.getElementById('wo-weight').value }) });
    ['wo-exercise', 'wo-sets', 'wo-reps', 'wo-weight'].forEach(id => document.getElementById(id).value = ""); loadWorkouts();
}

async function loadWorkouts() {
    const res = await fetch(`/api/workouts/${currentUserId}`); const data = await res.json();
    document.getElementById('workout-history-list').innerHTML = data.workouts.map(wo => `<div style="padding:15px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;"><div><strong class="lime">${wo.exercise}</strong><br><span style="font-size:12px; color:#888;">${wo.date}</span></div><div style="text-align:right;"><span>${wo.sets}x${wo.reps}</span><br><strong>${wo.weight}kg</strong></div></div>`).join('') || "No logs yet.";
}

let isVoiceOutputEnabled = true;
function toggleAIVoice() {
    isVoiceOutputEnabled = !isVoiceOutputEnabled;
    const speakerBtn = document.getElementById('speaker-btn');
    if (isVoiceOutputEnabled) {
        speakerBtn.innerText = "🔊"; speakerBtn.style.color = "#00d4ff"; speakerBtn.style.borderColor = "#00d4ff";
    } else {
        speakerBtn.innerText = "🔇"; speakerBtn.style.color = "#8888a8"; speakerBtn.style.borderColor = "#8888a8"; window.speechSynthesis.cancel();
    }
}

function speakAIResponse(text) {
    if (!isVoiceOutputEnabled) return;
    let cleanText = text.replace(/[\u{1F600}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').replace(/[*#_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; utterance.pitch = 0.95; 
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
}

async function askAI(msgText) {
    const box = document.getElementById('chat-history');
    box.innerHTML += `<div class="chat-msg msg-user">${msgText}</div><div class="chat-msg msg-ai" id="thinking">Typing...</div>`;
    box.scrollTop = box.scrollHeight;
    try {
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msgText, userId: currentUserId }) });
        const data = await res.json();
        document.getElementById('thinking').remove();
        box.innerHTML += `<div class="chat-msg msg-ai">${data.reply}</div>`;
        box.scrollTop = box.scrollHeight;
        speakAIResponse(data.reply);
    } catch (error) {
        document.getElementById('thinking').remove();
        box.innerHTML += `<div class="chat-msg msg-ai" style="color: #ff4757;">Error connecting to coach.</div>`;
    }
}

function sendChat() { const i = document.getElementById('chat-input'); if(i.value) askAI(i.value); i.value = ""; }
function startVoiceChat() {
    const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    rec.onstart = () => document.getElementById('mic-btn').classList.add('recording');
    rec.onresult = (e) => askAI(e.results[0][0].transcript);
    rec.onend = () => document.getElementById('mic-btn').classList.remove('recording');
    rec.start();
}

let currentFoodBase64 = null;
function previewFoodImage() {
    const file = document.getElementById('food-upload').files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (e) => { currentFoodBase64 = e.target.result; document.getElementById('food-preview').src = currentFoodBase64; document.getElementById('food-preview').classList.remove('hidden'); }; reader.readAsDataURL(file);
}
async function analyzeFood() {
    if (!currentFoodBase64) return;
    document.getElementById('food-result-card').classList.remove('hidden'); document.getElementById('food-result-text').innerText = "Scanning... 🍽️";
    const res = await fetch('/api/vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: currentFoodBase64 }) });
    document.getElementById('food-result-text').innerText = (await res.json()).reply;
}

async function generateMealPlan() {
    const duration = document.getElementById('mp-duration').value, diet = document.getElementById('mp-diet').value, meals = document.getElementById('mp-meals').value;
    document.getElementById('mealplan-result').classList.remove('hidden'); document.getElementById('mealplan-text').innerText = "Cooking up your custom diet plan... 👨‍🍳";
    const res = await fetch('/api/mealplan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUserId, duration, diet, meals }) });
    document.getElementById('mealplan-text').innerText = (await res.json()).reply;
}

let tfDetector;
async function initPoseAI() {
    try {
        await tf.ready();
        tfDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING });
        const statusText = document.getElementById('pose-ai-status');
        statusText.innerText = "Model Active"; statusText.style.color = "#00d4ff"; 
    } catch (e) { console.error("TFJS Error:", e); }
}
initPoseAI();

let isVideoTracking = false;
function stopCamera() {
    const video = document.getElementById('pose-vid-preview');
    if (video.srcObject) { video.srcObject.getTracks().forEach(track => track.stop()); video.srcObject = null; }
    isVideoTracking = false;
    document.getElementById('btn-stop-cam').classList.add('hidden');
    document.getElementById('btn-analyze-cam').classList.add('hidden');
    document.getElementById('btn-start-cam').classList.remove('hidden');
}

function switchPoseMode(mode) {
    const imgSec = document.getElementById('pose-image-section'), vidSec = document.getElementById('pose-video-section');
    const imgBtn = document.getElementById('toggle-img-btn'), vidBtn = document.getElementById('toggle-vid-btn'), camBtn = document.getElementById('toggle-cam-btn');
    document.getElementById('pose-result-card').classList.add('hidden');
    stopCamera(); 
    [imgBtn, vidBtn, camBtn].forEach(btn => { btn.className = "btn-ghost"; btn.style = "padding: 8px 15px; border-radius: 8px; width: auto; border: none; color: #8888a8;"; });

    if (mode === 'image') {
        imgSec.classList.remove('hidden'); vidSec.classList.add('hidden');
        imgBtn.className = "btn-primary"; imgBtn.style = "padding: 8px 15px; border-radius: 8px; width: auto;";
    } else if (mode === 'video') {
        imgSec.classList.add('hidden'); vidSec.classList.remove('hidden');
        vidBtn.className = "btn-primary"; vidBtn.style = "padding: 8px 15px; border-radius: 8px; width: auto; background: #ff4757; color: white;";
        document.getElementById('video-upload-ui').classList.remove('hidden'); document.getElementById('btn-start-video').classList.remove('hidden'); document.getElementById('btn-start-cam').classList.add('hidden'); document.getElementById('btn-analyze-cam').classList.add('hidden');
    } else if (mode === 'camera') {
        imgSec.classList.add('hidden'); vidSec.classList.remove('hidden');
        camBtn.className = "btn-primary"; camBtn.style = "padding: 8px 15px; border-radius: 8px; width: auto; background: #ff4757; color: white;";
        document.getElementById('video-upload-ui').classList.add('hidden'); document.getElementById('btn-start-video').classList.add('hidden'); document.getElementById('btn-start-cam').classList.remove('hidden'); document.getElementById('btn-analyze-cam').classList.add('hidden');
        document.getElementById('pose-vid-preview').src = ""; document.getElementById('pose-canvas').getContext('2d').clearRect(0, 0, 1000, 1000);
    }
}

let currentPoseBase64 = null;
function previewPoseImage() {
    const file = document.getElementById('pose-upload').files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (e) => { currentPoseBase64 = e.target.result; document.getElementById('pose-preview').src = currentPoseBase64; document.getElementById('pose-preview').classList.remove('hidden'); }; reader.readAsDataURL(file);
}

async function analyzePose() {
    if (!currentPoseBase64) return alert("Please upload a photo of your lift first!");
    document.getElementById('pose-result-card').classList.remove('hidden'); document.getElementById('pose-result-text').innerText = "Analyzing biomechanics... 🤖";
    const res = await fetch('/api/pose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: currentPoseBase64 }) });
    document.getElementById('pose-result-text').innerText = (await res.json()).reply;
}

function previewPoseVideo() {
    const file = document.getElementById('pose-vid-upload').files[0]; if (!file) return;
    const videoNode = document.getElementById('pose-vid-preview');
    videoNode.src = URL.createObjectURL(file); videoNode.classList.remove('hidden'); isVideoTracking = false; 
    document.getElementById('pose-canvas').getContext('2d').clearRect(0, 0, 1000, 1000);
}

async function startVideoTracking() {
    if (!tfDetector) return alert("AI Model is still loading, please wait a few seconds.");
    const video = document.getElementById('pose-vid-preview'), canvas = document.getElementById('pose-canvas'), ctx = canvas.getContext('2d');
    if (!video.src) return alert("Upload a video first!");
    document.getElementById('pose-result-card').classList.remove('hidden'); document.getElementById('pose-result-text').innerHTML = `<strong style="color: #00d4ff;">Tracking Active!</strong><br><span style="font-size: 14px; color: #888;">The AI is mapping your joints in real-time.</span>`;
    isVideoTracking = true; video.play();

    async function trackFrame() {
        if (!isVideoTracking || video.ended) return; 
        if (video.readyState >= 2 && !video.paused) {
            canvas.width = video.clientWidth; canvas.height = video.clientHeight;
            try {
                const poses = await tfDetector.estimatePoses(video); ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (poses.length > 0) {
                    poses[0].keypoints.forEach(point => {
                        if (point.score > 0.3) { 
                            ctx.beginPath(); ctx.arc((point.x / video.videoWidth) * canvas.width, (point.y / video.videoHeight) * canvas.height, 6, 0, 2 * Math.PI);
                            ctx.fillStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 10; ctx.fill();
                        }
                    });
                }
            } catch (error) {}
        }
        requestAnimationFrame(trackFrame);
    }
    trackFrame();
}

async function startWebcamTracking() {
    if (!tfDetector) return alert("AI Model is still loading, please wait a few seconds.");
    const video = document.getElementById('pose-vid-preview'), canvas = document.getElementById('pose-canvas'), ctx = canvas.getContext('2d');
    document.getElementById('pose-result-card').classList.remove('hidden'); document.getElementById('pose-result-text').innerHTML = `<strong style="color: #00d4ff;">Live Camera Tracking Active!</strong><br><span style="font-size: 14px; color: #888;">Step back so the camera can see your full body.</span>`;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = stream; video.classList.remove('hidden'); document.getElementById('btn-stop-cam').classList.remove('hidden');

        video.onloadedmetadata = () => {
            video.play(); isVideoTracking = true;
            document.getElementById('btn-start-cam').classList.add('hidden'); document.getElementById('btn-analyze-cam').classList.remove('hidden'); 
            async function trackFrame() {
                if (!isVideoTracking) return; 
                if (video.readyState >= 2 && !video.paused) {
                    canvas.width = video.clientWidth; canvas.height = video.clientHeight;
                    try {
                        const poses = await tfDetector.estimatePoses(video); ctx.clearRect(0, 0, canvas.width, canvas.height);
                        if (poses.length > 0) {
                            poses[0].keypoints.forEach(point => {
                                if (point.score > 0.3) { 
                                    ctx.beginPath(); ctx.arc((point.x / video.videoWidth) * canvas.width, (point.y / video.videoHeight) * canvas.height, 6, 0, 2 * Math.PI);
                                    ctx.fillStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 10; ctx.fill();
                                }
                            });
                        }
                    } catch (error) {}
                }
                requestAnimationFrame(trackFrame);
            }
            trackFrame();
        };
    } catch (err) { alert("Camera access denied."); }
}

async function captureAndAnalyzeCam() {
    const video = document.getElementById('pose-vid-preview');
    if (!video.srcObject) return alert("Webcam is not running!");
    document.getElementById('pose-result-card').classList.remove('hidden'); document.getElementById('pose-result-text').innerText = "Snapping a frame and sending to AI Coach... 📸🤖";
    const captureCanvas = document.createElement('canvas'); captureCanvas.width = video.videoWidth; captureCanvas.height = video.videoHeight;
    captureCanvas.getContext('2d').drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    try {
        const res = await fetch('/api/pose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: captureCanvas.toDataURL('image/jpeg') }) });
        const replyText = (await res.json()).reply; document.getElementById('pose-result-text').innerHTML = replyText;
        if(typeof speakAIResponse === "function") speakAIResponse(replyText);
    } catch (error) { document.getElementById('pose-result-text').innerText = "Error analyzing frame."; }
}