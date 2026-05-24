'use client';
import React, { useRef, useState } from 'react';

export default function UploadStagingArea({
  onUploadSuccess
}: {
  onUploadSuccess: (packages: string[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.json'));
    if (dropped.length === 0) {
      alert("Please select or drop valid CycloneDX BOM JSON files.");
      return;
    }
    const newFiles = dropped.filter(f => !files.some(existing => existing.name === f.name));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).filter(f => f.name.endsWith('.json'));
    if (selected.length === 0) {
      alert("Please select valid CycloneDX BOM JSON files.");
      return;
    }
    const newFiles = selected.filter(f => !files.some(existing => existing.name === f.name));
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = ''; // Reset
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);

    try {
      const payloadFiles = [];
      for (const file of files) {
        const text = await file.text();
        payloadFiles.push({ name: file.name, content: text });
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloadFiles })
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      setFiles([]);
      onUploadSuccess(data.packages || []);
    } catch (err: any) {
      alert('Upload Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-section" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
      <div 
        className={`dropzone ${isDragOver ? 'dragover' : ''}`}
        style={{ flex: 1, marginBottom: 0 }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading 
          ? `⏳ Uploading ${files.length} file(s) to server...`
          : <>📂 Drag & Drop CycloneDX BOM files (.json) here or <strong>click to browse</strong></>
        }
        <input 
          type="file" 
          ref={fileInputRef} 
          multiple 
          accept=".json" 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
      </div>
      
      <div id="pending-files-panel" style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '20px', boxShadow: 'var(--card-shadow)', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📦</span> Pending Uploads
          </h3>
          <span style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {files.length} files
          </span>
        </div>
        <div id="pending-files-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '150px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px', border: '1px dashed var(--border-color)', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '120px' }}>
          {files.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '2rem', opacity: 0.6, filter: 'grayscale(100%)' }}>📥</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>No files staged yet</span>
              <span style={{ fontSize: '0.8rem' }}>Drag and drop BOM files to the left.</span>
            </div>
          ) : (
            files.map((f, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)', borderRadius: '6px', fontWeight: 500, color: 'var(--text-primary)' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>📄 {f.name}</span>
                <button 
                  onClick={() => removeFile(index)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                  title="Remove this file"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            className="theme-btn" 
            disabled={files.length === 0 || isUploading}
            onClick={() => setFiles([])}
            style={{ opacity: files.length === 0 ? 0.5 : 1, cursor: files.length === 0 ? 'not-allowed' : 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            Clear
          </button>
          <button 
            className="theme-btn" 
            disabled={files.length === 0 || isUploading}
            onClick={handleUpload}
            style={{ background: 'var(--primary)', color: 'white', opacity: files.length === 0 ? 0.5 : 1, cursor: files.length === 0 ? 'not-allowed' : 'pointer', border: '1px solid var(--primary)' }}
          >
            {isUploading ? 'Uploading...' : 'Upload & Scan'}
          </button>
        </div>
      </div>
    </div>
  );
}
