'use client';

import { useState, useEffect } from 'react';

type MediaAsset = {
  id: string;
  detected_mime_type: string;
  original_filename: string;
  status: string;
};

export default function MediaPicker({
  onSelect,
  buttonLabel = "Pilih Media"
}: {
  onSelect: (mediaId: string) => void;
  buttonLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadMedia() {
    setLoading(true);
    try {
      const res = await fetch('/api/bff/media?page_size=50');
      if (res.ok) {
        const data = await res.json();
        setMedia(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMedia();
    }
  }, [isOpen]);

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded hover:bg-slate-200 border border-slate-300 text-sm"
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Pilih Media</h3>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                Tutup
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center p-8 text-slate-500">Memuat...</div>
              ) : media.length === 0 ? (
                <div className="text-center p-8 text-slate-500">Belum ada media tersedia.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {media.map(asset => (
                    <div 
                      key={asset.id} 
                      className="border rounded cursor-pointer hover:border-indigo-500 hover:ring-2 hover:ring-indigo-200 transition overflow-hidden bg-slate-50"
                      onClick={() => {
                        onSelect(asset.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="aspect-square bg-slate-200 flex items-center justify-center overflow-hidden">
                        {asset.detected_mime_type.startsWith('image/') ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={`/api/bff/media/${asset.id}/content`} alt={asset.original_filename} className="w-full h-full object-cover" 
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTRweCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJyb2tlbjwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                        ) : (
                          <span className="font-bold text-slate-400 text-sm">{asset.detected_mime_type.split('/')[1]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="p-2 text-xs truncate" title={asset.original_filename}>
                        {asset.original_filename}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
