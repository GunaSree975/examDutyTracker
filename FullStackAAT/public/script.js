// Firebase Configuration (Replace with your own config)
const firebaseConfig = {
    apiKey: "AIzaSyDAylhKhr32uzJshRHZ6kDVtshrfce6vl4",
    authDomain: "fullstackaat.firebaseapp.com",
    projectId: "fullstackaat",
    storageBucket: "fullstackaat.firebasestorage.app",
    messagingSenderId: "368877724625",
    appId: "1:368877724625:web:fdb4dffb739faee1a836f0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// UI Sections
const landingPage = document.getElementById('landingPage');
const authPage = document.getElementById('authPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const userProfile = document.getElementById('userProfile');
const userNameDisplay = document.getElementById('userNameDisplay');
const facultyNameInput = document.getElementById('facultyNameInput');
const uploadStatus = document.getElementById('uploadStatus');
const parsedUploadResults = document.getElementById('parsedUploadResults');
const uploadFileCount = document.getElementById('uploadFileCount');
const uploadFileList = document.getElementById('uploadFileList');
const uploadNowBtn = document.getElementById('uploadNowBtn');
const clearUploadQueueBtn = document.getElementById('clearUploadQueueBtn');
let globalFacultyName = ""; // Global reference for the logged-in user
let pendingUploadFiles = [];
const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const renderSelectedFiles = (files) => {
    if (!files.length) {
        uploadFileList.innerHTML = '';
        uploadFileList.classList.add('hidden');
        uploadFileCount.innerText = 'No files selected';
        uploadNowBtn.disabled = true;
        clearUploadQueueBtn.disabled = true;
        return;
    }
    uploadFileCount.innerText = `Selected: ${files.length} file(s)`;
    uploadNowBtn.disabled = false;
    clearUploadQueueBtn.disabled = false;
    uploadFileList.innerHTML = files.map((file) => {
        const size = formatFileSize(file.size);
        const key = fileKey(file);
        return `
            <li>
                <span class="upload-file-name" title="${file.name} (${size})">${file.name} - ${size}</span>
                <button class="file-remove-btn" data-file-key="${key}" title="Remove file">x</button>
            </li>
        `;
    }).join('');
    uploadFileList.classList.remove('hidden');
};

// Auth State Observer
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in - Show Dashboard
        landingPage.classList.add('hidden');
        authPage.classList.add('hidden');
        dashboardPage.classList.remove('hidden');
        userProfile.classList.remove('hidden');
        
        const displayName = user.displayName || user.email.split('@')[0];
        userNameDisplay.innerText = displayName;
        globalFacultyName = displayName; // Set the global name
        
        // Auto-fill and fetch duties
        facultyNameInput.value = globalFacultyName;
        fetchDuties();
    } else {
        // User is signed out - Show Landing
        landingPage.classList.remove('hidden');
        authPage.classList.add('hidden');
        dashboardPage.classList.add('hidden');
        userProfile.classList.add('hidden');
    }
});

// Portal Navigation
document.getElementById('gotoLogin').addEventListener('click', () => {
    landingPage.classList.add('hidden');
    authPage.classList.remove('hidden');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
});

document.getElementById('gotoSignup').addEventListener('click', () => {
    landingPage.classList.add('hidden');
    authPage.classList.remove('hidden');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

// Back to Home
document.querySelectorAll('.back-to-home').forEach(btn => {
    btn.addEventListener('click', () => {
        authPage.classList.add('hidden');
        landingPage.classList.remove('hidden');
    });
});

// Toggle between Login and Signup (on Auth Page)
document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Login Logic
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value.trim().toLowerCase();
    const password = document.getElementById('passwordInput').value;
    console.log("Attempting login for:", email);

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            alert("Invalid login credentials. Please check your email/password or register first.");
            return;
        }
        alert(`Login failed: ${error.message}`);
    }
});

