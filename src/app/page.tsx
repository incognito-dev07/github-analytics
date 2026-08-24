'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [username, setUsername] = useState('');
  const [generatedUsername, setGeneratedUsername] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('github_dark');
  const [showGraph, setShowGraph] = useState(true);
  const [showLanguages, setShowLanguages] = useState(true);
  const [showStreak, setShowStreak] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [showProfile, setShowProfile] = useState(true);
  const [hideHtmlCss, setHideHtmlCss] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<any>(null);
  const [markdownCode, setMarkdownCode] = useState('');
  const [copied, setCopied] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const embedSectionRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  function buildParams() {
    const params = new URLSearchParams();
    if (generatedUsername) params.append('username', generatedUsername);
    params.append('theme', selectedTheme);
    if (!showGraph) params.append('graph', 'false');
    if (!showLanguages) params.append('languages', 'false');
    if (!showStreak) params.append('streak', 'false');
    if (!showStats) params.append('stats', 'false');
    if (!showHeader) params.append('header', 'false');
    if (!showSummary) params.append('summary', 'false');
    if (!showProfile) params.append('profile', 'false');
    if (hideHtmlCss) {
      params.append('hide_langs', 'HTML,CSS');
    }
    return params;
  }

  function getImageUrl() {
    const base = window.location.origin;
    return `${base}/api?${buildParams().toString()}`;
  }

  function getMarkdownCode() {
    return `<div align="center">\n  <img src="${getImageUrl()}" alt="GitHub Analytics" />\n</div>`;
  }

  function isDirty() {
    if (!hasLoaded || !generatedConfig) return false;
    const g = generatedConfig;
    return (
      g.selectedTheme !== selectedTheme ||
      g.showGraph !== showGraph ||
      g.showLanguages !== showLanguages ||
      g.showStreak !== showStreak ||
      g.showStats !== showStats ||
      g.showHeader !== showHeader ||
      g.showSummary !== showSummary ||
      g.showProfile !== showProfile ||
      g.hideHtmlCss !== hideHtmlCss
    );
  }

  function preloadImage(url: string) {
    const img = new Image();
    img.src = url;
  }

  function renderPreview() {
    const container = previewContainerRef.current;
    if (!container) return;

    if (!generatedUsername) {
      container.innerHTML = `
        <div class="placeholder">
          <div class="main-text">Enter your username and click Generate</div>
          <div class="sub-text">Your card preview will appear here</div>
        </div>
      `;
      if (embedSectionRef.current) embedSectionRef.current.style.display = 'none';
      return;
    }

    if (isGenerating) {
      container.innerHTML = `
        <div style="position:relative;width:100%;display:flex;justify-content:center;">
          <div class="loading-overlay">
            <div class="spinner"></div>
            <span>Generating preview for <strong>${generatedUsername}</strong>...<br />
            <span class="sub">This may take a moment</span></span>
          </div>
          <img src="${getImageUrl()}&_t=${refreshKey}" 
             style="max-width:100%;height:auto;opacity:0.3;"
             alt="GitHub Analytics Preview" 
             onerror={handleImageError} />
        </div>
      `;
      if (embedSectionRef.current) embedSectionRef.current.style.display = 'none';
      return;
    }

    if (hasError) {
      container.innerHTML = `
        <div class="error-box">
          <div class="icon"><i class="fas fa-exclamation-circle"></i></div>
          <h3>User not found</h3>
          <p>The username "<strong>${generatedUsername}</strong>" does not exist on GitHub.<br />Please check the spelling and try again.</p>
        </div>
      `;
      if (embedSectionRef.current) embedSectionRef.current.style.display = 'none';
      return;
    }

    if (hasLoaded) {
      const imageUrl = getImageUrl();
      preloadImage(imageUrl);

      container.innerHTML = `
        <div style="position:relative;width:100%;display:flex;justify-content:center;">
          <img src="${imageUrl}&_t=${refreshKey}" 
             class="preview-img"
             alt="GitHub Analytics Preview" 
             onerror={handleImageError} />
        </div>
      `;
      if (embedSectionRef.current) {
        embedSectionRef.current.style.display = 'block';
        setMarkdownCode(getMarkdownCode());
      }
      return;
    }

    container.innerHTML = `
      <div class="placeholder">
        <div class="main-text">Enter your username and click Generate</div>
        <div class="sub-text">Your card preview will appear here</div>
      </div>
    `;
    if (embedSectionRef.current) embedSectionRef.current.style.display = 'none';
  }

  const handleImageError = () => {
    setHasError(true);
    setHasLoaded(false);
    setIsGenerating(false);
    renderPreview();
  };

  function handleGenerate() {
    const usernameVal = username.trim();
    if (!usernameVal) return;

    setIsGenerating(true);
    setHasError(false);
    setHasLoaded(false);
    setGeneratedConfig({
      selectedTheme,
      showGraph,
      showLanguages,
      showStreak,
      showStats,
      showHeader,
      showSummary,
      showProfile,
      hideHtmlCss,
    });
    setGeneratedUsername(usernameVal);
    setRefreshKey(Date.now());

    const params = new URLSearchParams();
    params.append('username', usernameVal);
    params.append('theme', selectedTheme);
    if (!showGraph) params.append('graph', 'false');
    if (!showLanguages) params.append('languages', 'false');
    if (!showStreak) params.append('streak', 'false');
    if (!showStats) params.append('stats', 'false');
    if (!showHeader) params.append('header', 'false');
    if (!showSummary) params.append('summary', 'false');
    if (!showProfile) params.append('profile', 'false');
    if (hideHtmlCss) {
      params.append('hide_langs', 'HTML,CSS');
    }
    params.append('_t', Date.now().toString());

    fetch(`/api?${params.toString()}`)
      .then(response => {
        if (response.ok) {
          setHasLoaded(true);
        } else {
          setHasError(true);
        }
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => {
        setIsGenerating(false);
        renderPreview();
        previewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
  }

  function copyToClipboard() {
    const text = markdownCode;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    renderPreview();
  }, [generatedUsername, isGenerating, hasError, hasLoaded, refreshKey, selectedTheme, showGraph, showLanguages, showStreak, showStats, showHeader, showSummary, showProfile, hideHtmlCss]);

  return (
    <div id="root">
      <header>
        <div className="container">
          <div className="logo"><i className="fab fa-github"></i></div>
          <div className="title-group">
            <h1>GitHub Analytics</h1>
            <p>Generate beautiful stats cards for your GitHub profile</p>
          </div>
        </div>
      </header>

      <main>
        <div className="config-section">
          <div className="config-header">
            <i className="fas fa-cog"></i>
            <h2>Configuration</h2>
          </div>

          <div className="username-box">
            <div className="input-row">
              <div className="input-wrapper">
                <input
                  type="text"
                  id="usernameInput"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="Enter username"
                />
                <button className="clear-btn" id="clearBtn" style={{ display: username ? 'flex' : 'none' }} onClick={() => setUsername('')}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <button className="generate-btn" onClick={handleGenerate} disabled={!username.trim() || isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          <div className="controls-grid">
            <div className="control-box card-theme">
              <div className="control-title">
                <i className="fas fa-palette"></i>
                <span>Card Theme</span>
                <div className="theme-toggle-wrapper">
                  <span className="theme-label dark-label">Dark</span>
                  <label className="theme-switch">
                    <input type="checkbox" checked={selectedTheme === 'github_dark'} onChange={() => setSelectedTheme(selectedTheme === 'github_dark' ? 'github_light' : 'github_dark')} />
                    <span className="slider round"></span>
                  </label>
                  <span className="theme-label light-label">Light</span>
                </div>
              </div>
            </div>

            <div className="control-box">
              <div className="control-title">
                <i className="fas fa-layer-group"></i>
                <span>Card Blocks</span>
              </div>
              <div className="checkbox-grid">
                <label>
                  <input type="checkbox" checked={showProfile} onChange={(e) => setShowProfile(e.target.checked)} />
                  <span className="checkmark"></span>
                  <span className="label-text">Developer Name</span>
                </label>
                <label>
                  <input type="checkbox" checked={showSummary} onChange={(e) => setShowSummary(e.target.checked)} />
                  <span className="checkmark"></span>
                  <span className="label-text">Summary Info</span>
                </label>
                <label>
                  <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)} />
                  <span className="checkmark"></span>
                  <span className="label-text">Monthly Chart</span>
                </label>
                <label>
                  <input type="checkbox" checked={showStats} onChange={(e) => setShowStats(e.target.checked)} />
                  <span className="checkmark"></span>
                  <span className="label-text">GitHub Stats</span>
                </label>
                <label>
                  <input type="checkbox" checked={showLanguages} onChange={(e) => setShowLanguages(e.target.checked)} />
                  <span className="checkmark"></span>
                  <span className="label-text">Top Languages</span>
                </label>
                <label>
                  <input type="checkbox" checked={showStreak} onChange={(e) => setShowStreak(e.target.checked)} />
                  <span className="checkmark"></span>
                  <span className="label-text">Streak Monitor</span>
                </label>
                <label>
                  <input type="checkbox" checked={showGraph} onChange={(e) => setShowGraph(e.target.checked)} />
                  <span className="checkmark"></span>
                  <span className="label-text">Contribution Graph</span>
                </label>
                <label>
                  <input type="checkbox" checked={hideHtmlCss} onChange={(e) => setHideHtmlCss(e.target.checked)} />
                  <span className="checkmark"></span>
                  <span className="label-text">Hide HTML &amp; CSS</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div id="preview-section" className="preview-section" ref={previewSectionRef}>
          <div className="preview-header">
            <div className="left">
              <i className="fas fa-eye"></i>
              <h2>Preview</h2>
            </div>
          </div>

          <div className="preview-box" id="previewContainer" ref={previewContainerRef}>
            <div className="placeholder">
              <div className="main-text">Enter your username and click Generate</div>
              <div className="sub-text">Your card preview will appear here</div>
            </div>
          </div>
        </div>

        <div id="embedSection" className="embed-section" style={{ display: 'none' }} ref={embedSectionRef}>
          <div className="embed-header">
            <i className="fas fa-code"></i>
            <h2>Embed Code</h2>
          </div>
          <div className="embed-box">
            <div className="code-label">Markdown</div>
            <div className="code-wrap">
              <pre id="markdownCode">{markdownCode}</pre>
              <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyToClipboard}>
                {copied ? <i className="fas fa-check"></i> : <i className="fas fa-copy"></i>}
              </button>
            </div>
          </div>
        </div>

        <footer>
          <p>
            Free and open source • 
            <a href="https://github.com/incognito-dev07/github-analytics" target="_blank" rel="noopener noreferrer">Contribute on GitHub</a>
          </p>
        </footer>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'PT Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        body {
          background: #0d1117;
          color: #e6edf3;
          min-height: 100vh;
          padding: 12px;
        }

        header {
          background: #161b22;
          border-bottom: 1px solid #30363d;
          padding: 12px 0;
          margin: -12px -12px 16px -12px;
        }

        header .container {
          max-width: 960px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
        }

        header .logo {
          color: #e6edf3;
          font-size: 24px;
        }

        header .title-group {
          flex: 1;
        }

        header .title-group h1 {
          font-size: 18px;
          font-weight: 600;
          color: #e6edf3;
          margin: 0;
        }

        header .title-group p {
          font-size: 12px;
          color: #7d8590;
          margin: 0;
        }

        main {
          max-width: 960px;
          margin: 0 auto;
        }

        .config-section {
          margin-bottom: 16px;
        }

        .config-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #21262d;
        }

        .config-header i {
          color: #7d8590;
        }

        .config-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #e6edf3;
          margin: 0;
        }

        .username-box {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 12px;
        }

        .username-box .input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .username-box .input-wrapper {
          position: relative;
          flex: 1;
          min-width: 0;
        }

        .username-box .input-wrapper input {
          width: 100%;
          padding: 8px 32px 8px 12px;
          font-size: 15px;
          line-height: 20px;
          color: #e6edf3;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          outline: none;
          height: 38px;
        }

        .username-box .input-wrapper input:focus {
          border-color: #58a6ff;
          box-shadow: 0 0 0 1px rgba(31, 111, 235, 0.3);
        }

        .username-box .input-wrapper input::placeholder {
          color: #6e7681;
        }

        .username-box .input-wrapper .clear-btn {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          display: none;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 3px;
          color: #7d8590;
          cursor: pointer;
          font-size: 14px;
        }

        .username-box .input-wrapper .clear-btn.visible {
          display: flex;
        }

        .username-box .input-wrapper .clear-btn:hover {
          color: #e6edf3;
        }

        .username-box .generate-btn {
          padding: 0 18px;
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
          background: #238636;
          border: 1px solid #238636;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          flex: 0 0 auto;
          height: 34px;
          display: flex;
          align-items: center;
        }

        .username-box .generate-btn:hover:not(:disabled) {
          background: #3fb950;
        }

        .username-box .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #161b22;
          border-color: #30363d;
          color: #7d8590;
        }

        .username-box .generate-btn:disabled:hover {
          background: #161b22;
        }

        .controls-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .control-box {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 14px 12px;
        }

        .control-box.card-theme {
          padding: 10px 12px;
          border-radius: 10px;
        }

        .control-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-title i {
          color: #7d8590;
          font-size: 14px;
        }

        .control-title span {
          font-size: 14px;
          font-weight: 600;
          color: #e6edf3;
        }

        .theme-toggle-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .theme-label {
          font-size: 13px;
          font-weight: 600;
          color: #7d8590;
        }

        .theme-label.dark-label {
          color: #e6edf3;
        }

        .theme-label.light-label {
          color: #7d8590;
        }

        .theme-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .theme-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .theme-switch .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #30363d;
          transition: .3s;
          border-radius: 34px;
        }

        .theme-switch .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          right: 3px;
          bottom: 3px;
          background-color: #e6edf3;
          transition: .3s;
          border-radius: 50%;
        }

        .theme-switch input:checked + .slider {
          background-color: #1f6feb;
        }

        .theme-switch input:checked + .slider:before {
          transform: translateX(-20px);
        }

        .checkbox-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .checkbox-grid label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          color: #e6edf3;
          padding: 8px 12px;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .checkbox-grid label:has(input:checked) {
          border-color: #58a6ff;
          background: rgba(88, 166, 255, 0.06);
        }

        .checkbox-grid label .checkmark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border: 2px solid #30363d;
          border-radius: 4px;
          background: #0d1117;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .checkbox-grid label:has(input:checked) .checkmark {
          background: #58a6ff;
          border-color: #58a6ff;
        }

        .checkbox-grid label:has(input:checked) .checkmark:after {
          content: "✓";
          color: #0d1117;
          font-size: 12px;
          font-weight: 700;
        }

        .checkbox-grid label input[type="checkbox"] {
          display: none;
        }

        .checkbox-grid label .label-text {
          font-size: 13px;
          color: #e6edf3;
          font-weight: 400;
        }

        .checkbox-grid label:has(input:checked) .label-text {
          color: #58a6ff;
        }

        .preview-section {
          margin-top: 16px;
        }

        .preview-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #21262d;
        }

        .preview-header .left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .preview-header .left i {
          color: #7d8590;
        }

        .preview-header .left h2 {
          font-size: 16px;
          font-weight: 600;
          color: #e6edf3;
          margin: 0;
        }

        .preview-box {
          background: #010409;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          overflow: auto;
          position: relative;
        }

        .preview-box .placeholder {
          text-align: center;
        }

        .preview-box .placeholder .main-text {
          color: #7d8590;
          font-size: 15px;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .preview-box .placeholder .sub-text {
          color: #6e7681;
          font-size: 13px;
          line-height: 1.4;
        }

        .preview-box .loading-overlay {
          position: absolute;
          width: 90%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 10;
          background: rgba(1, 4, 9, 0.85);
          border: 1px solid #30363d;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
          padding: 20px;
          border-radius: 8px;
        }

        .preview-box .loading-overlay .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #30363d;
          border-top-color: #2f81f7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }

        .preview-box .loading-overlay span {
          color: #7d8590;
          font-size: 14px;
        }

        .preview-box .loading-overlay .sub {
          font-size: 12px;
          color: #6e7681;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .preview-box .error-box {
          text-align: center;
          padding: 16px 0;
        }

        .preview-box .error-box .icon {
          color: #f85149;
          font-size: 24px;
          margin-bottom: 8px;
        }

        .preview-box .error-box h3 {
          font-size: 16px;
          font-weight: 600;
          color: #f85149;
        }

        .preview-box .error-box p {
          font-size: 13px;
          color: #7d8590;
          line-height: 1.5;
        }

        .preview-box .preview-img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }

        .embed-section {
          margin-top: 16px;
        }

        .embed-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #21262d;
        }

        .embed-header i {
          color: #7d8590;
        }

        .embed-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #e6edf3;
          margin: 0;
        }

        .embed-box {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 12px;
        }

        .embed-box .code-label {
          font-size: 11px;
          font-weight: 600;
          color: #7d8590;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .embed-box .code-wrap {
          position: relative;
        }

        .embed-box .code-wrap pre {
          margin: 0;
          padding: 12px;
          padding-right: 48px;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
          color: #e6edf3;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-all;
          line-height: 1.6;
        }

        .embed-box .code-wrap .copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          padding: 0;
          font-size: 14px;
          font-weight: 500;
          color: #7d8590;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .embed-box .code-wrap .copy-btn:hover {
          background: #21262d;
        }

        .embed-box .code-wrap .copy-btn.copied {
          color: #3fb950;
        }

        footer {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #21262d;
          text-align: center;
        }

        footer p {
          margin: 0;
          font-size: 13px;
          color: #e6edf3;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-weight: 500;
        }

        footer a {
          color: #2f81f7;
          text-decoration: none;
          font-weight: 600;
        }

        footer a:hover {
          text-decoration: underline;
        }

        @media (min-width: 768px) {
          body {
            padding: 24px;
          }

          header {
            padding: 16px 0;
            margin: -24px -24px 24px -24px;
          }

          header .container {
            padding: 0 24px;
          }

          header .logo {
            font-size: 28px;
          }

          header .title-group h1 {
            font-size: 20px;
          }

          header .title-group p {
            font-size: 14px;
          }

          .controls-grid {
            grid-template-columns: 1fr 1fr;
          }

          .preview-box {
            padding: 20px;
            min-height: 250px;
          }

          .preview-box .placeholder .main-text {
            font-size: 16px;
          }

          .preview-box .loading-overlay {
            width: 60%;
            padding: 24px;
          }

          .embed-box .code-wrap pre {
            padding: 14px;
            padding-right: 56px;
            font-size: 11px;
          }

          .embed-box .code-wrap .copy-btn {
            width: 32px;
            height: 32px;
          }

          footer p {
            font-size: 14px;
          }
        }
      `}} />
    </div>
  );
}