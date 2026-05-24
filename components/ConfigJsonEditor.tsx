'use client';
import React, { useState } from 'react';

export default function ConfigJsonEditor({
  configObj,
  onClose,
  onSave
}: {
  configObj: any;
  onClose: () => void;
  onSave: (newConfig: any) => void;
}) {
  const [jsonText, setJsonText] = useState(JSON.stringify(configObj, null, 2));
  const [error, setError] = useState('');

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onSave(parsed);
    } catch (e: any) {
      setError('Invalid JSON: ' + e.message);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '800px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', height: '80vh' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>⚙️ Raw JSON Editor: Active Rules</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>

        <textarea 
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setError('');
          }}
          style={{ flex: 1, width: '100%', background: '#0b0f19', color: '#38bdf8', fontFamily: 'monospace', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', resize: 'none', fontSize: '0.9rem', marginBottom: '15px' }}
          spellCheck={false}
        />

        {error && <div style={{ color: 'var(--danger)', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