// Signup Logic
document.getElementById('signupBtn').addEventListener('click', async () => {
    const name = document.getElementById('regNameInput').value.trim();
    const email = document.getElementById('regEmailInput').value.trim().toLowerCase();
    const password = document.getElementById('regPasswordInput').value;
    const signupBtn = document.getElementById('signupBtn');

    if (!name || !email || !password) {
        alert("Please fill name, email and password.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    signupBtn.disabled = true;
    signupBtn.innerText = 'Registering...';
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        alert("Registration successful. You are now signed in.");
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            alert("This email is already registered. Please sign in.");
        } else if (error.code === 'auth/invalid-email') {
            alert("Please enter a valid email address.");
        } else if (error.code === 'auth/weak-password') {
            alert("Password is too weak. Use at least 6 characters.");
        } else if (error.code === 'auth/operation-not-allowed') {
            alert("Email/password sign-up is not enabled in Firebase Console.");
        } else if (error.code === 'auth/unauthorized-domain') {
            alert("This domain is not authorized in Firebase Authentication settings.");
        } else {
            alert("Registration failed: " + error.message);
        }
        console.error("Registration failed:", error);
    } finally {
        signupBtn.disabled = false;
        signupBtn.innerText = 'Register';
    }
});

// Logout Logic
window.toggleCompletion = async (dutyId) => {
    console.log("Toggling completion for duty:", dutyId);
    try {
        const response = await fetch(`/api/duties/${dutyId}/complete`, {
            method: 'PATCH'
        });
        console.log("Response status:", response.status);
        if (response.ok) {
            console.log("Toggle successful, refreshing...");
            await fetchDuties(); 
        } else {
            const error = await response.text();
            console.error("Toggle failed:", error);
        }
    } catch (error) {
        console.error('Error toggling completion:', error);
    }
};

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut();
});

// Existing functionality updated
document.getElementById('pdfUpload').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const existingMap = new Map(pendingUploadFiles.map((f) => [fileKey(f), f]));
    files.forEach((f) => {
        const key = fileKey(f);
        existingMap.set(key, f);
    });
    pendingUploadFiles = Array.from(existingMap.values());
    renderSelectedFiles(pendingUploadFiles);
    e.target.value = '';
});

uploadFileList.addEventListener('click', (e) => {
    const btn = e.target.closest('.file-remove-btn');
    if (!btn) return;
    const key = btn.dataset.fileKey;
    pendingUploadFiles = pendingUploadFiles.filter((file) => fileKey(file) !== key);
    renderSelectedFiles(pendingUploadFiles);
});

clearUploadQueueBtn.addEventListener('click', () => {
    pendingUploadFiles = [];
    renderSelectedFiles([]);
});

uploadNowBtn.addEventListener('click', async () => {
    if (!pendingUploadFiles.length) return;

    // Clear last upload's parsed details (show only current upload)
    parsedUploadResults.classList.add('hidden');
    parsedUploadResults.innerHTML = '';

    const formData = new FormData();
    pendingUploadFiles.forEach((file) => formData.append('pdf', file));

    uploadNowBtn.disabled = true;
    const statusText = document.getElementById('uploadStatus');
    statusText.classList.remove('hidden');
    statusText.innerText = `Parsing ${pendingUploadFiles.length} file(s)... wait a moment.`;
    statusText.style.color = 'var(--text-muted)';

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            const parsedCount = Number(result.count || 0);
            const fileCount = Number(result.filesProcessed || pendingUploadFiles.length);
            statusText.innerHTML = '';
            const header = document.createElement('div');
            header.innerText = `Success! Parsed ${parsedCount} duty entr${parsedCount === 1 ? 'y' : 'ies'} from ${fileCount} file(s). Queue is kept until you remove files.`;
            statusText.appendChild(header);

            if (Array.isArray(result.fileResults) && result.fileResults.length) {
                const fileDetails = document.createElement('details');
                const sum = document.createElement('summary');
                sum.innerText = 'Per-file results';
                fileDetails.appendChild(sum);
                const ul = document.createElement('ul');
                ul.style.margin = '0.75rem 0 0';
                ul.style.paddingLeft = '1.25rem';
                result.fileResults.forEach((fr) => {
                    const li = document.createElement('li');
                    li.innerText = `${fr.fileName} (${fr.fileType}): ${fr.parsedCount} entr${fr.parsedCount === 1 ? 'y' : 'ies'}`;
                    ul.appendChild(li);
                });
                fileDetails.appendChild(ul);
                statusText.appendChild(fileDetails);
            }

            // Show parsed duty details (this upload) with date/time/venue/type.
            if (Array.isArray(result.preview) && result.preview.length) {
                parsedUploadResults.classList.remove('hidden');
                const title = document.createElement('h3');
                title.innerText = 'Parsed duties (this upload)';
                parsedUploadResults.appendChild(title);

                const ul = document.createElement('ul');
                result.preview.forEach((d) => {
                    const li = document.createElement('li');
                    const dateStr = d.exam_date ? new Date(d.exam_date).toLocaleDateString('en-GB') : '';
                    const timeStr = d.exam_time ? String(d.exam_time) : '';
                    li.innerText = `${d.faculty_name || '(no name)'} — ${d.exam_name || 'Exam Duty'} — ${dateStr} ${timeStr} — ${d.venue || ''}`;
                    ul.appendChild(li);
                });
                parsedUploadResults.appendChild(ul);
            } else {
                parsedUploadResults.classList.remove('hidden');
                parsedUploadResults.innerHTML = '<h3>Parsed duties (this upload)</h3><div style="color: var(--text-muted);">No duty rows were extracted to display.</div>';
            }

            statusText.style.color = 'var(--accent)';
            uploadNowBtn.disabled = false;
            fetchDuties(); // Refresh list
        } else {
            statusText.innerText = (result.error || 'Error') + (result.details ? ': ' + result.details : '');
            statusText.style.color = 'var(--danger)';
            uploadNowBtn.disabled = false;
        }
    } catch (error) {
        statusText.innerText = 'Server error. Please try again.';
        statusText.style.color = 'var(--danger)';
        uploadNowBtn.disabled = false;
    }
});

