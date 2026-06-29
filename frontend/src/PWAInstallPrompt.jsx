import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    });
  }, []);
  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-center gap-4 max-w-sm mx-auto">
        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">D</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">DEPMS App Install Karo</p>
          <p className="text-xs text-gray-500 mt-0.5">Home screen pe add karo</p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={install} className="bg-primary-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary-700 flex items-center gap-1">
            <Download className="w-3 h-3" /> Install
          </button>
          <button onClick={() => setShow(false)} className="text-gray-400 text-xs px-3 py-1 flex items-center gap-1">
            <X className="w-3 h-3" /> Baad mein
          </button>
        </div>
      </div>
    </div>
  );
}
