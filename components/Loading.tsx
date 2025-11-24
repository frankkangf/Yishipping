
import React, { useState, useMemo } from 'react';
import { Container, Bag, Cargo, Customer, ManifestItem, BagStatus, ContainerStatus } from '../types';
import { Ship, Plus, ArrowRight, Trash2, Box, ShoppingBag, Calendar, Check, Scale, Edit2, X, ArrowUp, ArrowDown } from 'lucide-react';

interface LoadingProps {
  containers: Container[];
  bags: Bag[];
  cargo: Cargo[];
  customers: Customer[];
  onAddContainer: (c: Container) => void;
  onUpdateContainer: (c: Container) => void;
  onUpdateBag: (b: Bag) => void;
  onUpdateCargo: (c: Cargo) => void;
}

const Loading: React.FC<LoadingProps> = ({ 
  containers, bags, cargo, customers, 
  onAddContainer, onUpdateContainer, onUpdateBag, onUpdateCargo 
}) => {
  
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditingContainer, setIsEditingContainer] = useState(false);

  // Form State
  const [containerForm, setContainerForm] = useState<Partial<Container>>({});
  
  // Selected Item for Side Panel
  const [detailItem, setDetailItem] = useState<{type: 'BAG'|'CARGO', data: any} | null>(null);

  // Helper
  const selectedContainer = containers.find(c => c.id === selectedContainerId);
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || id;

  // Generate Sequence
  const nextSequence = useMemo(() => {
     const maxSeq = containers.reduce((max, c) => Math.max(max, parseInt(c.sequenceNumber || '0', 10)), 0);
     return (maxSeq + 1).toString().padStart(3, '0');
  }, [containers]);

  // Handle Create
  const handleCreate = () => {
     const newC: Container = {
        id: `CNTR-${Date.now()}`,
        sequenceNumber: nextSequence,
        status: 'PLANNING',
        manifest: [],
        createdDate: new Date().toISOString(),
        ...containerForm
     };
     onAddContainer(newC);
     setSelectedContainerId(newC.id);
     setShowCreateModal(false);
     setContainerForm({});
  };

  // Handle Update Container Info
  const handleUpdateInfo = () => {
    if (selectedContainer) {
        onUpdateContainer({ ...selectedContainer, ...containerForm });
        setIsEditingContainer(false);
    }
  };

  // Available Stock (Not Loaded)
  const availableBags = bags.filter(b => b.status === BagStatus.CLOSED && !b.containerId);
  const availableCargo = cargo.filter(c => c.status === 'RECEIVED' && !c.containerId);

  // Load Logic
  const handleLoadItem = (type: 'BAG' | 'CARGO', id: string) => {
      if (!selectedContainer) return;
      
      const newManifestItem: ManifestItem = { type, id };
      const newManifest = [...selectedContainer.manifest, newManifestItem];
      
      onUpdateContainer({ ...selectedContainer, manifest: newManifest });

      // Update Item Status
      if (type === 'BAG') {
          const bag = bags.find(b => b.id === id);
          if (bag) onUpdateBag({ ...bag, status: BagStatus.LOADED, containerId: selectedContainer.id });
      } else {
          const c = cargo.find(c => c.id === id);
          if (c) onUpdateCargo({ ...c, status: 'LOADED', containerId: selectedContainer.id });
      }
  };

  const handleUnloadItem = (index: number) => {
      if (!selectedContainer) return;
      const itemToRemove = selectedContainer.manifest[index];
      
      const newManifest = [...selectedContainer.manifest];
      newManifest.splice(index, 1);
      
      onUpdateContainer({ ...selectedContainer, manifest: newManifest });

      // Revert Status
      if (itemToRemove.type === 'BAG') {
          const bag = bags.find(b => b.id === itemToRemove.id);
          if (bag) onUpdateBag({ ...bag, status: BagStatus.CLOSED, containerId: undefined });
      } else {
          const c = cargo.find(c => c.id === itemToRemove.id);
          if (c) onUpdateCargo({ ...c, status: 'RECEIVED', containerId: undefined });
      }
      setDetailItem(null);
  };

  // Reorder Logic
  const moveItem = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedContainer) return;
    const newManifest = [...selectedContainer.manifest];
    
    if (direction === 'up') {
        if (index === 0) return;
        [newManifest[index - 1], newManifest[index]] = [newManifest[index], newManifest[index - 1]];
    } else {
        if (index === newManifest.length - 1) return;
        [newManifest[index + 1], newManifest[index]] = [newManifest[index], newManifest[index + 1]];
    }
    
    onUpdateContainer({ ...selectedContainer, manifest: newManifest });
  };

  // Status Update Logic
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!selectedContainer) return;
      onUpdateContainer({ ...selectedContainer, status: e.target.value as ContainerStatus });
  };

  // Stats
  const containerStats = useMemo(() => {
      if (!selectedContainer) return { vol: 0, weight: 0 };
      let vol = 0;
      let weight = 0;
      selectedContainer.manifest.forEach(item => {
          if (item.type === 'BAG') {
              const b = bags.find(x => x.id === item.id);
              if (b) { vol += b.volume; weight += b.weight; }
          } else {
              const c = cargo.find(x => x.id === item.id);
              if (c) { vol += c.volume; weight += c.weight; }
          }
      });
      return { vol, weight };
  }, [selectedContainer, bags, cargo]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
       {/* Top Bar */}
       <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
             <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><Ship size={24}/></div>
             <div>
                <select 
                   value={selectedContainerId || ''} 
                   onChange={e => { setSelectedContainerId(e.target.value); setDetailItem(null); }}
                   className="font-bold text-lg border-none focus:ring-0 p-0 cursor-pointer bg-transparent"
                >
                   <option value="">-- 选择货柜 --</option>
                   {containers.map(c => (
                      <option key={c.id} value={c.id}>#{c.sequenceNumber} - {c.containerNumber || 'New Container'}</option>
                   ))}
                </select>
                {selectedContainer && (
                   <div className="text-xs text-slate-500 flex gap-3 mt-1">
                      <span>{selectedContainer.shippingCompany || 'No Carrier'}</span>
                      {selectedContainer.loadingDate && <span>Loading: {selectedContainer.loadingDate}</span>}
                      <span className={`px-1.5 rounded text-[10px] font-bold ${
                          selectedContainer.status === 'PLANNING' ? 'bg-yellow-100 text-yellow-700' : 
                          selectedContainer.status === 'DESTINATION_PORT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>{selectedContainer.status}</span>
                   </div>
                )}
             </div>
             {selectedContainer && (
                 <button onClick={() => { setIsEditingContainer(true); setContainerForm(selectedContainer); }} className="text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
             )}
          </div>
          <div className="flex items-center gap-6">
             {selectedContainer && (
                 <div className="text-right flex gap-6">
                    <div>
                       <div className="text-[10px] uppercase font-bold text-slate-400">Total Volume</div>
                       <div className="font-bold text-lg text-indigo-600">{containerStats.vol.toFixed(3)} CBM</div>
                    </div>
                    <div>
                       <div className="text-[10px] uppercase font-bold text-slate-400">Total Weight</div>
                       <div className="font-bold text-lg text-green-600 flex items-center gap-1"><Scale size={14}/> {containerStats.weight.toFixed(2)} KG</div>
                    </div>
                 </div>
             )}
             <button onClick={() => { setShowCreateModal(true); setContainerForm({}); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700">
                <Plus size={16}/> 新建货柜
             </button>
          </div>
       </div>

       {/* Create/Edit Modal */}
       {(showCreateModal || isEditingContainer) && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                <h3 className="font-bold text-xl mb-6 text-slate-800">{isEditingContainer ? '编辑货柜信息' : '创建新货柜'}</h3>
                <div className="grid grid-cols-2 gap-4">
                   {!isEditingContainer && (
                       <div className="col-span-2 bg-slate-100 p-3 rounded text-center font-mono text-sm">
                           AUTO SEQUENCE: <span className="font-bold text-indigo-600">#{nextSequence}</span>
                       </div>
                   )}
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">装柜日期 (Loading Date)</label>
                      <input type="date" value={containerForm.loadingDate || ''} onChange={e => setContainerForm({...containerForm, loadingDate: e.target.value})} className="w-full p-2 border rounded"/>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">船运公司 (Carrier)</label>
                      <input value={containerForm.shippingCompany || ''} onChange={e => setContainerForm({...containerForm, shippingCompany: e.target.value})} className="w-full p-2 border rounded" placeholder="Optional"/>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">货柜号 (Container No)</label>
                      <input value={containerForm.containerNumber || ''} onChange={e => setContainerForm({...containerForm, containerNumber: e.target.value})} className="w-full p-2 border rounded" placeholder="Optional"/>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">封条号 (Seal No)</label>
                      <input value={containerForm.sealNumber || ''} onChange={e => setContainerForm({...containerForm, sealNumber: e.target.value})} className="w-full p-2 border rounded" placeholder="Optional"/>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">ETD</label>
                      <input type="date" value={containerForm.etd || ''} onChange={e => setContainerForm({...containerForm, etd: e.target.value})} className="w-full p-2 border rounded"/>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">ETA</label>
                      <input type="date" value={containerForm.eta || ''} onChange={e => setContainerForm({...containerForm, eta: e.target.value})} className="w-full p-2 border rounded"/>
                   </div>
                </div>
                <div className="flex gap-3 mt-6">
                   <button onClick={isEditingContainer ? handleUpdateInfo : handleCreate} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">确认保存</button>
                   <button onClick={() => { setShowCreateModal(false); setIsEditingContainer(false); }} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">取消</button>
                </div>
             </div>
          </div>
       )}

       {/* Main Workspace */}
       <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Stock */}
          <div className="w-1/4 bg-slate-50 border-r border-slate-200 flex flex-col min-w-[250px]">
             <div className="p-3 font-bold text-xs text-slate-500 uppercase bg-slate-100 border-b">可用库存 (Available)</div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* Bags */}
                {availableBags.map(b => (
                   <div key={b.id} className="bg-white p-3 border rounded-lg shadow-sm flex justify-between items-center group hover:border-indigo-400">
                      <div>
                         <div className="text-sm font-bold text-indigo-700">{b.bagNumber}</div>
                         <div className="text-xs text-slate-500">{b.bagSize} ({b.volume} CBM)</div>
                      </div>
                      {selectedContainer && (
                          <button onClick={() => handleLoadItem('BAG', b.id)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><ArrowRight size={16}/></button>
                      )}
                   </div>
                ))}
                {/* Cargo */}
                {availableCargo.map(c => (
                   <div key={c.id} className="bg-white p-3 border rounded-lg shadow-sm flex justify-between items-center group hover:border-blue-400">
                      <div>
                         <div className="text-sm font-bold text-blue-700">{c.trackingNumber}</div>
                         <div className="text-xs font-bold text-slate-700">{c.commodity}</div>
                         <div className="text-xs text-slate-500">{getCustomerName(c.customerId)}</div>
                      </div>
                      {selectedContainer && (
                          <button onClick={() => handleLoadItem('CARGO', c.id)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><ArrowRight size={16}/></button>
                      )}
                   </div>
                ))}
                {availableBags.length === 0 && availableCargo.length === 0 && <div className="text-center text-slate-400 text-xs mt-10">无可用库存</div>}
             </div>
          </div>

          {/* Center: Container Plan (Manifest) */}
          <div className="flex-1 bg-white flex flex-col relative">
             <div className="p-3 font-bold text-xs text-slate-500 uppercase bg-white border-b flex justify-between">
                <span>装载清单 (Manifest) - #{selectedContainer?.sequenceNumber}</span>
                <span>{selectedContainer?.manifest.length || 0} Items</span>
             </div>
             
             {!selectedContainer ? (
                <div className="flex-1 flex items-center justify-center text-slate-300">请选择或创建一个货柜</div>
             ) : (
                <div className="flex-1 overflow-y-auto pb-16"> 
                   <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                         <tr>
                            <th className="px-4 py-2 w-12">Seq</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">ID / Entry No</th>
                            <th className="px-4 py-2">Customer</th>
                            <th className="px-4 py-2">Desc / Commodity</th>
                            <th className="px-4 py-2 text-right">Vol (CBM)</th>
                            <th className="px-4 py-2 text-right">Wgt (KG)</th>
                            <th className="px-4 py-2 w-24 text-center">Order</th>
                            <th className="px-4 py-2 w-10"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {selectedContainer.manifest.map((item, idx) => {
                             const isFirst = idx === 0;
                             const isLast = idx === selectedContainer.manifest.length - 1;
                             let data: any;
                             if (item.type === 'BAG') {
                                 data = bags.find(b => b.id === item.id);
                                 if (!data) return null;
                                 return (
                                    <tr key={idx} onClick={() => setDetailItem({type: 'BAG', data})} className="hover:bg-indigo-50 cursor-pointer group">
                                       <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                       <td className="px-4 py-3"><ShoppingBag size={16} className="text-indigo-400"/></td>
                                       <td className="px-4 py-3 font-bold text-slate-700">{data.bagNumber}</td>
                                       <td className="px-4 py-3 text-slate-400">-</td>
                                       <td className="px-4 py-3 text-xs text-slate-500">{data.bagSize} Bag</td>
                                       <td className="px-4 py-3 text-right font-mono">{data.volume}</td>
                                       <td className="px-4 py-3 text-right font-mono">{data.weight.toFixed(1)}</td>
                                       <td className="px-4 py-3 text-center">
                                           <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                                               <button disabled={isFirst} onClick={(e) => moveItem(idx, 'up', e)} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={14}/></button>
                                               <button disabled={isLast} onClick={(e) => moveItem(idx, 'down', e)} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={14}/></button>
                                           </div>
                                       </td>
                                       <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); handleUnloadItem(idx); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                                    </tr>
                                 );
                             } else {
                                 data = cargo.find(c => c.id === item.id);
                                 if (!data) return null;
                                 return (
                                    <tr key={idx} onClick={() => setDetailItem({type: 'CARGO', data})} className="hover:bg-blue-50 cursor-pointer group">
                                       <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                       <td className="px-4 py-3"><Box size={16} className="text-blue-400"/></td>
                                       <td className="px-4 py-3 font-bold text-slate-700">{data.trackingNumber}</td>
                                       <td className="px-4 py-3 font-bold text-blue-600">{getCustomerName(data.customerId)}</td>
                                       <td className="px-4 py-3">{data.commodity}</td>
                                       <td className="px-4 py-3 text-right font-mono">{data.volume}</td>
                                       <td className="px-4 py-3 text-right font-mono">{data.weight}</td>
                                       <td className="px-4 py-3 text-center">
                                           <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                                               <button disabled={isFirst} onClick={(e) => moveItem(idx, 'up', e)} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={14}/></button>
                                               <button disabled={isLast} onClick={(e) => moveItem(idx, 'down', e)} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={14}/></button>
                                           </div>
                                       </td>
                                       <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); handleUnloadItem(idx); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                                    </tr>
                                 );
                             }
                         })}
                      </tbody>
                   </table>
                   {selectedContainer.manifest.length === 0 && <div className="p-10 text-center text-slate-300">Empty Container</div>}
                </div>
             )}

             {/* Status Selector Footer */}
             {selectedContainer && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-slate-100 border-t border-slate-200 flex justify-end items-center gap-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">当前状态 (Current Status):</label>
                    <select 
                        value={selectedContainer.status} 
                        onChange={handleStatusChange}
                        className="bg-white border border-slate-300 rounded-lg text-sm px-3 py-1.5 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="PLANNING">计划 (Planning)</option>
                        <option value="ORIGIN_PORT">始发港 (Origin Port)</option>
                        <option value="IN_TRANSIT">在途 (In Transit)</option>
                        <option value="DESTINATION_PORT">目的港 (Destination Port)</option>
                        <option value="UNLOADED">已卸柜 (Unloaded)</option>
                    </select>
                </div>
             )}
          </div>

          {/* Right: Details Panel */}
          {detailItem && (
             <div className="w-1/4 bg-white border-l border-slate-200 p-6 shadow-xl z-10 overflow-y-auto animate-fade-in-right">
                <div className="flex justify-between items-start mb-6">
                   <h3 className="font-bold text-lg text-slate-800">Item Details</h3>
                   <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                {detailItem.type === 'BAG' ? (
                   <div className="space-y-4">
                      <div className="bg-indigo-50 p-4 rounded-xl text-center">
                         <ShoppingBag size={48} className="mx-auto text-indigo-300 mb-2"/>
                         <h2 className="font-black text-xl text-indigo-900">{detailItem.data.bagNumber}</h2>
                         <p className="text-xs font-bold uppercase text-indigo-400">{detailItem.data.bagSize} BAG</p>
                      </div>
                      <div className="space-y-2 text-sm">
                         <div className="flex justify-between border-b py-2">
                            <span className="text-slate-500">Volume</span>
                            <span className="font-bold">{detailItem.data.volume} CBM</span>
                         </div>
                         <div className="flex justify-between border-b py-2">
                            <span className="text-slate-500">Weight</span>
                            <span className="font-bold">{detailItem.data.weight.toFixed(2)} KG</span>
                         </div>
                         <div className="flex justify-between border-b py-2">
                            <span className="text-slate-500">Parcels</span>
                            <span className="font-bold">{detailItem.data.parcelCount} items</span>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-xl text-center">
                         <Box size={48} className="mx-auto text-blue-300 mb-2"/>
                         <h2 className="font-black text-xl text-blue-900">{detailItem.data.trackingNumber}</h2>
                         <p className="text-xs font-bold uppercase text-blue-400">General Cargo</p>
                      </div>
                      <div className="space-y-2 text-sm">
                         <div className="py-2">
                            <span className="block text-xs text-slate-500">Customer</span>
                            <span className="font-bold text-lg text-blue-600">{getCustomerName(detailItem.data.customerId)}</span>
                         </div>
                         <div className="py-2">
                            <span className="block text-xs text-slate-500">Commodity</span>
                            <span className="font-bold">{detailItem.data.commodity}</span>
                         </div>
                         <div className="flex justify-between border-b py-2">
                             <span className="text-slate-500">Pieces</span>
                             <span className="font-bold">{detailItem.data.pieces || 1}</span>
                         </div>
                         <div className="flex justify-between border-b py-2">
                            <span className="text-slate-500">Volume</span>
                            <span className="font-bold">{detailItem.data.volume} CBM</span>
                         </div>
                         <div className="flex justify-between border-b py-2">
                            <span className="text-slate-500">Weight</span>
                            <span className="font-bold">{detailItem.data.weight} KG</span>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          )}

       </div>
    </div>
  );
};

export default Loading;
