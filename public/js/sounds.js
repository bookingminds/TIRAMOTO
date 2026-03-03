(function() {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = null;
  var muted = localStorage.getItem('tm-muted') === '1';

  function getCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, vol, type, delay) {
    var c = getCtx();
    if (!c || muted) return;
    var t = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  window.TM_SOUNDS = {
    click: function() {
      tone(600, 0.06, 0.06, 'sine');
      tone(800, 0.04, 0.04, 'sine', 0.03);
    },

    hover: function() {
      tone(1200, 0.03, 0.02, 'sine');
    },

    success: function() {
      tone(523, 0.12, 0.1, 'sine');
      tone(659, 0.12, 0.1, 'sine', 0.12);
      tone(784, 0.2, 0.12, 'sine', 0.24);
    },

    error: function() {
      tone(300, 0.15, 0.1, 'square');
      tone(250, 0.25, 0.08, 'square', 0.15);
    },

    notify: function() {
      tone(880, 0.1, 0.15, 'sine');
      tone(1100, 0.1, 0.15, 'sine', 0.12);
      tone(1320, 0.15, 0.12, 'sine', 0.24);
      tone(1100, 0.2, 0.1, 'sine', 0.4);
    },

    send: function() {
      var c = getCtx();
      if (!c || muted) return;
      for (var i = 0; i < 5; i++) {
        tone(400 + i * 150, 0.08, 0.06, 'sine', i * 0.05);
      }
    },

    pop: function() {
      tone(900, 0.05, 0.07, 'sine');
      tone(1400, 0.03, 0.05, 'sine', 0.04);
    },

    tab: function() {
      tone(700, 0.05, 0.04, 'sine');
      tone(900, 0.06, 0.04, 'sine', 0.04);
    },

    swoosh: function() {
      var c = getCtx();
      if (!c || muted) return;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.15);
      gain.gain.setValueAtTime(0.04, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.2);
    },

    toggle: function() {
      tone(500, 0.06, 0.06, 'sine');
      tone(700, 0.08, 0.06, 'sine', 0.06);
    },

    mute: function() { muted = true; localStorage.setItem('tm-muted', '1'); },
    unmute: function() { muted = false; localStorage.setItem('tm-muted', '0'); },
    isMuted: function() { return muted; }
  };

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.btn-primary, .btn-success, .btn-warning, .btn-danger, .btn-outline-danger, .btn-outline-secondary').forEach(function(btn) {
      btn.addEventListener('click', function() { TM_SOUNDS.click(); });
    });

    document.querySelectorAll('.btn-ghost, .btn-sm').forEach(function(btn) {
      btn.addEventListener('click', function() { TM_SOUNDS.pop(); });
    });

    document.querySelectorAll('.nav-link').forEach(function(link) {
      link.addEventListener('mouseenter', function() { TM_SOUNDS.hover(); });
    });

    document.querySelectorAll('.tm-stat').forEach(function(stat) {
      stat.addEventListener('click', function() { TM_SOUNDS.tab(); });
    });

    document.querySelectorAll('.tm-step-card').forEach(function(card) {
      card.addEventListener('mouseenter', function() { TM_SOUNDS.hover(); });
    });

    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', function() {
        var btn = form.querySelector('[type="submit"]');
        if (btn && (btn.classList.contains('btn-primary') || btn.classList.contains('btn-success'))) {
          TM_SOUNDS.send();
        }
      });
    });

    document.querySelectorAll('.form-select').forEach(function(sel) {
      sel.addEventListener('change', function() { TM_SOUNDS.pop(); });
    });

    document.querySelectorAll('.tm-hero-cta').forEach(function(btn) {
      btn.addEventListener('mouseenter', function() { TM_SOUNDS.swoosh(); });
    });

    document.querySelectorAll('.btn-google, [href*="google"]').forEach(function(btn) {
      btn.addEventListener('click', function() { TM_SOUNDS.toggle(); });
    });

    var muteBtn = document.getElementById('tm-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', function() {
        if (TM_SOUNDS.isMuted()) {
          TM_SOUNDS.unmute();
          muteBtn.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
          muteBtn.title = 'Pa zë';
        } else {
          TM_SOUNDS.mute();
          muteBtn.innerHTML = '<i class="bi bi-volume-mute-fill"></i>';
          muteBtn.title = 'Me zë';
        }
      });
    }
  });
})();
