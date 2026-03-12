"use client";

import { useState, useEffect, useRef, useLayoutEffect, type CSSProperties } from 'react';
import { RefreshCw, Globe, Shield, Monitor, Smartphone } from 'lucide-react';

// ===========================================
// VIEWPORT SIZE SETTINGS
// ===========================================
const DESKTOP_WIDTH = 1400;
const DESKTOP_HEIGHT = 784;
const MOBILE_WIDTH = 418;
const MOBILE_HEIGHT = 714;
const MOBILE_ICON_BUTTON_SIZE = 44;
const MOBILE_ICON_SIZE = 20;
const MOBILE_TOOLBAR_MIN_HEIGHT = 56;

const MOBILE_WEBSITE_DESKTOP_DEMO_ICON_SIZE = 18;
const MOBILE_WEBSITE_DESKTOP_DEMO_BUTTON_SIZE = 36;
// ===========================================

export interface InteractiveDemoProps {
  url?: string;
  showAdminTab?: boolean;
  adminPath?: string;
  forceMobileView?: boolean;
}

export default function InteractiveDemo({
  url = 'https://hairhypejuniordemoforwebsite.netlify.app',
  showAdminTab = true,
  adminPath = '/admin',
  forceMobileView = false
}: InteractiveDemoProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
  });
  const [activeTab, setActiveTab] = useState<'main' | 'admin'>('main');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    if (forceMobileView) return 'mobile';
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return 'mobile';
    return 'desktop';
  });
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  const [desktopContainerSize, setDesktopContainerSize] = useState({
    width: 0,
    height: 0,
  });

  const [mobileToolbarHeight, setMobileToolbarHeight] = useState(52);
  const [mobileScale, setMobileScale] = useState(1);
  const [mobileScaledHeight, setMobileScaledHeight] = useState(MOBILE_HEIGHT);

  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const phoneScreenRef = useRef<HTMLDivElement | null>(null);
  const phoneToolbarRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const viewport =
    viewMode === 'mobile'
      ? { width: MOBILE_WIDTH, height: MOBILE_HEIGHT }
      : { width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT };

  const getCurrentUrl = () =>
    activeTab === 'admin' ? `${url}${adminPath}` : url;

  const mobileTabBase =
    'mobile-demo-icon-button inline-flex items-center justify-center h-11 w-11 p-2 rounded-md transition-all leading-none';
  const mobileTabInactive = 'text-white/80 hover:text-white hover:bg-white/10';
  const mobileTabActive = 'bg-white text-slate-900 shadow-inner';
  const getMobileIconClass = (tab: 'main' | 'admin') =>
    `w-5 h-5 ${activeTab === tab ? 'text-slate-900' : 'text-white'}`;

  // ===== DESKTOP SIZE / SCALE =====
  useEffect(() => {
    if (viewMode !== 'desktop') return;

    const updateSize = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setDesktopContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    const timeout = setTimeout(updateSize, 100);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeout);
    };
  }, [isFullscreen, viewMode]);

  const desktopScale =
    desktopContainerSize.width === 0 || desktopContainerSize.height === 0
      ? 0.5
      : Math.min(
          desktopContainerSize.width / viewport.width,
          desktopContainerSize.height / viewport.height
        );

  const desktopScaledWidth = viewport.width * desktopScale;
  const desktopScaledHeight = viewport.height * desktopScale;

  // ===== MOBILE SIZE / SCALE =====
  useLayoutEffect(() => {
    if (viewMode !== 'mobile') return;

    const updateToolbarHeight = () => {
      if (!phoneToolbarRef.current) return;
      setMobileToolbarHeight(phoneToolbarRef.current.offsetHeight);
    };

    updateToolbarHeight();
    window.addEventListener('resize', updateToolbarHeight);
    return () => {
      window.removeEventListener('resize', updateToolbarHeight);
    };
  }, [viewMode]);

  useLayoutEffect(() => {
    if (viewMode !== 'mobile') return;

    const updateScale = () => {
      if (!phoneScreenRef.current) return;
      const width = phoneScreenRef.current.offsetWidth;
      const newScale = width / viewport.width;
      setMobileScale(newScale);
      setMobileScaledHeight(viewport.height * newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, [viewMode, viewport.width, viewport.height]);

  const handleTabChange = (tab: 'main' | 'admin') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setIsLoading(true);
    setHasError(false);
    if (iframeRef.current) {
      iframeRef.current.src = tab === 'admin' ? `${url}${adminPath}` : url;
    }
  };

  const handleViewModeChange = (mode: 'desktop' | 'mobile') => {
    if (forceMobileView && mode === 'desktop' && !isSmallScreen) return;
    if (mode === viewMode) return;
    setViewMode(mode);
    setIsLoading(true);
    setHasError(false);
    if (iframeRef.current) {
      iframeRef.current.src = getCurrentUrl();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (forceMobileView) {
      setViewMode('mobile');
    }
  }, [forceMobileView]);

  useEffect(() => {
    const handleResize = () => {
      const small = window.innerWidth < 1024;
      setIsSmallScreen(small);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const refreshIframe = () => {
    setIsLoading(true);
    setHasError(false);
    if (iframeRef.current) {
      iframeRef.current.src = getCurrentUrl();
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  useEffect(() => {
    if (isDevelopment) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    const originalError = console.error;
    const errorHandler = (message: unknown, ...args: unknown[]) => {
      const messageStr = String(message);
      if (messageStr.includes('frame-ancestors') || messageStr.includes('Refused to frame')) {
        setIsLoading(false);
        setHasError(true);
      }
      originalError(message, ...args);
    };
    console.error = errorHandler;

    const timeout = setTimeout(() => {
      if (isLoading && iframeRef.current) {
        try {
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
          if (!iframeDoc) {
            setIsLoading(false);
            setHasError(true);
          }
        } catch {
          setIsLoading(false);
          setHasError(true);
        }
      }
    }, 5000);

    return () => {
      console.error = originalError;
      clearTimeout(timeout);
    };
  }, [isLoading, url, adminPath, activeTab, isDevelopment]);

  // ===== MOBILE PHONE VIEW =====
  if (viewMode === 'mobile') {
    return (
      <div
        ref={fullscreenRef}
        className={`mobile-demo flex justify-center ${
          isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 items-center' : ''
        }`}
      >
        <div
          className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50 bg-slate-950 border border-white/10"
          style={{
            width: isFullscreen ? 'min(380px, 90vw)' : 'min(320px, 92vw)',
            height: isFullscreen ? '85vh' : 'min(720px, 84vh)',
            maxHeight: '880px',
            '--mobile-demo-button-size': `${MOBILE_ICON_BUTTON_SIZE}px`,
            '--mobile-demo-icon-size': `${MOBILE_ICON_SIZE}px`,
          } as CSSProperties}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30" />

          <div
            ref={phoneToolbarRef}
            className="mobile-demo-toolbar absolute top-0 left-0 right-0 z-30 bg-zinc-900 pt-8 pb-2 px-2"
            style={{ minHeight: MOBILE_TOOLBAR_MIN_HEIGHT }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-zinc-800 rounded-lg p-1 gap-1">
                <button
                  onClick={() => handleTabChange('main')}
                  aria-label="Website"
                  className={`${mobileTabBase} ${
                    activeTab === 'main' ? mobileTabActive : mobileTabInactive
                  }`}
                  title="Website"
                >
                  <Globe className={getMobileIconClass('main')} />
                </button>
                {showAdminTab && (
                  <button
                    onClick={() => handleTabChange('admin')}
                    aria-label="Admin"
                    className={`${mobileTabBase} mobile-demo-lift-bg ${
                      activeTab === 'admin' ? mobileTabActive : mobileTabInactive
                    }`}
                    style={{ transform: 'translateY(0px)' }}
                    title="Admin"
                  >
                    <Shield className={`mobile-demo-lift ${getMobileIconClass('admin')}`} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleViewModeChange('desktop')}
                  className="mobile-demo-icon-button inline-flex h-11 w-11 items-center justify-center p-2 text-white/70 hover:text-white rounded-md hover:bg-white/10 leading-none"
                  title="Desktop view"
                >
                  <Monitor className="w-5 h-5" />
                </button>
                <button
                  onClick={refreshIframe}
                  className="mobile-demo-icon-button mobile-demo-lift-bg inline-flex h-11 w-11 items-center justify-center p-2 text-white/70 hover:text-white rounded-md hover:bg-white/10 leading-none"
                  style={{ transform: 'translateY(0px)' }}
                  title="Refresh"
                >
                  <RefreshCw className={`mobile-demo-lift w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div
            className="absolute left-0 right-0 bottom-5 overflow-hidden"
            style={{ top: mobileToolbarHeight }}
          >
            <div
              ref={phoneScreenRef}
              className="mx-3 overflow-hidden"
              style={{ height: mobileScaledHeight }}
            >
              {isLoading && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {hasError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
                  <div className="text-center px-4">
                    <p className="text-white/80 text-sm mb-2">Demo unavailable</p>
                    <p className="text-white/60 text-xs mb-1">
                      {isDevelopment
                        ? 'The demo cannot be loaded on localhost due to security restrictions. It will work on production domains (webinteli.lt, webinteli.com).'
                        : 'The demo cannot be loaded in this environment.'}
                    </p>
                    {!isDevelopment && (
                      <button
                        onClick={refreshIframe}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden w-full">
                  <iframe
                    ref={iframeRef}
                    src={getCurrentUrl()}
                    width={viewport.width}
                    height={viewport.height}
                    className="border-0 bg-white block"
                    style={{
                      transform: `scale(${mobileScale})`,
                      transformOrigin: 'top left',
                    }}
                    onLoad={() => {
                      setIsLoading(false);
                      setHasError(false);
                    }}
                    onError={handleIframeError}
                    title="Demo"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full z-20" />
        </div>
      </div>
    );
  }

  // ===== DESKTOP BROWSER VIEW =====
  const desktopDemoMobileStyles = isSmallScreen ? {
    '--desktop-demo-icon-size': `${MOBILE_WEBSITE_DESKTOP_DEMO_ICON_SIZE}px`,
    '--desktop-demo-button-size': `${MOBILE_WEBSITE_DESKTOP_DEMO_BUTTON_SIZE}px`,
  } as React.CSSProperties : {};

  return (
    <div
      ref={fullscreenRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-hidden flex items-center justify-center desktop-demo'
          : 'w-full flex justify-start desktop-demo'
      }
      style={desktopDemoMobileStyles}
    >
      <div
        className={
          isFullscreen
            ? 'rounded-xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl w-full h-full max-w-6xl flex flex-col'
            : 'rounded-xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl max-w-5xl w-full flex flex-col'
        }
      >
        <div className="bg-slate-800 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center px-3 md:px-4 py-2 gap-2 md:gap-3 desktop-demo-toolbar">
            {!isSmallScreen && (
              <div className="flex gap-1.5 desktop-demo-traffic-lights">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            )}

            <div className="flex items-center gap-1 ml-2 md:ml-3 desktop-demo-tab-group">
              {isSmallScreen ? (
                <>
                  <button
                    onClick={() => handleTabChange('main')}
                    className={`desktop-demo-icon-button inline-flex items-center justify-center rounded-lg transition-all border ${
                      activeTab === 'main'
                        ? 'bg-slate-700 text-white shadow-lg border-white/20'
                        : 'text-slate-200 hover:text-white hover:bg-slate-700/60 border-white/10'
                    }`}
                    title="Website"
                  >
                    <Globe className="desktop-demo-icon" />
                  </button>
                  {showAdminTab && (
                    <button
                      onClick={() => handleTabChange('admin')}
                      className={`desktop-demo-icon-button inline-flex items-center justify-center rounded-lg transition-all border ${
                        activeTab === 'admin'
                          ? 'bg-slate-700 text-white shadow-lg border-white/20'
                          : 'text-slate-200 hover:text-white hover:bg-slate-700/60 border-white/10'
                      }`}
                      title="Admin"
                    >
                      <Shield className="desktop-demo-icon" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleTabChange('main')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      activeTab === 'main'
                        ? 'bg-slate-700 text-white shadow-lg border-white/20'
                        : 'text-slate-200 hover:text-white hover:bg-slate-700/60 border-white/10'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Website</span>
                  </button>
                  {showAdminTab && (
                    <button
                      onClick={() => handleTabChange('admin')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        activeTab === 'admin'
                          ? 'bg-slate-700 text-white shadow-lg border-white/20'
                          : 'text-slate-200 hover:text-white hover:bg-slate-700/60 border-white/10'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex-1" />

            <button
              onClick={() => handleViewModeChange('mobile')}
              className={`desktop-demo-icon-button inline-flex items-center justify-center rounded-lg bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all ${isSmallScreen ? '' : 'p-2'}`}
              title="Switch to mobile view"
            >
              <Smartphone className="desktop-demo-icon" />
            </button>

            <button
              onClick={refreshIframe}
              className={`desktop-demo-icon-button inline-flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 ${isSmallScreen ? '' : 'p-2'}`}
              title="Refresh"
            >
              <RefreshCw className={`desktop-demo-icon ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div
          ref={wrapperRef}
          className={`relative overflow-hidden bg-slate-950 w-full ${
            isFullscreen ? 'flex-1' : 'aspect-video'
          }`}
        >
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-400 text-sm">Loading...</span>
              </div>
            </div>
          )}

          {hasError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-20">
              <div className="text-center px-4">
                <p className="text-slate-300 text-sm mb-2">Demo unavailable</p>
                <p className="text-slate-400 text-xs mb-4">
                  {isDevelopment
                    ? 'The demo cannot be loaded on localhost due to security restrictions. It will work on production domains (webinteli.lt, webinteli.com).'
                    : 'The demo cannot be loaded in this environment.'}
                </p>
                {!isDevelopment && (
                  <button
                    onClick={refreshIframe}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className="overflow-hidden mx-auto mv-left-10"
              style={{
                width: desktopScaledWidth,
                height: desktopScaledHeight,
                maxWidth: '100%',
              }}
            >
              <iframe
                ref={iframeRef}
                src={getCurrentUrl()}
                width={viewport.width}
                height={viewport.height}
                className="border-0 bg-white"
                style={{
                  transform: `scale(${desktopScale})`,
                  transformOrigin: 'top left',
                }}
                onLoad={() => {
                  setIsLoading(false);
                  setHasError(false);
                }}
                onError={handleIframeError}
                title="Demo"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
              />
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 border-t border-white/5 px-3 py-1 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Demo
          </span>
          <span>
            {viewport.width} × {viewport.height}
          </span>
        </div>
      </div>
    </div>
  );
}
