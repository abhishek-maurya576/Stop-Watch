const loadingIndicator = document.querySelector('.loading-indicator');

function showLoading() {
	loadingIndicator.classList.add('active');
}

function hideLoading() {
	loadingIndicator.classList.remove('active');
}

let startTime;
let elapsedTime = 0;
let timerInterval;
let isRunning = false;
let lapCount = 1;
let splits = [];
let currentSessionId = null;
let clockRadius = 90;
let centerX = 100;
let centerY = 100;

// API functions
async function saveSession(duration) {
	try {
		showLoading();
		const response = await fetch('http://localhost:3000/api/sessions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				duration: Math.floor(duration),
				notes: ''
			})
		});
		const data = await response.json();
		await loadSessionHistory(); // Reload history after saving
		return data.id;
	} catch (error) {
		console.error('Error saving session:', error);
		return null;
	} finally {
		hideLoading();
	}
}

async function saveLap(lapTime, lapNumber) {
	if (!currentSessionId) return;
	try {
		await fetch('http://localhost:3000/api/laps', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				session_id: currentSessionId,
				lap_time: lapTime,
				lap_number: lapNumber
			})
		});
	} catch (error) {
		console.error('Error saving lap:', error);
	}
}

const display = document.querySelector('.display');
const msDisplay = document.querySelector('.milliseconds');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const lapBtn = document.getElementById('lapBtn');
const lapList = document.getElementById('lapList');
const canvas = document.getElementById('clockCanvas');
const ctx = canvas.getContext('2d');

function updateCanvasSize() {
	const computedStyle = window.getComputedStyle(canvas);
	const width = parseInt(computedStyle.width);
	const height = parseInt(computedStyle.height);
	
	// Update canvas dimensions to match CSS size
	canvas.width = width;
	canvas.height = height;
	
	// Update clock radius based on canvas size
	clockRadius = Math.min(width, height) * 0.45;
	
	// Update center coordinates
	centerX = width / 2;
	centerY = height / 2;
}

function formatMainTime(ms) {
	const date = new Date(ms);
	return date.toISOString().substr(14, 8);
}

function formatMilliseconds(ms) {
	return (ms % 1000).toString().padStart(3, '0');
}

function drawClock() {
	updateCanvasSize();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	// Draw outer ring with 3D effect
	ctx.beginPath();
	ctx.arc(centerX, centerY, clockRadius + 5, 0, 2 * Math.PI);
	const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	gradient.addColorStop(0, '#ffeb99');
	gradient.addColorStop(1, '#ffd633');
	ctx.fillStyle = gradient;
	ctx.fill();
	
	// Draw main clock face
	ctx.beginPath();
	ctx.arc(centerX, centerY, clockRadius, 0, 2 * Math.PI);
	const faceGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, clockRadius);
	faceGradient.addColorStop(0, '#ffffff');
	faceGradient.addColorStop(1, '#f0f0f0');
	ctx.fillStyle = faceGradient;
	ctx.fill();

	// Draw hour markers
	for (let i = 0; i < 60; i++) {
		const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
		const isHour = i % 5 === 0;
		const markerLength = isHour ? clockRadius * 0.15 : clockRadius * 0.05;
		const innerRadius = clockRadius - markerLength;
		
		ctx.beginPath();
		ctx.moveTo(
			centerX + innerRadius * Math.cos(angle),
			centerY + innerRadius * Math.sin(angle)
		);
		ctx.lineTo(
			centerX + (clockRadius - 2) * Math.cos(angle),
			centerY + (clockRadius - 2) * Math.sin(angle)
		);
		ctx.strokeStyle = isHour ? '#333' : '#666';
		ctx.lineWidth = isHour ? clockRadius * 0.03 : clockRadius * 0.01;
		ctx.stroke();
	}

	// Draw progress arc
	const seconds = (elapsedTime / 1000) % 60;
	const progress = seconds / 60;
	
	ctx.beginPath();
	ctx.arc(centerX, centerY, clockRadius - clockRadius * 0.1, -Math.PI / 2, (progress * 2 * Math.PI) - Math.PI / 2);
	ctx.strokeStyle = '#ff4d4d';
	ctx.lineWidth = clockRadius * 0.08;
	ctx.lineCap = 'round';
	ctx.stroke();

	// Draw milliseconds arc
	const ms = elapsedTime % 1000;
	const msProgress = ms / 1000;
	ctx.beginPath();
	ctx.arc(centerX, centerY, clockRadius - clockRadius * 0.2, -Math.PI / 2, (msProgress * 2 * Math.PI) - Math.PI / 2);
	ctx.strokeStyle = '#ffcc00';
	ctx.lineWidth = clockRadius * 0.03;
	ctx.stroke();

	// Draw center piece
	const centerSize = clockRadius * 0.08;
	ctx.beginPath();
	ctx.arc(centerX, centerY, centerSize, 0, 2 * Math.PI);
	const centerGradient = ctx.createRadialGradient(
		centerX - centerSize * 0.3, 
		centerY - centerSize * 0.3, 
		0,
		centerX, 
		centerY, 
		centerSize
	);
	centerGradient.addColorStop(0, '#ffffff');
	centerGradient.addColorStop(1, '#333333');
	ctx.fillStyle = centerGradient;
	ctx.fill();
}

