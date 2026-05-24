'use client';
import React, { useState } from 'react';

export default function MappingModal({
  slug,
  mappings,
  detectedPackages,
  onClose,
  onAddMapping,
  onRemoveMapping
}: {
  slug: string;
  mappings: any[];
  detectedPackages: string[];
  onClose: () => void;
  onAddMapping: (slug: string, mapping: any) => void;
  onRemoveMapping: (slug: string, index: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [manualInput, setManualInput] = useState('');

  const filteredPackages = detectedPackages.filter(p => p.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '600px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>⚙️ Map Packages: {slug}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>

        <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Mappings:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {mappings.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No packages mapped yet.</span> : null}
            {mappings.map((m, idx) => (
              <div key={idx} style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {m.group ? <span style={{ opacity: 0.7 }}>{m.group} /</span> : null} 
                <span>{m.name || '*'}</span>
                <button 
                  onClick={() => onRemoveMapping(slug, idx)} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: 'var(--text-primary)', 
                    cursor: 'pointer', 
                    marginLeft: '6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    lineHeight: 1
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.5)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Add Detected Package:</h4>
          <input 
            type="text" 
            placeholder="Search detected packages..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', marginBottom: '10px' }}
          />
          <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            {filteredPackages.length === 0 ? <div style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No packages found.</div> : null}
            {filteredPackages.map(p => (
              <div 
                key={p} 
                onClick={() => {
                  let group, name;
                  if (p.includes(':')) {
                    [group, name] = p.split(':');
                  } else {
                    name = p;
                  }
                  onAddMapping(slug, { group, name });
                }}
                style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                + {p}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Or Add Manual Package:</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="group:name OR name" 
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
            />
            <button 
              onClick={() => {
                if (!manualInput) return;
                let group, name;
                if (manualInput.includes(':')) {
                  [group, name] = manualInput.split(':');
                } else {
                  name = manualInput;
                }
                onAddMapping(slug, { group, name });
                setManualInput('');
              }}
              style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Add
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
