// Oscillator: drives the hue cycling
function Oscillator(opts) {
    this.phase = opts.phase || 0;
    this.offset = opts.offset || 0;
    this.frequency = opts.frequency || 0.001;
    this.amplitude = opts.amplitude || 1;
}
Oscillator.prototype.update = function () {
    this.phase += this.frequency;
    this._value = this.offset + Math.sin(this.phase) * this.amplitude;
    return this._value;
};
Oscillator.prototype.value = function () {
    return this._value;
};

// Node: a single point in a Line's spring chain
function Node() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
}

// Config — tuned for 60 fps on mid-range devices
var E = {
    friction: 0.5,
    trails: 45,    // was 80 — 45×28 = 1,260 nodes vs 4,000
    size: 28,      // was 50
    dampening: 0.025,
    tension: 0.99,
};

// State
var ctx;
var rafId;
var hueOsc;
var pos = { x: 0, y: 0 };
var lines = [];
var resizeTimer;
var boundOnFocus;
var boundOnBlur;
var boundOnVisibilityChange;

// Line: a spring chain of Nodes that follows the cursor
function Line(opts) {
    this.spring = opts.spring + 0.1 * Math.random() - 0.05;
    this.friction = E.friction + 0.01 * Math.random() - 0.005;
    this.nodes = [];
    for (var i = 0; i < E.size; i++) {
        var node = new Node();
        node.x = pos.x;
        node.y = pos.y;
        this.nodes.push(node);
    }
}
Line.prototype.update = function () {
    var spring = this.spring;
    var head = this.nodes[0];
    head.vx += (pos.x - head.x) * spring;
    head.vy += (pos.y - head.y) * spring;

    for (var i = 0, len = this.nodes.length; i < len; i++) {
        var node = this.nodes[i];
        if (i > 0) {
            var prev = this.nodes[i - 1];
            node.vx += (prev.x - node.x) * spring;
            node.vy += (prev.y - node.y) * spring;
            node.vx += prev.vx * E.dampening;
            node.vy += prev.vy * E.dampening;
        }
        node.vx *= this.friction;
        node.vy *= this.friction;
        node.x += node.vx;
        node.y += node.vy;
        spring *= E.tension;
    }
};
Line.prototype.draw = function () {
    var x = this.nodes[0].x;
    var y = this.nodes[0].y;
    ctx.beginPath();
    ctx.moveTo(x, y);
    var limit = this.nodes.length - 2;
    for (var i = 1; i < limit; i++) {
        var a = this.nodes[i];
        var b = this.nodes[i + 1];
        x = 0.5 * (a.x + b.x);
        y = 0.5 * (a.y + b.y);
        ctx.quadraticCurveTo(a.x, a.y, x, y);
    }
    var a = this.nodes[limit];
    var b = this.nodes[limit + 1];
    ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
    ctx.stroke();
    ctx.closePath();
};

function buildLines() {
    lines = [];
    for (var i = 0; i < E.trails; i++) {
        lines.push(new Line({ spring: 0.45 + (i / E.trails) * 0.025 }));
    }
}

function onMove(e) {
    if (e.touches) {
        pos.x = e.touches[0].pageX;
        pos.y = e.touches[0].pageY;
    } else {
        pos.x = e.clientX;
        pos.y = e.clientY;
    }
    e.preventDefault();
}

function onTouchStart(e) {
    if (e.touches.length === 1) {
        pos.x = e.touches[0].pageX;
        pos.y = e.touches[0].pageY;
    }
}

function onFirstInteraction(e) {
    document.removeEventListener("mousemove", onFirstInteraction);
    document.removeEventListener("touchstart", onFirstInteraction);
    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchstart", onTouchStart);
    onMove(e);
    buildLines();
    render();
}

function render() {
    if (!ctx) return;
    if (!ctx.running) return;
    if (!hueOsc || !lines || lines.length === 0) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle =
        "hsla(" + Math.round(hueOsc.update()) + ",100%,50%,0.025)";
    ctx.lineWidth = 10;
    for (var i = 0; i < E.trails; i++) {
        if (lines[i]) {
            lines[i].update();
            lines[i].draw();
        }
    }
    ctx.frame++;
    rafId = window.requestAnimationFrame(render);
}

function resizeCanvas() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        if (!ctx) return;
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
    }, 150); // debounce — skip thrashing every pixel
}

export function renderCanvas() {
    var canvas = document.getElementById("doodle-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    ctx.running = true;
    ctx.frame = 1;

    hueOsc = new Oscillator({
        phase: Math.random() * 2 * Math.PI,
        amplitude: 85,
        frequency: 0.0015,
        offset: 285,
    });

    document.addEventListener("mousemove", onFirstInteraction, { passive: false });
    document.addEventListener("touchstart", onFirstInteraction, { passive: false });
    window.addEventListener("resize", resizeCanvas);
    document.body.addEventListener("orientationchange", resizeCanvas);

    boundOnFocus = function () {
        if (ctx && !ctx.running) {
            ctx.running = true;
            rafId = requestAnimationFrame(render);
        }
    };
    boundOnBlur = function () {
        if (ctx) {
            ctx.running = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        }
    };
    boundOnVisibilityChange = function () {
        if (document.hidden) {
            if (ctx) ctx.running = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        } else if (ctx) {
            ctx.running = true;
            rafId = requestAnimationFrame(render);
        }
    };
    window.addEventListener('focus', boundOnFocus);
    window.addEventListener('blur', boundOnBlur);
    document.addEventListener('visibilitychange', boundOnVisibilityChange);

    resizeCanvas();
}

export function destroyCanvas() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (ctx) {
        ctx.running = false;
        try {
            if (ctx.canvas) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        } catch (_) {}
    }
    document.removeEventListener('mousemove', onFirstInteraction);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onMove);
    window.removeEventListener('resize', resizeCanvas);
    if (boundOnFocus) window.removeEventListener('focus', boundOnFocus);
    if (boundOnBlur) window.removeEventListener('blur', boundOnBlur);
    if (boundOnVisibilityChange) document.removeEventListener('visibilitychange', boundOnVisibilityChange);
    document.body.removeEventListener('orientationchange', resizeCanvas);
    clearTimeout(resizeTimer);
    lines = [];
    hueOsc = null;
    ctx = null;
}