function updateDisplay() {
	display.textContent = formatMainTime(elapsedTime);
	msDisplay.textContent = formatMilliseconds(elapsedTime);
	drawClock();
}

function startStop() {
	if (!isRunning) {
		isRunning = true;
		startBtn.textContent = 'Stop';
		startTime = Date.now() - elapsedTime;
		timerInterval = setInterval(() => {
			elapsedTime = Date.now() - startTime;
			updateDisplay();
		}, 16);
		if (!currentSessionId) {
			saveSession(0).then(id => {
				if (id) currentSessionId = id;
			});
		}
	} else {
		isRunning = false;
		startBtn.textContent = 'Start';
		clearInterval(timerInterval);
		if (currentSessionId) {
			saveSession(elapsedTime);
		}
	}
}


function reset() {
	clearInterval(timerInterval);
	isRunning = false;
	startBtn.textContent = 'Start';
	elapsedTime = 0;
	splits = [];
	currentSessionId = null;
	updateDisplay();
	lapList.innerHTML = '';
	lapCount = 1;
	loadSessionHistory();
}

function lap() {
	if (isRunning) {
		const li = document.createElement('li');
		const splitTime = formatMainTime(elapsedTime);
		const splitMs = formatMilliseconds(elapsedTime);
		splits.push(elapsedTime);
		
		let splitDiff = '';
		if (splits.length > 1) {
			const diff = elapsedTime - splits[splits.length - 2];
			const diffTime = formatMainTime(diff);
			const diffMs = formatMilliseconds(diff);
			splitDiff = `<span class="split-diff">(+${diffTime}.${diffMs})</span>`;
		}
		
		li.innerHTML = `
			<span>Split ${lapCount}</span>
			<span>${splitTime}.${splitMs} ${splitDiff}</span>
		`;
		lapList.insertBefore(li, lapList.firstChild);
		
		// Save lap to backend
		saveLap(elapsedTime, lapCount);
		
		lapCount++;
	}
}

startBtn.addEventListener('click', startStop);
resetBtn.addEventListener('click', reset);
lapBtn.addEventListener('click', lap);

// Add history functions
async function loadSessionHistory() {
	try {
		showLoading();
		const response = await fetch('http://localhost:3000/api/sessions');
		const sessions = await response.json();
		displaySessions(sessions);
	} catch (error) {
		console.error('Error loading sessions:', error);
		const sessionsList = document.getElementById('sessionsList');
		sessionsList.innerHTML = '<div class="error-message">Failed to load sessions</div>';
	} finally {
		hideLoading();
	}
}

async function loadSessionLaps(sessionId) {
	try {
		const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}/laps`);
		const laps = await response.json();
		return laps;
	} catch (error) {
		console.error('Error loading laps:', error);
		return [];
	}
}

function displaySessions(sessions) {
	const sessionsList = document.getElementById('sessionsList');
	sessionsList.innerHTML = '';

	sessions.forEach(session => {
		const sessionItem = document.createElement('div');
		sessionItem.className = 'session-item';
		
		const date = new Date(session.start_time);
		const duration = parseInt(session.duration) || 0;
		const formattedTime = formatMainTime(duration);
		const formattedMs = formatMilliseconds(duration);

		sessionItem.innerHTML = `
			<div class="session-header">
				<div class="session-info">
					<span class="time">${formattedTime}.${formattedMs}</span>
					<span class="date">${date.toLocaleString()}</span>
				</div>
			</div>
			<div class="session-laps"></div>
		`;

		sessionItem.addEventListener('click', async () => {
			const wasActive = sessionItem.classList.contains('active');
			document.querySelectorAll('.session-item.active').forEach(item => {
				if (item !== sessionItem) {
					item.classList.remove('active');
				}
			});
			
			if (!wasActive) {
				sessionItem.classList.add('active');
				const lapsContainer = sessionItem.querySelector('.session-laps');
				const laps = await loadSessionLaps(session.id);
				if (laps.length > 0) {
					lapsContainer.innerHTML = laps.map(lap => `
						<div class="lap-item">
							<span>Lap ${lap.lap_number}</span>
							<span>${formatMainTime(lap.lap_time)}.${formatMilliseconds(lap.lap_time)}</span>
						</div>
					`).join('');
				} else {
					lapsContainer.innerHTML = '<div class="no-laps">No laps recorded</div>';
				}
			} else {
				sessionItem.classList.remove('active');
			}
		});

		sessionsList.appendChild(sessionItem);
	});
}


// Load history when page loads
document.addEventListener('DOMContentLoaded', loadSessionHistory);

// Add error message style
const style = document.createElement('style');
style.textContent = `
	.error-message {
		color: #ff4d4d;
		text-align: center;
		padding: 1rem;
		font-style: italic;
	}
`;
document.head.appendChild(style);

// Add resize observer for better responsiveness
const resizeObserver = new ResizeObserver(entries => {
	for (const entry of entries) {
		if (entry.target === canvas) {
			drawClock();
			break;
		}
	}
});

// Start observing the canvas
resizeObserver.observe(canvas);

// Initial setup
updateCanvasSize();
drawClock();
updateDisplay();