// Manual Parse Logic
document.getElementById('parseManualBtn').addEventListener('click', async () => {
    const text = document.getElementById('manualScheduleInput').value.trim();
    if (!text) return;

    const statusText = document.getElementById('uploadStatus');
    statusText.classList.remove('hidden');
    statusText.innerText = 'Parsing text...';
    statusText.style.color = 'var(--text-muted)';

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const result = await response.json();
        if (response.ok && result.count > 0) {
            statusText.innerText = `Success!`;
            statusText.style.color = 'var(--accent)';
            document.getElementById('manualScheduleInput').value = '';
            fetchDuties();
        } else {
            statusText.innerText = result.message || 'No duty info found in text.';
            statusText.style.color = 'var(--danger)';
        }
    } catch (error) {
        statusText.innerText = 'Error parsing text.';
        statusText.style.color = 'var(--danger)';
    }
});

document.getElementById('searchBtn').addEventListener('click', fetchDuties);
facultyNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchDuties();
});

document.getElementById('testNotifyBtn').addEventListener('click', () => {
    showToast("Exam Duty Reminder!", "This is a demo notification. Your duty (e.g., Computer Science) would start in exactly 1 hour!");
});

const renderStats = (duties) => {
    const total = duties.length;
    const dcsCount = duties.filter(d => d.exam_name.toLowerCase().includes('dcs')).length;
    const invCount = total - dcsCount;
    
    // Find next upcoming duty (including results for Today)
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    const upcoming = duties
        .filter(d => new Date(d.exam_date) >= now && !d.is_completed)
        .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0];

    document.getElementById('totalDuties').innerText = total;
    document.getElementById('dutyRatio').innerText = `${dcsCount}/${invCount}`;
    
    if (upcoming) {
        const uDate = new Date(upcoming.exam_date);
        document.getElementById('countdownDuty').innerText = uDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else {
        document.getElementById('countdownDuty').innerText = '--';
    }
};

