/* ========================================================================== 
   Zoom integration flow — latest approved thirteen-case prototype

   Product content and behaviour: Case-wise ASCII Screen Designs.md
   Visual tokens and components: Mentor Union Design Schema
   Spatial reference: screenshots embedded in the updated-screen-content DOCX
   ========================================================================== */
(function () {
  'use strict';

  var LOGO = 'assets/logo-on-dark.svg';
  var S = {
    mentee_first_name: 'Ananya',
    mentee_name: 'Ananya Rao',
    mentor_first_name: 'Vikram',
    mentor_name: 'Vikram Mehta',
    session_agenda: 'Moving from analytics into product management',
    session_date: 'Tuesday, 18 August 2026',
    scheduled_time: '6:30 PM',
    timezone: 'IST (GMT+5:30)',
    join_deadline: '6:37 PM',
    mentee_join_time: '6:26 PM',
    mentor_join_time: '6:27 PM',
    outcome_update_window: 'within 24 hours',
    support_deadline: '20 August 2026, 6:30 PM',
    time_until_start_seconds: 277,
    waiting_pre_seconds: 100,
    waiting_deadline_seconds: 297,
    transition_seconds: 10
  };

  var DEVICE_BASE = {
    camera: ['Integrated webcam (built-in)', 'Logitech C920 HD Pro'],
    microphone: ['Internal microphone (built-in)', 'AirPods Pro'],
    speaker: ['Internal speakers (built-in)', 'AirPods Pro']
  };
  var DEVICE_REFRESHED = {
    camera: ['Integrated webcam (built-in)', 'Logitech C920 HD Pro', 'Elgato Cam Link'],
    microphone: ['Internal microphone (built-in)', 'AirPods Pro', 'Jabra Evolve2 65'],
    speaker: ['Internal speakers (built-in)', 'AirPods Pro', 'Jabra Evolve2 65']
  };

  function blankFeedback() {
    return { ratings: {}, comment: '', status: 'idle' };
  }

  function freshState() {
    return {
      microphone: true,
      camera: true,
      devices: { camera: 0, microphone: 0, speaker: 0 },
      devicesRefreshed: false,
      refreshing: false,
      micTest: 'idle',
      speakerTest: 'idle',
      joinStatus: 'idle',
      waitPhase: 'after',
      sharing: false,
      chatOpen: false,
      chatDraft: '',
      messages: [],
      feedbackRole: 'mentee',
      feedback: { c11: blankFeedback(), c12: blankFeedback(), c13: blankFeedback() },
      bridgeRole: 'mentee',
      participantRole: 'mentee',
      waitingMissing: 'mentor',
      earlyExitPrompt: true,
      endLabel: '',
      endMessage: ''
    };
  }

  var state = freshState();
  var currentCase = null;
  var failNext = false;
  var dockOpen = false;
  var timer = null;
  var timerState = null;
  var narrow = window.matchMedia('(max-width: 700px)');

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function icon(name) {
    var paths = {
      microphone: '<path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
      microphoneOff: '<path d="m3 3 18 18M9 9v3a3 3 0 0 0 4.6 2.5M15 10.5V6a3 3 0 0 0-5.7-1.3M5 11a7 7 0 0 0 10.5 6M19 11a7 7 0 0 1-.7 3M12 18v3"/>',
      camera: '<path d="M15.5 10.5 21 7v10l-5.5-3.5Z"/><rect x="3" y="6" width="12.5" height="12" rx="2"/>',
      cameraOff: '<path d="m3 3 18 18M15.5 10.5 21 7v10l-3-1.9M13 6h.5a2 2 0 0 1 2 2v.5M15.5 15.4a2 2 0 0 1-2 2.6H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1.2"/>',
      speaker: '<path d="M11 5 6.5 9H3v6h3.5L11 19V5ZM15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
      refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1M20.5 4v5h-5"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
      chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z"/>',
      share: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4M12 13V8m0 0-2.2 2.2M12 8l2.2 2.2"/>',
      leave: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.7h.01"/>',
      alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.2M12 16.3h.01"/>',
      check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      send: '<path d="M4 12 20 4l-6 16-2.6-6.4L4 12Z"/>',
      session: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
  }

  function initials(name) {
    return name.split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  function announce(message) {
    var live = document.getElementById('live');
    live.textContent = '';
    window.setTimeout(function () { live.textContent = message; }, 20);
  }

  function mmss(seconds) {
    seconds = Math.max(0, seconds);
    var minutes = Math.floor(seconds / 60);
    var remainder = seconds % 60;
    return minutes + ':' + (remainder < 10 ? '0' + remainder : remainder);
  }

  var ROUTES = {
    '/': { harness: true, label: 'Case index' },
    '/c01/welcome': { caseId: '01', role: 'mentee', label: 'Case 01 · Screen 1 — Mentee welcome', bar: false },
    '/c01/device': { caseId: '01', role: 'mentee', label: 'Case 01 · Screen 2 — Mentee device check', bar: true },
    '/c02/waiting': { caseId: '02', role: 'mentee', label: 'Case 02 · Screen 1 — Waiting for the mentor', bar: true },
    '/c03/waiting-complete': { caseId: '03', role: 'both', label: 'Case 03 · Screen 1 — Waiting-complete transition', bar: true },
    '/c04/outcome': { caseId: '04', role: 'mentee', label: 'Case 04 · Screen 1 — Mentee no-start outcome', bar: true },
    '/c05/welcome': { caseId: '05', role: 'mentor', label: 'Case 05 · Screen 1 — Mentor welcome', bar: false },
    '/c05/device': { caseId: '05', role: 'mentor', label: 'Case 05 · Screen 2 — Mentor device check', bar: true },
    '/c06/outcome': { caseId: '06', role: 'mentor', label: 'Case 06 · Screen 1 — Mentee did not join', bar: true },
    '/c07/expired': { caseId: '07', role: 'both', label: 'Case 07 · Screen 1 — Meeting over and attendance recorded', bar: true },
    '/c08/session': { caseId: '08', role: 'both', label: 'Case 08 · Screen 1 — Confirm early exit', bar: true },
    '/c09/acknowledgement': { caseId: '09', role: 'mentee', label: 'Case 09 · Screen 1 — Thank you to the mentee', bar: true },
    '/c10/acknowledgement': { caseId: '10', role: 'mentor', label: 'Case 10 · Screen 1 — Thank you to the mentor', bar: true },
    '/c11/reflection': { caseId: '11', role: 'mentee', label: 'Case 11 · Screen 1 — Mentee session reflection', bar: false },
    '/c12/reflection': { caseId: '12', role: 'mentor', label: 'Case 12 · Screen 1 — Mentor session reflection', bar: false },
    '/c13/experience': { caseId: '13', role: 'both', label: 'Case 13 · Screen 1 — MentorUnion and Zoom experience', bar: false },
    '/bridge': { harness: true, label: 'Prototype bridge — in-session' },
    '/end': { harness: true, label: 'Prototype — flow complete' }
  };

  var CASE_START = {
    '01': '/c01/welcome', '02': '/c02/waiting', '03': '/c03/waiting-complete', '04': '/c04/outcome',
    '05': '/c05/welcome', '06': '/c06/outcome', '07': '/c07/expired', '08': '/c08/session',
    '09': '/c09/acknowledgement', '10': '/c10/acknowledgement', '11': '/c11/reflection',
    '12': '/c12/reflection', '13': '/c13/experience'
  };

  function route() {
    var hash = location.hash.replace(/^#/, '');
    return ROUTES[hash] ? hash : '/';
  }

  function go(next) {
    if (route() === next) { render(); return; }
    location.hash = '#' + next;
  }

  function openCase(next, variant) {
    stopTimer();
    state = freshState();
    if (variant === 'pre') { state.waitPhase = 'pre'; }
    if (variant === 'mentor' || variant === 'mentee') {
      state.participantRole = variant;
      state.bridgeRole = variant;
    }
    if (variant === 'mentor-missing' || variant === 'mentee-missing') {
      state.waitingMissing = variant === 'mentor-missing' ? 'mentor' : 'mentee';
      state.participantRole = state.waitingMissing === 'mentor' ? 'mentee' : 'mentor';
    }
    currentCase = ROUTES[next].caseId || null;
    if (route() === next) {
      render();
      startRouteTimer();
    } else {
      location.hash = '#' + next;
    }
  }

  function logo(className) {
    return '<img class="' + className + '" src="' + LOGO + '" width="219" height="59" alt="Mentor Union">';
  }

  function welcomeScreen(role) {
    var mentee = role === 'mentee';
    var heading = 'Welcome, ' + (mentee ? S.mentee_first_name : S.mentor_first_name);
    var counterpart = mentee ? S.mentor_name : S.mentee_name;
    var listTitle = mentee ? 'Make the most of your session' : 'Help the mentee leave with clarity';
    var items = mentee ? [
      'Bring one clear outcome instead of several unrelated questions.',
      'Share relevant context, what you tried and where you are stuck.',
      'Stay with the booked agenda, listen actively and ask for clarity.',
      "Treat the mentor's guidance as perspective, not a promised result.",
      'Use the final five minutes to agree clear next steps.'
    ] : [
      'Confirm one primary outcome and stay with the booked agenda.',
      'Listen actively and ask questions before offering advice.',
      "Keep guidance practical and relevant to the mentee's context.",
      'Frame guidance as perspective, not a guarantee, promise or referral.',
      'Use the final five minutes to agree clear next steps.'
    ];
    var closing = mentee
      ? 'You do not need every answer. Bring an honest goal and be ready to turn the conversation into action.'
      : 'A useful session does not need to solve everything. It should help the mentee make a better decision or take a clear next action.';
    var timing = mentee
      ? '<div class="session-timing"><span>Starts at <strong>' + esc(S.scheduled_time) + '</strong> | ' + esc(S.timezone) + '</span>' +
        '<span>Session begins in <strong id="cd-num">' + mmss(S.time_until_start_seconds) + '</strong></span></div>'
      : '';

    return '<div class="welcome-wrap">' +
      '<section class="welcome-card card" aria-labelledby="welcome-title">' + logo('welcome-logo') +
      '<div class="welcome-heading"><h1 class="title" id="welcome-title">' + esc(heading) + '</h1>' +
      '<p class="subtitle">Your session with ' + esc(counterpart) + ' is coming up.</p>' +
      "<p class=\"welcome-focus\">Today's focus: <span class=\"text-strong\">" + esc(S.session_agenda) + '</span></p></div>' +
      timing +
      '<div class="stack-sm"><h2 class="section-title">' + esc(listTitle) + '</h2>' +
      '<ol class="guide">' + items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ol></div>' +
      '<p class="body-copy">' + esc(closing) + '</p>' +
      '<button class="btn primary full" type="button" data-action="go" data-route="' + (mentee ? '/c01/device' : '/c05/device') + '">Continue to device check</button>' +
      '</section></div>';
  }

  function deviceSelect(key, label) {
    var devices = state.devicesRefreshed ? DEVICE_REFRESHED : DEVICE_BASE;
    var options = devices[key].map(function (device, index) {
      return '<option value="' + index + '"' + (state.devices[key] === index ? ' selected' : '') + '>' + esc(device) + '</option>';
    }).join('');
    return '<div class="field"><label class="field-label" for="device-' + key + '">' + esc(label) + '</label>' +
      '<select id="device-' + key + '" data-field="device" data-device="' + key + '"' + (state.refreshing ? ' disabled' : '') + '>' + options + '</select></div>';
  }

  function deviceScreen(role) {
    var mentee = role === 'mentee';
    var counterpart = mentee ? S.mentor_name : S.mentee_name;
    var joiningAs = mentee ? S.mentee_name : S.mentor_name;
    var tips = mentee ? [
      'Use headphones when possible.',
      'Join from a quiet place with a stable connection.',
      'Keep your goal and questions nearby.'
    ] : [
      "Review the mentee's goal and relevant profile context.",
      'Use headphones and join from a quiet place.',
      'Keep enough time at the end to agree clear next steps.'
    ];
    var testStatus = '';
    if (state.micTest === 'running') {
      testStatus = '<div class="test-status" role="status"><span class="level-bars"><i></i><i></i><i></i><i></i></span>Testing microphone — say something</div>';
    } else if (state.micTest === 'done') {
      testStatus = '<div class="test-status" role="status">' + icon('check') + 'Your microphone picked up sound</div>';
    }
    var joining = state.joinStatus === 'joining';

    return '<div class="screen"><div class="prejoin-layout">' +
      '<section class="prejoin-stage" aria-label="Camera and audio check">' +
      '<div class="camera-preview"><span class="camera-avatar">' + esc(initials(joiningAs)) + '</span>' +
      '<span class="camera-label">' + (state.camera ? 'Camera preview' : 'Camera off') + '</span>' +
      '<div class="preview-controls">' +
      '<button class="media-button' + (state.microphone ? '' : ' off') + '" type="button" data-action="toggle-microphone" aria-pressed="' + state.microphone + '" aria-label="Turn microphone ' + (state.microphone ? 'off' : 'on') + '">' + (state.microphone ? icon('microphone') : icon('microphoneOff')) + '<span>Microphone ' + (state.microphone ? 'on' : 'off') + '</span></button>' +
      '<button class="media-button' + (state.camera ? '' : ' off') + '" type="button" data-action="toggle-camera" aria-pressed="' + state.camera + '" aria-label="Turn camera ' + (state.camera ? 'off' : 'on') + '">' + (state.camera ? icon('camera') : icon('cameraOff')) + '<span>Camera ' + (state.camera ? 'on' : 'off') + '</span></button>' +
      '</div></div>' +
      '<div class="test-row">' +
      '<button class="btn tertiary" type="button" data-action="test-microphone" data-fk="test-microphone"' + (!state.microphone || state.micTest === 'running' ? ' disabled' : '') + '>' + (state.micTest === 'running' ? '<span class="spin"></span>' : icon('microphone')) + 'Test microphone</button>' +
      '<button class="btn tertiary" type="button" data-action="test-speaker" data-fk="test-speaker"' + (state.speakerTest === 'playing' ? ' disabled' : '') + '>' + (state.speakerTest === 'playing' ? '<span class="spin"></span>Playing test sound' : icon('speaker') + 'Test speaker') + '</button>' +
      '</div>' +
      (!state.microphone ? '<p class="fineprint" id="microphone-note">Turn the microphone on to test it.</p>' : '') + testStatus +
      '</section>' +

      '<section class="prejoin-card card" aria-labelledby="device-title">' +
      '<div class="prejoin-heading"><h1 class="title small" id="device-title">Ready for your session?</h1><p class="subtitle">Session with ' + esc(counterpart) + '</p></div>' +
      '<div class="identity"><span class="identity-label">Joining as</span><span class="identity-value">' + esc(joiningAs) + '</span></div>' +
      '<div class="stack-sm"><h2 class="section-title">Session details</h2><dl class="details">' +
      '<dt>Agenda</dt><dd>' + esc(S.session_agenda) + '</dd>' +
      '<dt>Date and time</dt><dd class="detail-stack"><span>' + esc(S.session_date) + ' · ' + esc(S.scheduled_time) + '</span><span>' + esc(S.timezone) + ' · 30 minutes</span></dd>' +
      '</dl></div>' +
      '<div class="stack-sm"><h2 class="section-title">Devices</h2><div class="device-grid">' +
      deviceSelect('camera', 'Camera') + deviceSelect('microphone', 'Microphone') + deviceSelect('speaker', 'Speaker') + '</div>' +
      '<div><button class="btn ghost" type="button" data-action="refresh-devices" data-fk="refresh-devices"' + (state.refreshing ? ' disabled aria-busy="true"' : '') + '>' +
      (state.refreshing ? '<span class="spin"></span>Refreshing devices…' : icon('refresh') + 'Refresh devices') + '</button></div></div>' +
      '<div class="stack-sm"><h2 class="section-title">Before you join</h2><ul class="tips">' + tips.map(function (tip) { return '<li>' + esc(tip) + '</li>'; }).join('') + '</ul></div>' +
      (state.joinStatus === 'error' ? '<div class="notice error" role="alert">' + icon('alert') + '<div><p class="notice-title">Could not join the session</p><p class="body-copy">Check your connection and try again.</p></div></div>' : '') +
      '<button class="btn primary full" type="button" data-action="join" data-fk="join"' + (joining ? ' disabled aria-busy="true"' : '') + '>' + (joining ? '<span class="spin"></span>Joining session…' : 'Join session') + '</button>' +
      '<div class="notice">' + icon('info') + '<div><h2 class="section-title">Mobile notice</h2><p class="fineprint">You can view a shared screen, but mobile browsers cannot start one. Use a supported desktop browser if you need to present.</p></div></div>' +
      '</section></div></div>';
  }

  function timerValue(fallback) {
    return timerState ? mmss(timerState.seconds) : mmss(fallback);
  }

  function waitingScreen() {
    var preStart = state.waitPhase === 'pre';
    var fallback = preStart ? S.waiting_pre_seconds : S.waiting_deadline_seconds;
    var chat = state.chatOpen ? '<section class="chat-panel card" aria-labelledby="chat-title">' +
      '<h2 class="section-title" id="chat-title">Chat</h2><div class="chat-log">' +
      (state.messages.length ? state.messages.map(function (message) { return '<div class="message">' + esc(message) + '</div>'; }).join('') : '<p class="chat-empty">No messages yet.</p>') +
      '</div><form class="chat-form" data-chat-form><label class="sr" for="chat-input">Message to ' + esc(S.mentor_name) + '</label>' +
      '<input id="chat-input" type="text" value="' + esc(state.chatDraft) + '" placeholder="Write a message" data-chat-input>' +
      '<button class="btn primary" type="submit" data-chat-send' + (state.chatDraft.trim() ? '' : ' disabled') + '>' + icon('send') + 'Send</button></form></section>' : '';

    return '<div class="screen"><div class="room-shell">' +
      '<div class="room-topline"><div class="room-copy"><h1 class="title small">Waiting for ' + esc(S.mentor_name) + '</h1>' +
      '<p class="lede">You joined successfully at ' + esc(S.mentee_join_time) + '.</p>' +
      '<p class="body-copy">' + esc(S.mentor_name) + ' can join until <span class="text-strong">' + esc(S.join_deadline) + '</span>. Stay on this screen until then so the full waiting period is recorded.</p></div>' +
      '<div class="timer-chip">' + icon('clock') + '<span id="cd-label">' + (preStart ? 'Time remaining until scheduled start' : 'Time remaining until join deadline') + '<strong id="cd-num">' + timerValue(fallback) + '</strong></span></div></div>' +
      '<div class="room-stage"><div class="waiting-person"><span class="camera-avatar">' + esc(initials(S.mentee_name)) + '</span><p>Waiting for mentor</p></div>' +
      '<span class="participant-chip">' + esc(S.mentee_name) + '</span></div>' +
      '<section class="wait-helper card"><div><h2 class="section-title">While you wait</h2><p class="body-copy">Review the outcome you want and keep your first question ready.</p></div>' +
      '<button class="btn ghost" type="button" data-action="leave-waiting">' + icon('leave') + 'Leave waiting room</button></section>' +
      '<div class="controlbar" aria-label="Waiting room controls">' +
      '<button class="btn tertiary media-state" type="button" data-action="toggle-microphone" aria-pressed="' + state.microphone + '">' + (state.microphone ? icon('microphone') : icon('microphoneOff')) + 'Microphone</button>' +
      '<button class="btn tertiary media-state" type="button" data-action="toggle-camera" aria-pressed="' + state.camera + '">' + (state.camera ? icon('camera') : icon('cameraOff')) + 'Camera</button>' +
      '<button class="btn tertiary" type="button" data-action="toggle-chat" aria-expanded="' + state.chatOpen + '">' + icon('chat') + 'Chat</button>' +
      '<button class="btn tertiary" type="button" data-action="toggle-share" aria-pressed="' + state.sharing + '"' + (narrow.matches ? ' disabled aria-describedby="share-note"' : '') + '>' + icon('share') + (state.sharing ? 'Stop sharing' : 'Share screen') + '</button></div>' +
      (narrow.matches ? '<p class="fineprint share-note" id="share-note">Mobile browsers cannot start a screen share.</p>' : '') +
      (state.sharing ? '<p class="fineprint share-note" role="status">You are sharing your screen.</p>' : '') + chat +
      '</div></div>';
  }

  function transitionCountdown(label) {
    var seconds = timerState ? timerState.seconds : S.transition_seconds;
    return '<div class="transition-status" role="status"><span>' + esc(label) + ' <strong id="cd-num" data-format="seconds">' + seconds + '</strong> seconds...</span></div>';
  }

  function waitingCompleteScreen() {
    var missingMentor = state.waitingMissing === 'mentor';
    var otherParticipant = missingMentor ? S.mentor_name : S.mentee_name;
    return '<div class="screen outcome-wrap"><section class="outcome-card card transition-card" aria-labelledby="waiting-complete-title">' +
      '<div class="outcome-heading"><span class="outcome-icon">' + icon('clock') + '</span><h1 class="title small" id="waiting-complete-title">The waiting time is over</h1>' +
      '<p class="subtitle">' + esc(otherParticipant) + ' did not join before ' + esc(S.join_deadline) + '.</p>' +
      '<p class="body-copy">The joining window has now closed.</p></div>' +
      '<p class="body-copy transition-copy">We will show the attendance status on the next screen.</p>' +
      transitionCountdown('Continuing in') + '</section></div>';
  }

  function acknowledgementScreen(role) {
    var mentee = role === 'mentee';
    var counterpart = mentee ? S.mentor_name : S.mentee_name;
    var heading = mentee ? 'Thank you for joining the session' : 'Thank you for hosting the session';
    var closing = mentee ? 'Take a moment to reflect on how the conversation went.' : 'We appreciate the time and guidance you shared.';
    return '<div class="screen outcome-wrap"><section class="outcome-card card transition-card" aria-labelledby="acknowledgement-title">' +
      '<div class="outcome-heading"><span class="outcome-icon">' + icon('check') + '</span><h1 class="title small" id="acknowledgement-title">' + esc(heading) + '</h1>' +
      '<p class="subtitle">Your session with ' + esc(counterpart) + ' is complete.</p>' +
      '<p class="body-copy">' + esc(closing) + '</p></div>' +
      transitionCountdown('Your session reflection will open in') + '</section></div>';
  }

  function menteeOutcomeScreen() {
    return '<div class="screen outcome-wrap"><section class="outcome-card card" aria-labelledby="outcome-title">' +
      '<div class="outcome-heading"><span class="outcome-icon">' + icon('session') + '</span><h1 class="title small" id="outcome-title">The session could not start</h1>' +
      '<p class="subtitle">' + esc(S.mentor_name) + ' did not join by ' + esc(S.join_deadline) + '.</p><p class="body-copy">We recorded that you joined and remained available.</p></div>' +
      '<div class="stack-sm"><h2 class="section-title">What happens next</h2><ul class="bullet-list">' +
      '<li>We are verifying the session outcome against the attendance record.</li><li>Expected update: ' + esc(S.outcome_update_window) + '.</li>' +
      '<li>If mentor no-show is confirmed, your session credit will be restored.</li><li>Report a problem if a platform or timing issue affected the session.</li>' +
      '</ul></div>' +
      '<div class="stack-sm"><h2 class="section-title">Session status</h2><div class="status-box"><strong>Verification in progress</strong></div></div>' +
      '<div class="actions"><button class="btn tertiary" type="button" data-action="report">Report a problem</button><span class="spacer"></span>' +
      '<button class="btn primary" type="button" data-action="dashboard" data-label="Case 04">Go to dashboard</button></div>' +
      '<p class="fineprint">Report an attendance or technical issue by ' + esc(S.support_deadline) + '.</p>' +
      '</section></div>';
  }

  function mentorOutcomeScreen() {
    return '<div class="screen outcome-wrap"><section class="outcome-card card" aria-labelledby="outcome-title">' +
      '<div class="outcome-heading"><span class="outcome-icon">' + icon('session') + '</span><h1 class="title small" id="outcome-title">The session could not start</h1>' +
      '<p class="subtitle">' + esc(S.mentee_name) + ' did not join by ' + esc(S.join_deadline) + '.</p><p class="body-copy">We recorded that you joined at ' + esc(S.mentor_join_time) + ' and remained available.</p></div>' +
      '<div class="stack-sm"><h2 class="section-title">Recorded outcome</h2><div class="status-box"><strong>Mentee did not join</strong><span>Status: Outcome being confirmed</span></div></div>' +
      '<div class="stack-sm"><h2 class="section-title">What happens next</h2><ul class="bullet-list"><li>Your payout result will appear after the outcome is confirmed.</li><li>Report a platform, attendance, or timing issue if one occurred.</li></ul></div>' +
      '<div class="actions"><button class="btn tertiary" type="button" data-action="report">Report a problem</button><span class="spacer"></span>' +
      '<button class="btn primary" type="button" data-action="dashboard" data-label="Case 06">Go to dashboard</button></div>' +
      '<p class="fineprint">Report an attendance or technical issue by ' + esc(S.support_deadline) + '.</p>' +
      '</section></div>';
  }

  function expiredMeetingScreen() {
    return '<div class="screen outcome-wrap"><section class="outcome-card card" aria-labelledby="expired-title">' +
      '<div class="outcome-heading"><span class="outcome-icon">' + icon('clock') + '</span><h1 class="title small" id="expired-title">This meeting is over</h1>' +
      '<p class="subtitle">The meeting link has expired, so you can no longer join this session.</p></div>' +
      '<div class="stack-sm"><h2 class="section-title">Session attendance</h2><dl class="attendance-list">' +
      '<div><dt>Scheduled start</dt><dd>' + esc(S.scheduled_time) + '</dd></div>' +
      '<div><dt>Join-by time</dt><dd>' + esc(S.join_deadline) + '</dd></div>' +
      '<div><dt>Attendance</dt><dd>No-show recorded</dd></div></dl></div>' +
      '<p class="body-copy">If this does not look right, you can report it by ' + esc(S.support_deadline) + '.</p>' +
      '<div class="actions"><button class="btn tertiary" type="button" data-action="report">Report this</button><span class="spacer"></span>' +
      '<button class="btn primary" type="button" data-action="dashboard" data-label="Case 07">Continue</button></div>' +
      '</section></div>';
  }

  function activeSessionScreen() {
    return '<div class="screen"><div class="room-shell active-room">' +
      '<div class="room-topline"><div class="room-copy"><h1 class="title small">Session in progress</h1></div></div>' +
      '<div class="room-stage active-stage" aria-label="Active session"><span class="sr">Active Zoom session</span></div>' +
      '<div class="controlbar active-controls" aria-label="In-session controls">' +
      '<button class="btn tertiary media-state" type="button" data-action="toggle-microphone" aria-pressed="' + state.microphone + '">' + (state.microphone ? icon('microphone') : icon('microphoneOff')) + 'Microphone</button>' +
      '<button class="btn tertiary media-state" type="button" data-action="toggle-camera" aria-pressed="' + state.camera + '">' + (state.camera ? icon('camera') : icon('cameraOff')) + 'Camera</button>' +
      '<button class="btn tertiary" type="button" data-action="toggle-share" aria-pressed="' + state.sharing + '"' + (narrow.matches ? ' disabled aria-describedby="active-share-note"' : '') + '>' + icon('share') + (state.sharing ? 'Stop sharing' : 'Share screen') + '</button>' +
      '<button class="btn destructive" type="button" data-action="leave-session">' + icon('leave') + 'Leave session</button></div>' +
      (narrow.matches ? '<p class="fineprint share-note" id="active-share-note">Mobile browsers cannot start a screen share.</p>' : '') +
      (state.sharing ? '<p class="fineprint share-note" role="status">You are sharing your screen.</p>' : '') +
      '</div></div>';
  }

  function ratingScale(form, questionId, legend, low, high) {
    var selected = state.feedback[form].ratings[questionId];
    var questionClass = questionId.indexOf('statement-') === 0 ? 'question statement-question' : 'question';
    var options = '';
    for (var number = 1; number <= 5; number += 1) {
      var id = form + '-' + questionId + '-' + number;
      options += '<div class="rating-option"><input id="' + id + '" type="radio" name="' + form + '-' + questionId + '" value="' + number + '" data-rating data-form="' + form + '" data-question="' + questionId + '"' + (selected === number ? ' checked' : '') + '><label for="' + id + '">' + number + '</label></div>';
    }
    return '<fieldset class="' + questionClass + '"><legend>' + esc(legend) + '</legend><div class="rating">' + options + '</div>' +
      (low ? '<div class="anchors"><span>' + esc(low) + '</span><span>' + esc(high) + '</span></div>' : '') + '</fieldset>';
  }

  function commentField(form, id, label) {
    return '<div class="comment-field"><div class="label-row"><label class="section-title" for="' + id + '">' + esc(label) + '</label><span class="optional">Optional</span></div>' +
      '<textarea id="' + id + '" rows="3" data-feedback-comment data-form="' + form + '">' + esc(state.feedback[form].comment) + '</textarea></div>';
  }

  function feedbackFooter(form, primaryLabel) {
    var feedback = state.feedback[form];
    var busy = feedback.status === 'submitting';
    return (feedback.status === 'error' ? '<div class="notice error" role="alert">' + icon('alert') + '<div><p class="notice-title">Feedback could not be saved</p><p class="body-copy">Your responses are still available. Try again or skip for now.</p></div></div>' : '') +
      '<div class="actions split"><button class="btn ghost" type="button" data-action="skip-feedback" data-form="' + form + '"' + (busy ? ' disabled' : '') + '>Skip for now</button>' +
      '<button class="btn primary" type="submit" data-fk="submit-feedback"' + (busy ? ' disabled aria-busy="true"' : '') + '>' + (busy ? '<span class="spin"></span>Saving…' : esc(primaryLabel)) + '</button></div>';
  }

  function feedbackFrame(inner) {
    return '<div class="screen"><div class="feedback-layout"><aside class="feedback-brand" aria-hidden="true">' + logo('') + '</aside>' + inner + '</div></div>';
  }

  function reflectionScreen(role) {
    var mentee = role === 'mentee';
    var form = mentee ? 'c11' : 'c12';
    var title = mentee ? 'Looking back on your session' : 'Looking back on the session';
    var intro = mentee
      ? 'Thinking about the conversation itself, share what supported you and what could have made the session more useful.'
      : 'Thinking about the conversation itself, share how well it supported a focused and useful discussion with ' + S.mentee_name + '.';
    var overall = mentee ? 'Overall, how valuable was this session for you?' : 'Overall, how effective did this session feel?';
    var overallLow = mentee ? 'Not valuable' : 'Not effective';
    var overallHigh = mentee ? 'Very valuable' : 'Very effective';
    var statements = mentee ? [
      'I was able to discuss what mattered most to me.',
      'The mentor understood my context before offering guidance.',
      'The guidance felt relevant and practical for my situation.',
      'I left with clearer direction about what to do next.',
      'I felt comfortable asking questions and sharing concerns.'
    ] : [
      'The mentee shared enough context for me to understand their needs.',
      'We established a clear focus for the conversation.',
      'The mentee engaged with the questions and guidance discussed.',
      "I was able to offer guidance suited to the mentee's situation.",
      'The conversation led to meaningful clarity or progress.'
    ];
    var comment = mentee
      ? 'What made the session useful, or what would have helped more?'
      : 'What helped the conversation, or made it harder to help?';

    var questions = ratingScale(form, 'overall', overall, overallLow, overallHigh) +
      '<div class="scale-help"><span>For the five statements below</span><span>1 = Strongly disagree · 5 = Strongly agree</span></div>' +
      statements.map(function (statement, index) { return ratingScale(form, 'statement-' + (index + 1), statement, '', ''); }).join('');

    return feedbackFrame('<form class="feedback-card card" data-feedback-form="' + form + '" aria-labelledby="feedback-title">' +
      '<div class="feedback-head"><div><h1 class="title small" id="feedback-title">' + esc(title) + '</h1><p class="subtitle">' + esc(intro) + '</p></div><span class="step-chip">Step 1 of 2</span></div>' +
      '<div class="question-list reflection-question-list">' + questions + commentField(form, form + '-comment', comment) + '</div>' + feedbackFooter(form, 'Continue') + '</form>');
  }

  function experienceScreen() {
    var form = 'c13';
    var questions = ratingScale(form, 'join', 'How easy was it to join the session?', 'Very difficult', 'Very easy') +
      ratingScale(form, 'controls', 'How easy were the session controls to use?', 'Very difficult', 'Very easy') +
      ratingScale(form, 'reliability', 'How reliable was the call experience?', 'Very unreliable', 'Very reliable') +
      ratingScale(form, 'support', 'How well did the platform support the conversation overall?', 'Not well at all', 'Extremely well');
    return feedbackFrame('<form class="feedback-card card" data-feedback-form="c13" aria-labelledby="feedback-title">' +
      '<div class="feedback-head"><div><h1 class="title small" id="feedback-title">One last check-in</h1>' +
      '<p class="subtitle">Think only about joining and using the session space.</p></div><span class="step-chip">Step 2 of 2</span></div>' +
      '<div class="question-list experience-question-list">' + questions +
      commentField(form, 'c13-comment', 'Anything we could make smoother next time?') + '</div>' + feedbackFooter(form, 'Finish') + '</form>');
  }

  var CASES = [
    { id: '01', role: 'Mentee', name: 'Mentee prepares and enters the session', trigger: 'At or after T-5, the mentee selects the enabled session link.', links: [['Screen 1 — Welcome', '/c01/welcome'], ['Screen 2 — Device check', '/c01/device']] },
    { id: '02', role: 'Mentee', name: 'Mentee waits for the mentor', trigger: 'The mentee entered successfully and the mentor is not yet present.', links: [['After scheduled start', '/c02/waiting', 'after'], ['Before scheduled start', '/c02/waiting', 'pre']] },
    { id: '03', role: 'Both', name: 'Waiting time is over', trigger: 'The join deadline passes while one participant remains waiting and the other has not entered.', links: [['Mentor did not join', '/c03/waiting-complete', 'mentor-missing'], ['Mentee did not join', '/c03/waiting-complete', 'mentee-missing']] },
    { id: '04', role: 'Mentee', name: 'Mentor does not join the mentee', trigger: 'The waiting-complete transition ends and the mentor did not enter.', links: [['Screen 1 — No-start outcome', '/c04/outcome']] },
    { id: '05', role: 'Mentor', name: 'Mentor prepares and enters the session', trigger: 'The mentor opens the session experience before entering the room.', links: [['Screen 1 — Welcome', '/c05/welcome'], ['Screen 2 — Device check', '/c05/device']] },
    { id: '06', role: 'Mentor', name: 'Mentee does not join the mentor', trigger: 'The waiting-complete transition ends and no mentee room entry was recorded.', links: [['Screen 1 — Mentee did not join', '/c06/outcome']] },
    { id: '07', role: 'Both', name: 'Joining window has closed', trigger: 'The participant has not entered the room and opens or uses the meeting link at or after the join deadline.', links: [['Mentee view — Meeting over', '/c07/expired', 'mentee'], ['Mentor view — Meeting over', '/c07/expired', 'mentor']] },
    { id: '08', role: 'Both', name: 'Participant leaves an active session early', trigger: 'During an active session, the participant selects Leave session before the scheduled end.', links: [['Mentee view — Confirm early exit', '/c08/session', 'mentee'], ['Mentor view — Confirm early exit', '/c08/session', 'mentor']] },
    { id: '09', role: 'Mentee', name: 'Mentee completed-session acknowledgement', trigger: "The backend confirms that the mentee's mentoring session was completed.", links: [['Screen 1 — Thank you', '/c09/acknowledgement']] },
    { id: '10', role: 'Mentor', name: 'Mentor completed-session acknowledgement', trigger: "The backend confirms that the mentor's mentoring session was completed.", links: [['Screen 1 — Thank you', '/c10/acknowledgement']] },
    { id: '11', role: 'Mentee', name: 'Mentee reflection after a completed session', trigger: "The mentee's 10-second completed-session acknowledgement ends.", links: [['Screen 1 — Session reflection', '/c11/reflection']] },
    { id: '12', role: 'Mentor', name: 'Mentor reflection after a completed session', trigger: "The mentor's 10-second completed-session acknowledgement ends.", links: [['Screen 1 — Session reflection', '/c12/reflection']] },
    { id: '13', role: 'Both', name: 'Experience check-in after a completed session', trigger: 'The participant continues or skips their role-specific reflection.', links: [['Screen 1 — Experience check-in', '/c13/experience']] }
  ];

  function indexScreen() {
    return '<div class="hx-index"><header><span class="hx-tag">Prototype harness — not a product screen</span><h1>Zoom integration flow — case index</h1>' +
      '<p class="hx-note">Thirteen cases from the latest approved case-wise ASCII specification. The controls dock supplies deterministic backend events and failure states.</p></header>' +
      '<div class="hx-grid">' + CASES.map(function (item) {
        return '<article class="hx-case"><div class="hx-case-head"><span class="hx-num">Case ' + item.id + '</span><span class="hx-role">' + item.role + '</span></div>' +
          '<h2>' + esc(item.name) + '</h2><p>' + esc(item.trigger) + '</p><div class="hx-links">' + item.links.map(function (link) {
            return '<button class="hx-btn go" type="button" data-action="open-case" data-route="' + link[1] + '"' + (link[2] ? ' data-variant="' + link[2] + '"' : '') + '>' + esc(link[0]) + '</button>';
          }).join('') + '</div></article>';
      }).join('') + '</div></div>';
  }

  function bridgeScreen() {
    var mentor = state.bridgeRole === 'mentor';
    return '<div class="hx-screen"><section class="hx-card"><span class="hx-tag">Prototype bridge — not a product screen</span><h1>In-session experience</h1>' +
      '<p>The approved specification hands off to the established in-session experience, so this harness only exposes documented outcomes.</p><div class="hx-links">' +
      '<button class="hx-btn go" type="button" data-action="complete-session" data-role="' + (mentor ? 'mentor' : 'mentee') + '">Session completed → Case ' + (mentor ? '10' : '09') + '</button>' +
      '<button class="hx-btn" type="button" data-action="start-early-exit" data-role="' + (mentor ? 'mentor' : 'mentee') + '">Leave session early → Case 08</button>' +
      (mentor ? '<button class="hx-btn" type="button" data-action="start-waiting-complete" data-missing="mentee">Mentee did not join → Case 03</button>' : '') +
      '<button class="hx-btn" type="button" data-action="open-case" data-route="/">Case index</button></div></section></div>';
  }

  function endScreen() {
    return '<div class="hx-screen"><section class="hx-card"><span class="hx-tag">Prototype harness — not a product screen</span><h1>Flow complete</h1>' +
      '<p>' + esc(state.endMessage || ((state.endLabel || 'The flow') + ' returned the participant to the dashboard.')) + '</p><div class="hx-links"><button class="hx-btn go" type="button" data-action="open-case" data-route="/">Case index</button></div></section></div>';
  }

  var VIEWS = {
    '/': indexScreen,
    '/c01/welcome': function () { return welcomeScreen('mentee'); },
    '/c01/device': function () { return deviceScreen('mentee'); },
    '/c02/waiting': waitingScreen,
    '/c03/waiting-complete': waitingCompleteScreen,
    '/c04/outcome': menteeOutcomeScreen,
    '/c05/welcome': function () { return welcomeScreen('mentor'); },
    '/c05/device': function () { return deviceScreen('mentor'); },
    '/c06/outcome': mentorOutcomeScreen,
    '/c07/expired': expiredMeetingScreen,
    '/c08/session': activeSessionScreen,
    '/c09/acknowledgement': function () { return acknowledgementScreen('mentee'); },
    '/c10/acknowledgement': function () { return acknowledgementScreen('mentor'); },
    '/c11/reflection': function () { return reflectionScreen('mentee'); },
    '/c12/reflection': function () { return reflectionScreen('mentor'); },
    '/c13/experience': experienceScreen,
    '/bridge': bridgeScreen,
    '/end': endScreen
  };

  var view = document.getElementById('view');
  var appbar = document.getElementById('appbar');
  var appbarContext = document.getElementById('appbar-context');
  var appbarUser = document.getElementById('appbar-user');
  var appbarAvatar = document.getElementById('appbar-avatar');
  var dock = document.getElementById('dock');
  var dockBody = document.getElementById('dock-body');
  var dialog = document.getElementById('dialog');

  function render(options) {
    options = options || {};
    var currentRoute = route();
    var meta = ROUTES[currentRoute];
    var active = document.activeElement;
    var focusKey = options.focus || (active && active.dataset ? active.dataset.fk : null);
    var selectionStart = null;
    var selectionEnd = null;
    if (active && active.dataset && active.dataset.fk && 'selectionStart' in active) {
      try { selectionStart = active.selectionStart; selectionEnd = active.selectionEnd; } catch (error) { /* not a text control */ }
    }

    appbar.hidden = !meta.bar;
    if (meta.bar) {
      var role = meta.role === 'both' ? state.participantRole : meta.role;
      var person = role === 'mentor' ? S.mentor_name : S.mentee_name;
      appbarContext.textContent = S.session_agenda;
      appbarUser.textContent = person;
      appbarAvatar.textContent = initials(person);
    }
    view.innerHTML = VIEWS[currentRoute]();
    document.title = meta.label + ' · Mentor Union prototype';
    renderDock(currentRoute, meta);

    if (focusKey) {
      var target = view.querySelector('[data-fk="' + focusKey + '"]');
      if (target && !target.disabled) {
        target.focus({ preventScroll: true });
        if (selectionStart !== null && 'setSelectionRange' in target) {
          try { target.setSelectionRange(selectionStart, selectionEnd); } catch (error) { /* unsupported control */ }
        }
      }
    }

    if (currentRoute === '/c08/session' && state.earlyExitPrompt && !dialog.open) {
      state.earlyExitPrompt = false;
      window.setTimeout(openEarlyExitDialog, 0);
    }
  }

  window.addEventListener('hashchange', function () {
    stopTimer();
    if (dialog.open) { dialog.close(); }
    currentCase = ROUTES[route()].caseId || currentCase;
    render();
    window.scrollTo(0, 0);
    document.getElementById('main').focus({ preventScroll: true });
    startRouteTimer();
  });

  function stopTimer() {
    if (timer) { window.clearInterval(timer); timer = null; }
    timerState = null;
  }

  function startTimer(seconds, onZero) {
    stopTimer();
    timerState = { seconds: seconds, onZero: onZero };
    paintTimer();
    timer = window.setInterval(function () {
      if (!timerState) { return; }
      timerState.seconds -= 1;
      paintTimer();
      if (timerState.seconds <= 0) {
        var callback = timerState.onZero;
        stopTimer();
        if (callback) { callback(); }
      }
    }, 1000);
  }

  function paintTimer() {
    var number = document.getElementById('cd-num');
    if (number && timerState) {
      number.textContent = number.dataset.format === 'seconds' ? timerState.seconds : mmss(timerState.seconds);
    }
  }

  function enterWaitingComplete(missingRole) {
    state.waitingMissing = missingRole;
    state.participantRole = missingRole === 'mentor' ? 'mentee' : 'mentor';
    go('/c03/waiting-complete');
  }

  function startWaitingTimer() {
    if (state.waitPhase === 'pre') {
      startTimer(S.waiting_pre_seconds, function () {
        state.waitPhase = 'after';
        render();
        announce('The scheduled start has passed. The timer now counts down to the join deadline.');
        startTimer(S.waiting_deadline_seconds, function () { enterWaitingComplete('mentor'); });
      });
    } else {
      startTimer(S.waiting_deadline_seconds, function () { enterWaitingComplete('mentor'); });
    }
  }

  function startRouteTimer() {
    if (route() === '/c01/welcome') { startTimer(S.time_until_start_seconds, null); }
    if (route() === '/c02/waiting') { startWaitingTimer(); }
    if (route() === '/c03/waiting-complete') {
      startTimer(S.transition_seconds, function () { go(state.waitingMissing === 'mentor' ? '/c04/outcome' : '/c06/outcome'); });
    }
    if (route() === '/c09/acknowledgement') { startTimer(S.transition_seconds, function () { go('/c11/reflection'); }); }
    if (route() === '/c10/acknowledgement') { startTimer(S.transition_seconds, function () { go('/c12/reflection'); }); }
  }

  function openDialog(config) {
    dialog.innerHTML = '<div class="dialog-card">' +
      '<div class="dialog-head"><h2 id="dialog-title">' + esc(config.title) + '</h2>' +
      (config.hideClose ? '' : '<button class="dialog-close" type="button" data-dialog="close" aria-label="Close dialog">' + icon('close') + '</button>') + '</div>' +
      '<div class="dialog-body">' + (config.harness ? '<span class="hx-tag">Prototype note</span>' : '') + config.body + '</div>' +
      '<div class="actions end">' + config.actions.map(function (action) { return '<button class="btn ' + action.kind + '" type="button" data-dialog="' + action.id + '">' + esc(action.label) + '</button>'; }).join('') + '</div></div>';
    dialog.setAttribute('aria-labelledby', 'dialog-title');
    dialog.__action = config.onAction || null;
    dialog.showModal();
  }

  function openEarlyExitDialog() {
    openDialog({
      title: 'Leave the session?',
      hideClose: true,
      body: '<p class="body-copy">Your session is still in progress. Leaving now will end your participation early.</p>' +
        '<p class="body-copy text-strong">Are you sure you want to leave?</p>',
      actions: [{ id: 'cancel', kind: 'ghost', label: 'Cancel' }, { id: 'leave', kind: 'destructive', label: 'Leave session' }],
      onAction: function (id) {
        if (id === 'leave') {
          state.endLabel = 'Case 08';
          state.endMessage = 'The requesting participant exited. The other participant remains connected.';
          go('/end');
        }
      }
    });
  }

  dialog.addEventListener('click', function (event) {
    var button = event.target.closest('[data-dialog]');
    if (!button) { return; }
    var id = button.dataset.dialog;
    var action = dialog.__action;
    dialog.close();
    if (id !== 'close' && action) { action(id); }
  });
  dialog.addEventListener('close', function () { dialog.innerHTML = ''; });

  function withMockRequest(callback) {
    var shouldFail = failNext;
    failNext = false;
    window.setTimeout(function () { callback(shouldFail); }, 750);
  }

  function playTone() {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { return; }
      var context = new AudioContext();
      var oscillator = context.createOscillator();
      var gain = context.createGain();
      oscillator.frequency.value = 523.25;
      gain.gain.setValueAtTime(.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.08, context.currentTime + .05);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + 1);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 1.05);
      oscillator.onended = function () { context.close(); };
    } catch (error) { /* Audio is unavailable in some prototype contexts. */ }
  }

  view.addEventListener('click', function (event) {
    var control = event.target.closest('[data-action]');
    if (!control) { return; }
    var action = control.dataset.action;

    if (action === 'go') { go(control.dataset.route); return; }
    if (action === 'open-case') { openCase(control.dataset.route, control.dataset.variant); return; }
    if (action === 'toggle-microphone') {
      state.microphone = !state.microphone;
      if (!state.microphone) { state.micTest = 'idle'; }
      render();
      announce('Microphone ' + (state.microphone ? 'on.' : 'off.'));
      return;
    }
    if (action === 'toggle-camera') {
      state.camera = !state.camera;
      render();
      announce('Camera ' + (state.camera ? 'on.' : 'off.'));
      return;
    }
    if (action === 'test-microphone') {
      state.micTest = 'running';
      render({ focus: 'test-microphone' });
      window.setTimeout(function () {
        if (state.micTest !== 'running') { return; }
        state.micTest = 'done';
        render({ focus: 'test-microphone' });
        announce('Your microphone picked up sound.');
      }, 1800);
      return;
    }
    if (action === 'test-speaker') {
      state.speakerTest = 'playing';
      render({ focus: 'test-speaker' });
      playTone();
      window.setTimeout(function () {
        state.speakerTest = 'idle';
        render({ focus: 'test-speaker' });
      }, 1200);
      return;
    }
    if (action === 'refresh-devices') {
      state.refreshing = true;
      render({ focus: 'refresh-devices' });
      window.setTimeout(function () {
        state.refreshing = false;
        state.devicesRefreshed = true;
        render({ focus: 'refresh-devices' });
        announce('Device list updated.');
      }, 700);
      return;
    }
    if (action === 'join') {
      state.joinStatus = 'joining';
      render({ focus: 'join' });
      withMockRequest(function (failed) {
        if (failed) {
          state.joinStatus = 'error';
          render({ focus: 'join' });
          announce('Could not join the session.');
          return;
        }
        var role = ROUTES[route()].role;
        state.joinStatus = 'idle';
        if (role === 'mentee') { state.waitPhase = 'after'; go('/c02/waiting'); }
        else { state.bridgeRole = 'mentor'; go('/bridge'); }
      });
      return;
    }
    if (action === 'toggle-chat') {
      state.chatOpen = !state.chatOpen;
      render();
      if (state.chatOpen) {
        var input = document.getElementById('chat-input');
        if (input) { input.focus(); }
      }
      return;
    }
    if (action === 'toggle-share') {
      state.sharing = !state.sharing;
      render();
      announce(state.sharing ? 'You are sharing your screen.' : 'Screen sharing stopped.');
      return;
    }
    if (action === 'leave-session') {
      openEarlyExitDialog();
      return;
    }
    if (action === 'leave-waiting') {
      openDialog({
        title: 'Leave the waiting room?',
        body: '<p class="body-copy">Leaving now ends the recorded waiting period for this session.</p>',
        actions: [{ id: 'stay', kind: 'ghost', label: 'Stay on this screen' }, { id: 'leave', kind: 'destructive', label: 'Leave waiting room' }],
        onAction: function (id) { if (id === 'leave') { state.endLabel = 'Case 02'; go('/end'); } }
      });
      return;
    }
    if (action === 'report') {
      openDialog({
        title: 'Report a problem',
        harness: true,
        body: '<p class="body-copy">This control opens the established Get Support path in the product. That support surface is outside this prototype.</p>',
        actions: [{ id: 'close', kind: 'tertiary', label: 'Close' }]
      });
      return;
    }
    if (action === 'dashboard') {
      state.endLabel = control.dataset.label;
      go('/end');
      return;
    }
    if (action === 'skip-feedback') {
      afterFeedback(control.dataset.form);
      return;
    }
    if (action === 'complete-session') {
      state.feedbackRole = control.dataset.role;
      go(control.dataset.role === 'mentor' ? '/c10/acknowledgement' : '/c09/acknowledgement');
      return;
    }
    if (action === 'start-early-exit') {
      state.participantRole = control.dataset.role;
      state.earlyExitPrompt = true;
      go('/c08/session');
      return;
    }
    if (action === 'start-waiting-complete') {
      enterWaitingComplete(control.dataset.missing);
      return;
    }
  });

  view.addEventListener('submit', function (event) {
    var chatForm = event.target.closest('[data-chat-form]');
    if (chatForm) {
      event.preventDefault();
      var message = state.chatDraft.trim();
      if (!message) { return; }
      state.messages.push(message);
      state.chatDraft = '';
      render();
      var input = document.getElementById('chat-input');
      if (input) { input.focus(); }
      announce('Message sent.');
      return;
    }
    var feedbackForm = event.target.closest('[data-feedback-form]');
    if (feedbackForm) {
      event.preventDefault();
      var form = feedbackForm.dataset.feedbackForm;
      state.feedback[form].status = 'submitting';
      render({ focus: 'submit-feedback' });
      withMockRequest(function (failed) {
        if (failed) {
          state.feedback[form].status = 'error';
          render({ focus: 'submit-feedback' });
          announce('Feedback could not be saved.');
        } else {
          state.feedback[form].status = 'saved';
          announce('Feedback saved.');
          afterFeedback(form);
        }
      });
    }
  });

  function afterFeedback(form) {
    if (form === 'c11') { state.feedbackRole = 'mentee'; go('/c13/experience'); return; }
    if (form === 'c12') { state.feedbackRole = 'mentor'; go('/c13/experience'); return; }
    state.endLabel = 'Case 13';
    go('/end');
  }

  view.addEventListener('change', function (event) {
    var control = event.target;
    if (control.dataset.field === 'device') {
      state.devices[control.dataset.device] = Number(control.value);
      return;
    }
    if (control.matches('[data-rating]')) {
      state.feedback[control.dataset.form].ratings[control.dataset.question] = Number(control.value);
    }
  });

  view.addEventListener('input', function (event) {
    var control = event.target;
    if (control.matches('[data-feedback-comment]')) {
      state.feedback[control.dataset.form].comment = control.value;
      return;
    }
    if (control.matches('[data-chat-input]')) {
      state.chatDraft = control.value;
      var send = view.querySelector('[data-chat-send]');
      if (send) { send.disabled = !state.chatDraft.trim(); }
    }
  });

  var SIMULATIONS = {
    '/c01/welcome': [{ id: 'timer-zero', label: 'Advance countdown to 0:00' }],
    '/c02/waiting': [
      { id: 'mentor-joins', label: 'Mentor joins → in-session' },
      { id: 'timer-zero', label: 'Advance current timer to 0:00' },
      { id: 'wait-pre', label: 'Show before-start timing state' },
      { id: 'wait-after', label: 'Show join-deadline timing state' }
    ],
    '/c03/waiting-complete': [{ id: 'timer-zero', label: 'Advance transition to 0 seconds' }],
    '/c09/acknowledgement': [{ id: 'timer-zero', label: 'Advance transition to 0 seconds' }],
    '/c10/acknowledgement': [{ id: 'timer-zero', label: 'Advance transition to 0 seconds' }]
  };

  /* Screens reserve bottom padding for the floating dock. Measuring the dock
     keeps that reserve correct when it is expanded, collapsed, or reflowed by
     a viewport change, so no control is ever trapped beneath it. */
  function syncDockClearance() {
    var height = dock.hidden ? 0 : dock.offsetHeight;
    document.documentElement.style.setProperty('--dock-clear', (height ? height + 32 : 32) + 'px');
  }
  if (window.ResizeObserver) { new window.ResizeObserver(syncDockClearance).observe(dock); }

  function renderDock(currentRoute, meta) {
    if (currentRoute === '/') { dock.hidden = true; syncDockClearance(); return; }
    dock.hidden = false;
    var simulations = SIMULATIONS[currentRoute] || [];
    var canFail = ['/c01/device', '/c05/device', '/c11/reflection', '/c12/reflection', '/c13/experience'].indexOf(currentRoute) !== -1;
    dockBody.hidden = !dockOpen;
    document.getElementById('dock-toggle').textContent = dockOpen ? 'Hide' : 'Show';
    document.getElementById('dock-toggle').setAttribute('aria-expanded', String(dockOpen));
    if (!dockOpen) { syncDockClearance(); return; }
    dockBody.innerHTML = '<p class="where"><b>' + esc(meta.label) + '</b></p>' +
      (simulations.length ? '<div class="grp"><span class="cap">Simulate backend event</span>' + simulations.map(function (simulation) { return '<button class="hx-btn" type="button" data-sim="' + simulation.id + '">' + esc(simulation.label) + '</button>'; }).join('') + '</div>' : '') +
      (canFail ? '<div class="grp"><span class="cap">Failure path</span><label class="sw"><input type="checkbox" id="fail-next"' + (failNext ? ' checked' : '') + '> Fail the next request</label></div>' : '') +
      '<div class="grp"><span class="cap">Navigate</span>' + (meta.caseId ? '<button class="hx-btn" type="button" data-sim="restart">Restart case ' + meta.caseId + '</button>' : '') +
      '<button class="hx-btn" type="button" data-sim="index">Case index</button></div>';
    syncDockClearance();
  }

  document.getElementById('dock-toggle').addEventListener('click', function () {
    dockOpen = !dockOpen;
    render();
  });

  dock.addEventListener('click', function (event) {
    var control = event.target.closest('[data-sim]');
    if (!control) { return; }
    var simulation = control.dataset.sim;
    if (simulation === 'index') { openCase('/'); return; }
    if (simulation === 'restart') {
      var caseId = ROUTES[route()].caseId;
      var variant = caseId === '03' ? state.waitingMissing + '-missing' : ((caseId === '07' || caseId === '08') ? state.participantRole : undefined);
      openCase(CASE_START[caseId], variant);
      return;
    }
    if (simulation === 'mentor-joins') { stopTimer(); state.bridgeRole = 'mentee'; go('/bridge'); return; }
    if (simulation === 'wait-pre') { stopTimer(); state.waitPhase = 'pre'; render(); startWaitingTimer(); return; }
    if (simulation === 'wait-after') { stopTimer(); state.waitPhase = 'after'; render(); startWaitingTimer(); return; }
    if (simulation === 'timer-zero' && timerState) {
      var callback = timerState.onZero;
      var number = document.getElementById('cd-num');
      if (number) { number.textContent = number.dataset.format === 'seconds' ? '0' : '0:00'; }
      stopTimer();
      if (callback) { callback(); }
    }
  });

  dock.addEventListener('change', function (event) {
    if (event.target.id === 'fail-next') { failNext = event.target.checked; }
  });

  if (narrow.addEventListener) {
    narrow.addEventListener('change', function () { if (route() === '/c02/waiting') { render(); } });
  } else {
    narrow.addListener(function () { if (route() === '/c02/waiting') { render(); } });
  }

  currentCase = ROUTES[route()].caseId || null;
  render();
  startRouteTimer();
})();
