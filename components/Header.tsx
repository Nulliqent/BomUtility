'use client';
import React, { useState, useEffect } from 'react';

export default function Header({ 
  productCount, 
  activeCount, 
  bomsCount,
  onConfigClick
}: {
  productCount: number;
  activeCount: number;
  bomsCount: number;
  onConfigClick: () => void;
}) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <header>
      <div className="header-container">
        <div className="logo-section">
          <div className="logo-icon">💠</div>
          <div className="logo-text">
            <h1>Dynamic Configurator</h1>
            <p>Air-Gapped Security Pipeline</p>
          </div>
        </div>

        <div className="controls-section">
          <div id="status-bar" style={{ display: 'flex', gap: '15px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span id="status-registry"><b style={{ color: 'var(--text-primary)' }}>{productCount}</b> Products Loaded</span>
            <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }}></div>
            <span 
              id="status-config" 
              style={{ color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
              onClick={onConfigClick}
            >
              ⚙️ {activeCount} Active Rules
            </span>
            <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }}></div>
            <span id="status-boms"><b style={{ color: 'var(--text-primary)' }}>{bomsCount}</b> Packages Discovered</span>
          </div>

          <button className="theme-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </div>
    </header>
  );
}
