import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { IconLogo } from "./Icons";

// ── Pupil ──────────────────────────────────────────────────────────────────────
const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY }) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calcPos = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = pupilRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = mouseX - cx, dy = mouseY - cy;
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  };

  const pos = calcPos();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: size, height: size, backgroundColor: pupilColor,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: "transform 0.1s ease-out",
      }}
    />
  );
};

// ── EyeBall ────────────────────────────────────────────────────────────────────
const EyeBall = ({
  size = 48, pupilSize = 16, maxDistance = 10,
  eyeColor = "white", pupilColor = "black",
  isBlinking = false, forceLookX, forceLookY,
}) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calcPos = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = eyeRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = mouseX - cx, dy = mouseY - cy;
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  };

  const pos = calcPos();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: size, height: isBlinking ? 2 : size,
        backgroundColor: eyeColor, overflow: "hidden",
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: pupilSize, height: pupilSize, backgroundColor: pupilColor,
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
      )}
    </div>
  );
};

// ── AnimatedCharactersPanel ────────────────────────────────────────────────────
// Pass isPasswordFocused=true when the password field is being typed into
// Pass showPassword=true when the password is visible (eye icon toggled)
export function AnimatedCharactersPanel({ isTyping = false, password = "", showPassword = false }) {
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const purpleRef = useRef(null);
  const blackRef = useRef(null);
  const yellowRef = useRef(null);
  const orangeRef = useRef(null);

  useEffect(() => {
    const h = (e) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  // Blinking – purple
  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => { setIsPurpleBlinking(false); schedule(); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  // Blinking – black
  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => { setIsBlackBlinking(false); schedule(); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  // Glance at each other when typing starts
  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  // Purple sneaky peek when password is visible
  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const schedule = () => {
        const t = setTimeout(() => {
          setIsPurplePeeking(true);
          setTimeout(() => setIsPurplePeeking(false), 800);
        }, Math.random() * 3000 + 2000);
        return t;
      };
      const t = schedule();
      return () => clearTimeout(t);
    } else {
      setIsPurplePeeking(false);
    }
  }, [password, showPassword, isPurplePeeking]);

  const calcPos = (ref) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 3;
    const dx = mouseX - cx, dy = mouseY - cy;
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };

  const pp = calcPos(purpleRef);
  const bp = calcPos(blackRef);
  const yp = calcPos(yellowRef);
  const op = calcPos(orangeRef);

  const hidingPassword = password.length > 0 && !showPassword;
  const passwordVisible = password.length > 0 && showPassword;

  return (
    <div className="relative hidden lg:flex flex-col justify-between p-12 text-white min-h-screen" style={{ background: '#1a1a2e' }}>
      {/* Logo */}
      <div className="relative z-20">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <IconLogo size={16} style={{ color: '#e9a84c' }} />
          </div>
          <span>NexusBoard</span>
        </Link>
      </div>

      {/* Characters */}
      <div className="relative z-20 flex items-end justify-center h-[500px]">
        <div className="relative" style={{ width: 550, height: 400 }}>

          {/* Purple – back */}
          <div
            ref={purpleRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: 70, width: 180,
              height: (isTyping || hidingPassword) ? 440 : 400,
              backgroundColor: "#e9a84c",
              borderRadius: "10px 10px 0 0",
              zIndex: 1,
              transform: passwordVisible
                ? "skewX(0deg)"
                : (isTyping || hidingPassword)
                  ? `skewX(${(pp.bodySkew || 0) - 12}deg) translateX(40px)`
                  : `skewX(${pp.bodySkew || 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="absolute flex gap-8 transition-all duration-700 ease-in-out"
              style={{
                left: passwordVisible ? 20 : isLookingAtEachOther ? 55 : 45 + pp.faceX,
                top: passwordVisible ? 35 : isLookingAtEachOther ? 65 : 40 + pp.faceY,
              }}
            >
              {[0, 1].map((i) => (
                <EyeBall key={i} size={18} pupilSize={7} maxDistance={5}
                  eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking}
                  forceLookX={passwordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={passwordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
              ))}
            </div>
          </div>

          {/* Black – middle */}
          <div
            ref={blackRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: 240, width: 120, height: 310,
              backgroundColor: "#2D2D2D",
              borderRadius: "8px 8px 0 0",
              zIndex: 2,
              transform: passwordVisible
                ? "skewX(0deg)"
                : isLookingAtEachOther
                  ? `skewX(${(bp.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                  : (isTyping || hidingPassword)
                    ? `skewX(${(bp.bodySkew || 0) * 1.5}deg)`
                    : `skewX(${bp.bodySkew || 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="absolute flex gap-6 transition-all duration-700 ease-in-out"
              style={{
                left: passwordVisible ? 10 : isLookingAtEachOther ? 32 : 26 + bp.faceX,
                top: passwordVisible ? 28 : isLookingAtEachOther ? 12 : 32 + bp.faceY,
              }}
            >
              {[0, 1].map((i) => (
                <EyeBall key={i} size={16} pupilSize={6} maxDistance={4}
                  eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking}
                  forceLookX={passwordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={passwordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
              ))}
            </div>
          </div>

          {/* Orange semi-circle – front left */}
          <div
            ref={orangeRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: 0, width: 240, height: 200,
              backgroundColor: "#FF9B6B",
              borderRadius: "120px 120px 0 0",
              zIndex: 3,
              transform: passwordVisible ? "skewX(0deg)" : `skewX(${op.bodySkew || 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="absolute flex gap-8 transition-all duration-200 ease-out"
              style={{
                left: passwordVisible ? 50 : 82 + (op.faceX || 0),
                top: passwordVisible ? 85 : 90 + (op.faceY || 0),
              }}
            >
              {[0, 1].map((i) => (
                <Pupil key={i} size={12} maxDistance={5} pupilColor="#2D2D2D"
                  forceLookX={passwordVisible ? -5 : undefined}
                  forceLookY={passwordVisible ? -4 : undefined}
                />
              ))}
            </div>
          </div>

          {/* Yellow rounded rect – front right */}
          <div
            ref={yellowRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: 310, width: 140, height: 230,
              backgroundColor: "#E8D754",
              borderRadius: "70px 70px 0 0",
              zIndex: 4,
              transform: passwordVisible ? "skewX(0deg)" : `skewX(${yp.bodySkew || 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="absolute flex gap-6 transition-all duration-200 ease-out"
              style={{
                left: passwordVisible ? 20 : 52 + (yp.faceX || 0),
                top: passwordVisible ? 35 : 40 + (yp.faceY || 0),
              }}
            >
              {[0, 1].map((i) => (
                <Pupil key={i} size={12} maxDistance={5} pupilColor="#2D2D2D"
                  forceLookX={passwordVisible ? -5 : undefined}
                  forceLookY={passwordVisible ? -4 : undefined}
                />
              ))}
            </div>
            {/* Mouth */}
            <div
              className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
              style={{
                left: passwordVisible ? 10 : 40 + (yp.faceX || 0),
                top: passwordVisible ? 88 : 88 + (yp.faceY || 0),
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer links */}
      <div className="relative z-20 flex items-center gap-8 text-sm text-white/60">
        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        <a href="#" className="hover:text-white transition-colors">Contact</a>
      </div>

      {/* Decorative blobs */}
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
    </div>
  );
}

// ── AuthLayout ─────────────────────────────────────────────────────────────────
// Wraps all auth pages in the split-screen layout
export function AuthLayout({ children, isTyping, password, showPassword }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AnimatedCharactersPanel isTyping={isTyping} password={password} showPassword={showPassword} />
      <div className="flex items-center justify-center p-8" style={{ background: '#f7f5f0' }}>
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
            <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: '#1a1a2e' }}>
                <IconLogo size={16} style={{ color: '#e9a84c' }} />
              </div>
              <span>NexusBoard</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
