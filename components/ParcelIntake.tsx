
import React, { useState, useRef, useEffect } from 'react';
import { Customer, Parcel, ParcelStatus, Cargo, SalesRepresentative } from '../types';
import { analyzeWaybill } from '../services/geminiService';
import { Camera, Search, Save, Loader2, Wand2, X, Box, Zap, Truck, Scale, Image as ImageIcon, Plus, AlertTriangle } from 'lucide-react';

interface IntakeProps {
  customers: Customer[];
  parcels: Parcel[]; // Passed for duplicate checking
  cargo: Cargo[]; // Passed for duplicate checking
  onAddParcel: (parcel: Parcel) => void;
  onAddCargo: (cargo: Cargo) => void;
  salesReps: SalesRepresentative[];
}

// Simple client-side compression
const compressImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

const UnifiedIntake: React.FC<IntakeProps> = ({ customers, parcels, cargo, onAddParcel, onAddCargo, salesReps }) => {
  // Mode Selection
  const [intakeType, setIntakeType] = useState<'COURIER' | 'CARGO'>('COURIER');
  const [batchMode, setBatchMode] = useState(false);

  // Common Form State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [description, setDescription] = useState('');
  const [pieces, setPieces] = useState<number>(1); // New Field: Pieces
  const [weight, setWeight] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Image State
  const [images, setImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  
  // UI State
  const [customerSearch, setCustomerSearch] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackingInputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    // Auto-focus tracking input when batch mode is active and customer is selected
    if (batchMode && selectedCustomerId && trackingInputRef.current) {
      trackingInputRef.current.focus();
    }
  }, [batchMode, selectedCustomerId]);

  // Duplicate Check Effect
  useEffect(() => {
    if (!trackingNumber) {
        setDuplicateWarning(null);
        return;
    }
    const existsInParcels = parcels.some(p => p.id === trackingNumber || p.trackingNumber === trackingNumber);
    const existsInCargo = cargo.some(c => c.id === trackingNumber || c.trackingNumber === trackingNumber);
    
    if (existsInParcels || existsInCargo) {
        setDuplicateWarning("Duplicate Entry: This ID/Tracking Number already exists in the system!");
    } else {
        setDuplicateWarning(null);
    }
  }, [trackingNumber, parcels, cargo]);

  // Handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Check limit
    if (images.length + files.length > 3) {
      alert("最多上传 3 张图片 (Max 3 images)");
      return;
    }

    setIsCompressing(true);
    const newImages: string[] = [];
    
    // Process first file for AI if it's the first image ever
    const processAI = images.length === 0 && files[0]; 
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const p = new Promise<void>((resolve) => {
        reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          const compressed = await compressImage(rawBase64);
          newImages.push(compressed);
          resolve();
        };
      });
      reader.readAsDataURL(file);
      await p;
    }

    setImages(prev => [...prev, ...newImages]);
    setIsCompressing(false);

    // Trigger AI analysis on the first uploaded image if we have no data yet
    if (processAI && !trackingNumber) {
        setAnalyzing(true);
        const aiResult = await analyzeWaybill(newImages[0]);
        setTrackingNumber(aiResult.trackingNumber || '');
        if (aiResult.weight) setWeight(aiResult.weight);
        if (aiResult.description) setDescription(aiResult.description);
        
        if (aiResult.customerNameHint) {
          setCustomerSearch(aiResult.customerNameHint);
          const match = customers.find(c => 
            c.name.includes(aiResult.customerNameHint!) || 
            c.id.includes(aiResult.customerNameHint!)
          );
          if (match) {
            setSelectedCustomerId(match.id);
            setCustomerSearch(match.name);
          }
        }
        setAnalyzing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = (keepCustomer = false) => {
    setTrackingNumber('');
    setWeight(0);
    setVolume(0);
    setPieces(1);
    setDescription('');
    setNotes('');
    setImages([]);
    setDuplicateWarning(null);
    if (!keepCustomer) {
      setSelectedCustomerId('');
      setCustomerSearch('');
    }
    // Re-focus for batch
    if (keepCustomer && trackingInputRef.current) {
      setTimeout(() => trackingInputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || !selectedCustomerId) return;
    if (duplicateWarning) {
        alert("Cannot submit: Duplicate Tracking Number.");
        return;
    }
    
    if (images.length === 0) {
      alert("请至少上传 1 张货物图片 (At least 1 image required)");
      return;
    }

    // Validation Logic
    if (intakeType === 'CARGO') {
        if (!description) { alert("General Cargo requires Description."); return; }
        if (pieces <= 0) { alert("General Cargo requires valid Pieces."); return; }
        if (volume <= 0) { alert("General Cargo requires Volume."); return; }
        if (weight <= 0) { alert("General Cargo requires Weight."); return; }
    } else {
        // Courier
        if (pieces <= 0) { alert("Pieces required."); return; }
        // Volume is optional for courier
    }

    const commonData = {
      customerId: selectedCustomerId,
      trackingNumber, // This is the Single Identifier Reference
      pieces,
      weight: weight || 0,
      volume: volume || 0,
      notes,
      images: [...images],
    };

    if (intakeType === 'COURIER') {
      const newParcel: Parcel = {
        id: trackingNumber, // ID IS TRACKING NUMBER
        ...commonData,
        description: description || '小件包裹',
        status: ParcelStatus.RECEIVED,
        intakeDate: new Date().toISOString(),
      };
      onAddParcel(newParcel);
    } else {
      const newCargo: Cargo = {
        id: trackingNumber, // ID IS ENTRY NO / TRACKING NO
        ...commonData,
        quantity: pieces, // Map pieces to quantity for compatibility if needed, but primary is pieces
        commodity: description || '普货',
        marking: selectedCustomerId, // Standardize marking as Customer ID
        status: 'RECEIVED',
        intakeDate: new Date().toISOString(),
      };
      onAddCargo(newCargo);
    }

    resetForm(batchMode);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.id.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Type Selection */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex justify-center">
        <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-md">
          <button 
            onClick={() => { setIntakeType('COURIER'); resetForm(); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              intakeType === 'COURIER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Box size={18} /> 快递 / 小件
          </button>
          <button 
            onClick={() => { setIntakeType('CARGO'); setBatchMode(false); resetForm(); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              intakeType === 'CARGO' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck size={18} /> 大宗 / 普货
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center ${intakeType === 'COURIER' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            {intakeType === 'COURIER' ? '快递揽收 (Courier Intake)' : '普货入仓 (General Cargo Intake)'}
          </h2>
          {intakeType === 'COURIER' && (
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg">
              <input 
                type="checkbox" 
                id="batchMode" 
                checked={batchMode} 
                onChange={e => setBatchMode(e.target.checked)}
                className="w-4 h-4 text-indigo-500 rounded focus:ring-0 cursor-pointer"
              />
              <label htmlFor="batchMode" className="text-white text-sm font-medium cursor-pointer select-none flex items-center gap-1">
                <Zap size={14} className={batchMode ? 'text-yellow-300' : 'text-white'} /> 批量扫描模式
              </label>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Identification & Customer */}
          <div className="space-y-6">
            {/* Customer Search */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">客户 / 唛头 (Customer / Mark)</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (selectedCustomerId && e.target.value !== customers.find(c => c.id === selectedCustomerId)?.name) {
                       setSelectedCustomerId(''); // Clear selection if typing
                    }
                  }}
                  disabled={batchMode && !!selectedCustomerId} // Lock in batch mode
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    batchMode && selectedCustomerId ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold' : 'border-slate-300'
                  }`}
                  placeholder="搜索客户 ID 或姓名..."
                />
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                {batchMode && selectedCustomerId && (
                  <button 
                    type="button" 
                    onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-red-500"
                  >
                    <X size={18} />
                  </button>
                )}
                
                {/* Dropdown */}
                {customerSearch && !selectedCustomerId && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <div 
                        key={c.id}
                        className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch(c.name);
                        }}
                      >
                        <div>
                           <div className="font-bold text-slate-800">{c.name}</div>
                           <div className="text-xs text-slate-500">Rep: {salesReps.find(r => r.id === c.salesRepId)?.name || 'N/A'}</div>
                        </div>
                        <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{c.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomerId && (
                 <div className="mt-2 text-xs text-slate-500 flex gap-4">
                    <span>当前选择: <strong className="text-slate-700">{selectedCustomerId}</strong></span>
                 </div>
              )}
            </div>

             {/* Tracking / Entry No */}
             <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                {intakeType === 'COURIER' ? '快递单号 (Tracking No.)' : '入仓号 (Entry No.)'}
              </label>
              <div className="relative">
                <input
                  ref={trackingInputRef}
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className={`w-full pl-4 pr-12 py-3 border rounded-lg focus:ring-2 font-mono text-lg ${
                      duplicateWarning ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                  placeholder="扫描或输入..."
                />
                <button
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Photo Scan"
                >
                  <Camera size={20} />
                </button>
              </div>
              {analyzing && <div className="text-xs text-indigo-600 flex items-center gap-1 mt-1"><Loader2 className="animate-spin" size={12}/> AI 识别中...</div>}
              {duplicateWarning && <div className="text-xs text-red-600 font-bold flex items-center gap-1 mt-1"><AlertTriangle size={12}/> {duplicateWarning}</div>}
            </div>

            {/* Image Upload Area */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                 <span>货物照片 (Photos) <span className="text-red-500">*</span></span>
                 <span className="text-xs font-normal text-slate-500">{images.length}/3 (Min 1)</span>
              </label>
              
              <div className="grid grid-cols-4 gap-2">
                 {images.map((img, idx) => (
                   <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                      <img src={img} alt={`Proof ${idx}`} className="w-full h-full object-cover"/>
                      <button 
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12}/>
                      </button>
                   </div>
                 ))}
                 
                 {images.length < 3 && (
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 cursor-pointer transition-colors bg-slate-50"
                   >
                      {isCompressing ? <Loader2 className="animate-spin" size={24}/> : <Plus size={24}/>}
                      <span className="text-[10px] mt-1 font-medium">Add Photo</span>
                   </div>
                 )}
              </div>
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  multiple // Allow selecting multiple if needed, but logic handles sequential
                  onChange={handleImageUpload}
              />
            </div>

          </div>

          {/* Right Column: Details */}
          <div className="space-y-6">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">
                  货物描述 (Description) 
                  {intakeType === 'CARGO' && <span className="text-red-500">*</span>}
               </label>
               <input
                 type="text"
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                 placeholder={intakeType === 'COURIER' ? "例如: 鞋子, 衣服" : "例如: 机械配件, 家具"}
                 required={intakeType === 'CARGO'}
               />
             </div>

             <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                    件数 (Pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pieces}
                    onChange={(e) => setPieces(parseInt(e.target.value))}
                    className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                    重量 (KG) {intakeType === 'CARGO' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={weight || ''}
                    onChange={(e) => setWeight(parseFloat(e.target.value))}
                    className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.0"
                    required={intakeType === 'CARGO'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                    体积 (CBM) {intakeType === 'CARGO' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={volume || ''}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder={intakeType === 'COURIER' ? "Optional" : "Required"}
                    required={intakeType === 'CARGO'}
                  />
                </div>
             </div>

             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">备注 (Remarks)</label>
               <textarea
                 rows={2}
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="可选..."
               />
             </div>

             <div className="pt-2">
               <button 
                 type="submit"
                 className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                   !selectedCustomerId || !trackingNumber || duplicateWarning
                   ? 'bg-slate-300 cursor-not-allowed' 
                   : intakeType === 'COURIER' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                 }`}
                 disabled={!selectedCustomerId || !trackingNumber || !!duplicateWarning}
               >
                 <Save size={20} />
                 {batchMode ? '保存并扫描下一件 (Batch Save)' : '确认入库 (Confirm Intake)'}
               </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnifiedIntake;