async function fetchDuties() {
    const name = facultyNameInput.value.trim();
    console.log("Fetching duties for name:", name);
    if (!name) {
        console.warn("No name found to search.");
        return;
    }

    const list = document.getElementById('dutyList');
    list.innerHTML = '<div class="empty-state">Searching for duties...</div>';

    try {
        const url = `/api/duties/${encodeURIComponent(name)}`;
        console.log("Calling API:", url);
        const response = await fetch(url);
        if (!response.ok) {
            const backendMessage = await response.text();
            throw new Error(backendMessage || 'Failed to fetch duties');
        }
        const duties = await response.json();
        
        renderStats(duties); // Update Stats

        console.log("Duties received:", duties.length);

        if (duties.length === 0) {
            list.innerHTML = `<div class="empty-state">No duties found for "${name}".</div>`;
            return;
        }

        list.innerHTML = '';
        duties.forEach(duty => {
            const dateObj = new Date(duty.exam_date);
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

            let timeStr = duty.exam_time;
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':');
                const hr = parseInt(hours);
                const ampm = hr >= 12 ? 'PM' : 'AM';
                const formattedHr = hr % 12 || 12;
                timeStr = `${formattedHr}:${minutes} ${ampm}`;
            }

            const now = new Date();
            const dutyTime = new Date(duty.exam_date);
            const timeParts = (duty.exam_time || "09:00").split(':');
            dutyTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1] || "0"), 0, 0);

            const diffMs = dutyTime - now;
            const diffHours = diffMs / (1000 * 60 * 60);
            
            const card = document.createElement('div');
            card.className = `duty-card ${duty.is_completed ? 'completed' : ''}`;
            
            if (diffHours > 0 && diffHours < 24 && !duty.is_completed) {
                card.classList.add('urgent');
            }

            card.innerHTML = `
                <h3>${duty.exam_name}</h3>
                <div class="duty-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>${dateStr}</span>
                </div>
                <div class="duty-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>${timeStr}</span>
                </div>
                <div class="duty-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>${duty.venue}</span>
                </div>
                <div class="btn-container"></div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 10px; text-align: right; opacity: 0.6;">
                    Sync: ${new Date(duty.last_updated).toLocaleTimeString()}
                </div>
            `;

            // Only show "Mark as Done" if viewing OWN duties
            if (name === globalFacultyName) {
                const btnContainer = card.querySelector('.btn-container');
                const doneBtn = document.createElement('button');
                doneBtn.className = `done-btn ${duty.is_completed ? 'completed' : ''}`;
                doneBtn.innerText = duty.is_completed ? '✅ Completed' : 'Mark as Done';
                doneBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleCompletion(duty._id);
                });
                btnContainer.appendChild(doneBtn);
            }

            list.appendChild(card);
        });

    } catch (error) {
        console.error("Fetch duties failed:", error);
        list.innerHTML = `<div class="empty-state">${error.message || 'Error fetching data.'}</div>`;
    } finally {
        checkUpcomingDuties();
    }
}

async function checkUpcomingDuties() {
    const name = facultyNameInput.value.trim();
    if (!name) return;

    try {
        const response = await fetch(`/api/duties/${encodeURIComponent(name)}`);
        if (!response.ok) return;
        const duties = await response.json();

        const now = new Date();
        duties.forEach(duty => {
            const dutyTime = new Date(duty.exam_date);
            const timeParts = (duty.exam_time || "09:00").split(':');
            dutyTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1] || "0"), 0, 0);

            const diffMs = dutyTime - now;
            const diffMins = Math.round(diffMs / (1000 * 60));

            // Notify exactly 1 hour prior (range 55-65 mins for reliability)
            const isWithinNotificationWindow = diffMins >= 55 && diffMins <= 60;
            const isCorrectDay = dutyTime.toDateString() === now.toDateString();

            if (isCorrectDay && isWithinNotificationWindow && !duty.notified) {
                showToast(`Exam Duty Starting Soon!`, `${duty.exam_name} starts in ${diffMins} mins at ${duty.venue}.`);
                duty.notified = true; // Local session flag

                if (Notification.permission === "granted") {
                    new Notification(`Duty Reminder: ${duty.exam_name}`, {
                        body: `Starting in approximately ${diffMins} minutes at ${duty.venue}.`,
                    });
                }
            }
        });
    } catch (e) {
        console.error("Real-time check failed:", e);
    }
}

setInterval(checkUpcomingDuties, 60000); // Check every minute

function showToast(title, msg) {
    const toast = document.getElementById('notificationToast');
    document.getElementById('toastTitle').innerText = title;
    document.getElementById('toastMsg').innerText = msg;

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 10000);
}

if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission();
}
