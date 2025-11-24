import React, { useState } from 'react';
import { Container, Cargo, Bag, Customer, BagStatus, SalesRepresentative, ManifestItem } from '../types';
import { Ship, Package, Plus, ArrowRight, Anchor, Calendar, Box, Search, CheckCircle, Truck, Info, Scale } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

interface FreightOperationsProps {
  containers: Container[];
  cargo: Cargo[];
  bags: Bag[];
  customers: Customer[];
  onAddContainer: (c: Container) => void;
  onUpdateContainer: (c: Container) => void;
  onAddCargo: (c: Cargo) => void;
  onUpdateBag: (b: Bag) => void;
  onUpdateCargo: (c: Cargo) => void;
}

const FreightOperations: React.FC<FreightOperationsProps> = ({
  containers, cargo, bags, customers, onAddContainer, onUpdateContainer, onAddCargo, onUpdateBag, onUpdateCargo
}) => {
  const [activeTab, setActiveTab] = useState<'containers' | 'cargo' | 'load'>('containers');
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  // Forms State
  const [newContainer, setNewContainer] = useState<Partial<Container>>({
    containerNumber: '', sealNumber: '', vesselName: '', etd: '', eta: '', status: 'PLANNING'
  });
  
  const [newCargo, setNewCargo] = useState<Partial<Cargo>>({
    commodity: '', quantity: 1, volume: 0, weight: 0, marking: '', status: 'RECEIVED', trackingNumber: ''
  });
  const [cargoCustomerSearch, setCargoCustomerSearch] = useState('');
  const [cargoCustomerId, setCargoCustomerId] = useState('');

  // AI Helper for Cargo
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [invoiceText, setInvoiceText] = useState('');

  const analyzeCargoInput = async () => {
    if (!process.env.API_KEY || !invoiceText) return;
    setIsAiAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `分析此货运描述/发票文本并提取结构化数据 (commodity 应为中文): "${invoiceText}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              commodity: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              weight: { type: Type.NUMBER },
              volume: { type: Type.NUMBER },
              marking: { type: Type.STRING },
              trackingNumber: { type: Type.STRING, nullable: true },
            }
          }
        }
      });
      if (response.text) {
        const data = JSON.parse(response.text);
        setNewCargo(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleCreateContainer = (e: React.FormEvent) => {
    e.preventDefault();
    const maxSeq = containers.reduce((max, c) => Math.max(max, parseInt(c.sequenceNumber || '0', 10)), 0);
    const sequenceNumber = (maxSeq + 1).toString().padStart(3, '0');

    const c: Container = {
      id: `CONT-${Date.now()}`,
      sequenceNumber,
      containerNumber: newContainer.containerNumber!,
      sealNumber: newContainer.sealNumber!,
      vesselName: newContainer.vesselName!,
      etd: newContainer.etd!,
      eta: newContainer.eta!,
      status: 'PLANNING',
      manifest: [],
      createdDate: new Date().toISOString()
    };
    onAddContainer(c);
    setNewContainer({ containerNumber: '', sealNumber: '', vesselName: '', etd: '', eta: '', status: 'PLANNING' });
  };

  const handleCreateCargo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoCustomerId) return;
    const c: Cargo = {
      id: `CARGO-${Date.now()}`,
      trackingNumber: newCargo.trackingNumber || `Entry-${Date.now()}`,
      customerId: cargoCustomerId,
      commodity: newCargo.commodity!,
      quantity: newCargo.quantity || 1,
      pieces: newCargo.quantity || 1,
      volume: newCargo.volume || 0,
      weight: newCargo.weight || 0,
      marking: newCargo.marking || '',
      status: 'RECEIVED',
      intakeDate: new Date().toISOString(),
      images: []
    };
    onAddCargo(c);
    setNewCargo({ commodity: '', quantity: 1, volume: 0, weight: 0, marking: '', status: 'RECEIVED', trackingNumber: '' });
    setCargoCustomerSearch('');
    setCargoCustomerId('');
    setInvoiceText('');
  };

  const loadItemToContainer = (type: 'BAG' | 'CARGO', id: string) => {
    if (!selectedContainerId) return;
    const container = containers.find(c => c.id === selectedContainerId);
    if (!container) return;

    // Create manifest item
    const newItem: ManifestItem = { type, id };
    
    // Update container with new manifest
    const updatedContainer = {
        ...container,
        manifest: [...container.manifest, newItem]
    };

    if (type === 'BAG') {
      const bag = bags.find(b => b.id === id);
      if (bag) {
        onUpdateBag({ ...bag, status: BagStatus.LOADED, containerId: selectedContainerId });
        onUpdateContainer(updatedContainer);
      }
    } else {
      const c = cargo.find(x => x.id === id);
      if (c) {
        onUpdateCargo({ ...c, status: 'LOADED', containerId: selectedContainerId });
        onUpdateContainer(updatedContainer);
      }
    }
  };

  // --- RENDER HELPERS ---
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(cargoCustomerSearch.toLowerCase()) || 
    c.id.toLowerCase().includes(cargoCustomerSearch.toLowerCase())
  );

  const selectedContainer = containers.find(c => c.id === selectedContainerId);
  const availableBags = bags.filter(b => b.status === BagStatus.CLOSED && !b.containerId);
  const availableCargo = cargo.filter(c => c.status === 'RECEIVED' && !c.containerId);

  // Stats for Load Plan
  const currentLoadVolume = selectedContainer ? (
    selectedContainer.manifest.reduce((sum, item) => {
        if (item.type === 'CARGO') {
            return sum + (cargo.find(c => c.id === item.id)?.volume || 0);
        }
        if (item.type === 'BAG') {
            return sum + (bags.find(b => b.id === item.id)?.volume || 0);
        }
        return sum;
    }, 0)
  ) : 0;
  
  const MAX_VOLUME = 68; // 40HQ approx

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
        {(['containers', 'cargo', 'load'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            {tab === 'containers' && '货柜管理'}
            {tab === 'cargo' && '散货揽收'}
            {tab === 'load' && '装载计划'}
          </button>
        ))}
      </div>

      {/* VIEW: CONTAINERS */}
      {activeTab === 'containers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            {containers.map(c => (
              <div key={c.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center group">
                <div>
                  <div className="flex items-center space-x-2">
                     <h3 className="text-xl font-bold text-slate-800">{c.containerNumber}</h3>
                     <span className={`px-2 py-1 text-xs rounded font-bold ${
                       c.status === 'PLANNING' ? 'bg-yellow-100 text-yellow-700' :
                       c.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                     }`}>{c.status}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500 space-y-1">
                    <p className="flex items-center gap-2"><Anchor size={14}/> 船名: {c.vesselName || '待定'}</p>
                    <p className="flex items-center gap-2"><Calendar size={14}/> ETD: {c.etd} / ETA: {c.eta}</p>
                  </div>
                  <div className="mt-4 flex gap-4 text-xs font-semibold text-slate-400">
                    <span>{c.manifest.filter(m => m.type === 'BAG').length} 包袋已装</span>
                    <span>{c.manifest.filter(m => m.type === 'CARGO').length} 散货已装</span>
                  </div>
                </div>
                <div className="text-right">
                  <button 
                    onClick={() => { setSelectedContainerId(c.id); setActiveTab('load'); }}
                    className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    管理装载
                  </button>
                </div>
              </div>
            ))}
            {containers.length === 0 && <div className="text-center p-8 text-slate-400">暂无活动货柜。</div>}
          </div>

          {/* Create Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Ship className="text-indigo-600"/> 新建货柜</h3>
             <form onSubmit={handleCreateContainer} className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold text-slate-500 mb-1">货柜号</label>
                 <input required value={newContainer.containerNumber} onChange={e => setNewContainer({...newContainer, containerNumber: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
               </div>
               <div>
                 <label className="block text-xs font-semibold text-slate-500 mb-1">封条号</label>
                 <input required value={newContainer.sealNumber} onChange={e => setNewContainer({...newContainer, sealNumber: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
               </div>
               <div>
                 <label className="block text-xs font-semibold text-slate-500 mb-1">船名</label>
                 <input required value={newContainer.vesselName} onChange={e => setNewContainer({...newContainer, vesselName: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
               </div>
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">预计离港 (ETD)</label>
                   <input type="date" required value={newContainer.etd} onChange={e => setNewContainer({...newContainer, etd: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">预计到港 (ETA)</label>
                   <input type="date" required value={newContainer.eta} onChange={e => setNewContainer({...newContainer, eta: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                 </div>
               </div>
               <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg font-medium hover:bg-slate-700">创建货柜</button>
             </form>
          </div>
        </div>
      )}

      {/* VIEW: CARGO INTAKE */}
      {activeTab === 'cargo' && (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-800 text-white flex justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><Box/> 散货揽收</h2>
            <div className="text-xs opacity-70">LCL / FCL 接货</div>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <form onSubmit={handleCreateCargo} className="space-y-5">
              
              <div>
                 <label className="block text-xs font-semibold text-slate-500 mb-1">入仓号 / 追踪号 (Entry No)</label>
                 <input 
                   required
                   value={newCargo.trackingNumber || ''} 
                   onChange={e => setNewCargo({...newCargo, trackingNumber: e.target.value})} 
                   className="w-full p-2 border border-slate-300 rounded text-sm font-mono"
                   placeholder="SCAN or ENTER"
                 />
              </div>

              {/* Customer Select */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">客户</label>
                {cargoCustomerId ? (
                  <div className="flex justify-between items-center p-2 bg-indigo-50 border border-indigo-200 rounded text-sm">
                    <span className="font-medium text-indigo-900">{customers.find(c => c.id === cargoCustomerId)?.name}</span>
                    <button type="button" onClick={() => { setCargoCustomerId(''); setCargoCustomerSearch(''); }}><ArrowRight size={14} className="rotate-180 text-indigo-400"/></button>
                  </div>
                ) : (
                  <>
                    <input 
                      type="text" 
                      placeholder="搜索客户..." 
                      value={cargoCustomerSearch}
                      onChange={e => setCargoCustomerSearch(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded text-sm pl-8"
                    />
                    <Search size={14} className="absolute left-2.5 top-8 text-slate-400"/>
                    {cargoCustomerSearch && (
                      <div className="absolute z-10 w-full bg-white shadow-lg border rounded-lg mt-1 max-h-40 overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <div key={c.id} onClick={() => { setCargoCustomerId(c.id); setCargoCustomerSearch(c.name); }} className="p-2 hover:bg-slate-100 cursor-pointer text-sm">
                            <span className="font-bold">{c.id}</span> - {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* AI Quick Fill */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Info size={12}/> AI 快速识别 (从发票/文本)</label>
                <div className="flex gap-2">
                  <input 
                    value={invoiceText}
                    onChange={e => setInvoiceText(e.target.value)}
                    placeholder="在此粘贴货物详情..."
                    className="flex-1 p-2 border border-slate-300 rounded text-xs"
                  />
                  <button type="button" onClick={analyzeCargoInput} disabled={isAiAnalyzing} className="bg-indigo-100 text-indigo-700 px-3 rounded text-xs font-bold hover:bg-indigo-200">
                    {isAiAnalyzing ? '...' : 'AI 识别'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">品名 / 描述</label>
                <input required value={newCargo.commodity} onChange={e => setNewCargo({...newCargo, commodity: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">数量</label>
                   <input type="number" required value={newCargo.quantity} onChange={e => setNewCargo({...newCargo, quantity: parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">重量 (KG)</label>
                   <input type="number" required value={newCargo.weight} onChange={e => setNewCargo({...newCargo, weight: parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">体积 (CBM)</label>
                   <input type="number" step="0.01" required value={newCargo.volume} onChange={e => setNewCargo({...newCargo, volume: parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">麦头 / 备注</label>
                   <input type="text" value={newCargo.marking} onChange={e => setNewCargo({...newCargo, marking: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                 </div>
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                <CheckCircle size={18}/> 确认收货
              </button>
            </form>

            <div className="bg-slate-50 rounded-xl p-4 overflow-y-auto max-h-[500px]">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">最近揽收</h3>
              {cargo.slice(0).reverse().map(c => (
                <div key={c.id} className="bg-white p-3 rounded-lg shadow-sm mb-2 border border-slate-200">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono bg-slate-100 px-1 rounded">{c.trackingNumber}</span>
                    <span className="text-xs font-bold text-slate-700">{customers.find(x => x.id === c.customerId)?.name}</span>
                  </div>
                  <p className="text-sm font-medium mt-1">{c.commodity}</p>
                  <div className="mt-2 text-xs text-slate-500 flex gap-3">
                    <span>{c.quantity} 件</span>
                    <span>{c.weight} kg</span>
                    <span className="text-indigo-600 font-bold">{c.volume} cbm</span>
                  </div>
                </div>
              ))}
              {cargo.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">暂无近期货物。</p>}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LOAD PLANNER */}
      {activeTab === 'load' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
           {/* Left: Unassigned Inventory */}
           <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
             <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">仓库库存 (未装柜)</div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {/* Bags */}
               {availableBags.length > 0 && (
                 <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">快递包袋</h4>
                   {availableBags.map(b => (
                     <div key={b.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg mb-2">
                       <div>
                         <div className="text-sm font-bold text-slate-800">{b.bagNumber}</div>
                         <div className="text-xs text-slate-500">{b.parcelCount} 包裹 • {b.weight} kg</div>
                       </div>
                       <button onClick={() => loadItemToContainer('BAG', b.id)} className="bg-indigo-50 text-indigo-600 p-2 rounded hover:bg-indigo-100"><ArrowRight size={16}/></button>
                     </div>
                   ))}
                 </div>
               )}

               {/* Cargo */}
               {availableCargo.length > 0 && (
                 <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">普通散货</h4>
                   {availableCargo.map(c => (
                     <div key={c.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg mb-2">
                       <div>
                         <div className="text-sm font-bold text-slate-800">{c.commodity}</div>
                         <div className="text-xs text-slate-500">{c.quantity} 件 • {c.volume} CBM</div>
                         <div className="text-xs text-indigo-600 font-mono">{customers.find(cust => cust.id === c.customerId)?.id}</div>
                       </div>
                       <button onClick={() => loadItemToContainer('CARGO', c.id)} className="bg-indigo-50 text-indigo-600 p-2 rounded hover:bg-indigo-100"><ArrowRight size={16}/></button>
                     </div>
                   ))}
                 </div>
               )}

               {availableBags.length === 0 && availableCargo.length === 0 && (
                 <div className="text-center text-slate-400 mt-10">暂无待装货物。</div>
               )}
             </div>
           </div>

           {/* Right: Container */}
           <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
              <div className="p-4 bg-slate-800 text-white flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                   <Ship size={24} className="text-indigo-400"/>
                   <div>
                     <h3 className="font-bold">
                        {selectedContainer ? selectedContainer.containerNumber : '请选择一个货柜'}
                     </h3>
                     {selectedContainer && <p className="text-xs opacity-70">封条: {selectedContainer.sealNumber}</p>}
                   </div>
                </div>
                {selectedContainer && (
                  <div className="text-right">
                    <p className="text-xs opacity-70">已用容量</p>
                    <p className="font-mono font-bold text-lg">{currentLoadVolume.toFixed(2)} / {MAX_VOLUME} CBM</p>
                  </div>
                )}
              </div>

              {!selectedContainer ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                  <Ship size={64} className="mb-4 opacity-20"/>
                  <p>请从 "货柜管理" 标签页选择一个货柜开始装载。</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                  {/* Visual Load Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-4 mb-6 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-500" 
                      style={{ width: `${Math.min((currentLoadVolume / MAX_VOLUME) * 100, 100)}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Loaded Cargo */}
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Box size={16}/> 已装载散货</h4>
                      {selectedContainer.manifest.filter(m => m.type === 'CARGO').map(item => {
                        const id = item.id;
                        const cItem = cargo.find(c => c.id === id);
                        if (!cItem) return null;
                        return (
                          <div key={id} className="bg-white p-3 rounded border border-slate-200 mb-2 text-sm shadow-sm">
                            <div className="font-medium">{cItem.commodity}</div>
                            <div className="text-xs text-slate-500 flex justify-between">
                              <span>{cItem.volume} CBM</span>
                              <span className="font-mono">{cItem.id}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Loaded Bags */}
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Scale size={16}/> 已装载包袋</h4>
                      {selectedContainer.manifest.filter(m => m.type === 'BAG').map(item => {
                         const id = item.id;
                         const bItem = bags.find(b => b.id === id);
                         if (!bItem) return null;
                         return (
                           <div key={id} className="bg-white p-3 rounded border border-slate-200 mb-2 text-sm shadow-sm">
                             <div className="font-medium">{bItem.bagNumber}</div>
                             <div className="text-xs text-slate-500 flex justify-between">
                               <span>{bItem.destination}</span>
                               <span className="font-mono">{bItem.parcelCount} 件</span>
                             </div>
                           </div>
                         )
                      })}
                    </div>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default FreightOperations;