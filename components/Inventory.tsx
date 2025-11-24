
import React, { useState, useEffect } from 'react';
import { Parcel, Cargo, ParcelStatus, Bag, BagStatus, Customer } from '../types';
import { Search, Package, Box, ArrowLeft, ShoppingBag, ArrowRight, MinusCircle, Lock, Unlock, Plus, Trash2, ArrowLeftCircle, Check } from 'lucide-react';

interface InventoryProps {
  parcels: Parcel[];
  cargo: Cargo[];
  bags: Bag[];
  customers: Customer[];
  onUpdateParcel: (p: Parcel) => void;
  onUpdateCargo: (c: Cargo) => void;
  onCreateBag: (b: Bag) => void;
  onUpdateBag: (b: Bag) => void;
  initialSelectedItem?: { type: 'PARCEL' | 'CARGO', data: any } | null;
}

const Inventory: React.FC<InventoryProps> = ({ 
  parcels, cargo, bags, customers, 
  onUpdateParcel, onUpdateCargo, onCreateBag, onUpdateBag,
  initialSelectedItem 
}) => {
  // Tabs: COURIER (Merged Pending & Bagging), CARGO (Stock)
  const [activeTab, setActiveTab] = useState<'COURIER' | 'CARGO'>('COURIER');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detail View State
  const [selectedItem, setSelectedItem] = useState<{ type: 'PARCEL' | 'CARGO', data: any } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // --- BAGGING STATE (For Courier Tab) ---
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null);
  const [showCreateBag, setShowCreateBag] = useState(false);
  const [newBagSize, setNewBagSize] = useState<'LARGE' | 'SMALL'>('LARGE');

  // Helpers
  const activeBag = bags.find(b => b.id === selectedBagId);
  const parcelsInActiveBag = activeBag ? parcels.filter(p => p.bagId === activeBag.id) : [];
  
  // Filter Unbagged Parcels (Right Column)
  const unbaggedParcels = parcels.filter(p => 
    p.status === ParcelStatus.RECEIVED &&
    (p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || id;

  // Effect to handle incoming init item from global search
  useEffect(() => {
    if (initialSelectedItem) {
        setSelectedItem(initialSelectedItem);
        // Map type to Tab
        if (initialSelectedItem.type === 'PARCEL') setActiveTab('COURIER');
        else setActiveTab('CARGO');
    }
  }, [initialSelectedItem]);

  // Filter Cargo
  const stockCargo = cargo.filter(c => 
    (c.status === 'RECEIVED' || c.status === 'LOADED') &&
    (c.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.commodity.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Bagging Actions
  const handleCreateBag = () => {
    const fixedVolume = newBagSize === 'LARGE' ? 0.5 : 0.2;
    const newBag: Bag = {
      id: `B-${Date.now()}`,
      bagNumber: `BAG-${Math.floor(1000 + Math.random() * 9000)}`,
      status: BagStatus.OPEN,
      weight: 0,
      parcelCount: 0,
      destination: 'Default',
      createdDate: new Date().toISOString(),
      bagSize: newBagSize,
      volume: fixedVolume
    };
    onCreateBag(newBag);
    setSelectedBagId(newBag.id);
    setShowCreateBag(false);
  };

  const handleAddToBag = (parcel: Parcel, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail
    if (!activeBag) {
        alert("请先在左侧选择或创建一个包袋 (Please select a bag on the left first).");
        return;
    }
    if (activeBag.status !== BagStatus.OPEN) {
        alert("该包袋已封口 (Bag is closed).");
        return;
    }
    onUpdateParcel({ ...parcel, status: ParcelStatus.BAGGED, bagId: activeBag.id });
    onUpdateBag({ ...activeBag, parcelCount: activeBag.parcelCount + 1, weight: activeBag.weight + parcel.weight });
  };

  const handleRemoveFromBag = (parcel: Parcel, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail
    if (!activeBag) return;
    onUpdateParcel({ ...parcel, status: ParcelStatus.RECEIVED, bagId: undefined });
    onUpdateBag({ 
        ...activeBag, 
        parcelCount: Math.max(0, activeBag.parcelCount - 1), 
        weight: Math.max(0, activeBag.weight - parcel.weight) 
    });
  };

  const handleCloseBag = () => {
    if (activeBag) onUpdateBag({ ...activeBag, status: BagStatus.CLOSED });
  };

  const handleReOpenBag = () => {
    if (activeBag) onUpdateBag({ ...activeBag, status: BagStatus.OPEN });
  };

  // Common Actions
  const handleSaveEdit = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'PARCEL') {
      onUpdateParcel(selectedItem.data);
    } else {
      onUpdateCargo(selectedItem.data);
    }
    setIsEditing(false);
  };

  // --- DETAIL VIEW COMPONENT ---
  if (selectedItem) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-fade-in">
         <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-10">
            <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} className="flex items-center gap-2 text-slate-600 font-bold">
               <ArrowLeft size={20}/> 返回
            </button>
            <div className="text-sm font-bold text-slate-500">{selectedItem.type} 详情</div>
         </div>
         <div className="max-w-2xl mx-auto p-6 space-y-6 pb-24">
            <div>
               <h1 className="text-3xl font-black text-slate-900 break-all">{selectedItem.data.trackingNumber}</h1>
               <div className="flex gap-2 mt-2">
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold text-sm">{selectedItem.data.customerId}</span>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold text-sm">{selectedItem.data.status}</span>
               </div>
            </div>
            {/* Simple Image Gallery */}
            <div className="grid grid-cols-3 gap-2">
               {(selectedItem.data.images || []).map((img: string, idx: number) => (
                  <img key={idx} src={img} className="aspect-square rounded-xl object-cover border border-slate-200"/>
               ))}
            </div>
            {/* Fields */}
            <div className="bg-slate-50 p-6 rounded-xl space-y-4 border border-slate-100">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Weight (KG)</label>
                    {isEditing ? (
                        <input type="number" value={selectedItem.data.weight} onChange={e => setSelectedItem({...selectedItem, data: {...selectedItem.data, weight: parseFloat(e.target.value)}})} className="w-full p-2 border rounded font-bold"/>
                    ) : <p className="font-bold text-lg">{selectedItem.data.weight}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Pieces</label>
                    {isEditing ? (
                        <input type="number" value={selectedItem.data.pieces || selectedItem.data.quantity} onChange={e => setSelectedItem({...selectedItem, data: {...selectedItem.data, [selectedItem.type === 'PARCEL'?'pieces':'quantity']: parseFloat(e.target.value)}})} className="w-full p-2 border rounded font-bold"/>
                    ) : <p className="font-bold text-lg">{selectedItem.data.pieces || selectedItem.data.quantity}</p>}
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Description / Commodity</label>
                  {isEditing ? (
                     <input value={selectedItem.type === 'PARCEL' ? selectedItem.data.description : selectedItem.data.commodity} onChange={e => setSelectedItem({...selectedItem, data: {...selectedItem.data, [selectedItem.type === 'PARCEL' ? 'description' : 'commodity']: e.target.value}})} className="w-full p-2 border rounded font-bold"/>
                  ) : <p className="font-bold">{selectedItem.type === 'PARCEL' ? selectedItem.data.description : selectedItem.data.commodity}</p>}
               </div>
               {selectedItem.data.notes && (
                   <div>
                       <label className="text-xs font-bold text-slate-400 uppercase">Notes</label>
                       <p className="text-sm bg-white p-2 rounded border border-slate-200">{selectedItem.data.notes}</p>
                   </div>
               )}
            </div>
         </div>
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center">
            {isEditing ? (
               <button onClick={handleSaveEdit} className="w-full max-w-md bg-green-600 text-white py-3 rounded-xl font-bold">保存 (Save)</button>
            ) : (
               <button onClick={() => setIsEditing(true)} className="w-full max-w-md bg-indigo-600 text-white py-3 rounded-xl font-bold">编辑 (Edit)</button>
            )}
         </div>
      </div>
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      
      {/* Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm w-full md:w-auto">
          <button onClick={() => setActiveTab('COURIER')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'COURIER' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Package size={16}/> 快递管理 (Courier)
          </button>
          <button onClick={() => setActiveTab('CARGO')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'CARGO' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Box size={16}/> 散货库存 (Cargo Stock)
          </button>
        </div>
        
        <div className="relative w-full md:w-64">
           <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索单号/客户..." className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"/>
           <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
        </div>
      </div>

      {/* --- TAB 1: COURIER (Merged View) --- */}
      {activeTab === 'COURIER' && (
         <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
            
            {/* LEFT COLUMN: Bag Management (Bagged Parcels) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
                <div className="p-3 border-b flex justify-between items-center bg-indigo-50">
                   <div className="flex gap-2 items-center w-full">
                      <ShoppingBag size={18} className="text-indigo-600"/>
                      <select value={selectedBagId || ''} onChange={e => setSelectedBagId(e.target.value)} className="border-slate-300 rounded text-sm py-1 flex-1 font-bold">
                         <option value="">-- 选择或新建包袋 --</option>
                         {bags.map(b => (
                            <option key={b.id} value={b.id}>{b.bagNumber} [{b.status}] - {b.weight.toFixed(1)}kg</option>
                         ))}
                      </select>
                      <button onClick={() => setShowCreateBag(true)} className="bg-indigo-600 text-white p-1.5 rounded-lg shadow hover:bg-indigo-700" title="新建包袋"><Plus size={16}/></button>
                   </div>
                </div>

                {/* Bag Actions / Status Header */}
                {activeBag && (
                   <div className="px-4 py-2 bg-white border-b border-slate-100 flex justify-between items-center">
                       <div className="text-xs text-slate-500">
                          <span className="font-bold text-slate-800">{activeBag.parcelCount}</span> items • 
                          <span className="font-bold text-slate-800 ml-1">{activeBag.weight.toFixed(2)}</span> kg
                       </div>
                       <div>
                          {activeBag.status === BagStatus.OPEN 
                            ? <button onClick={handleCloseBag} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-green-200"><Lock size={10}/> 封包 (Close)</button>
                            : <button onClick={handleReOpenBag} className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-yellow-200"><Unlock size={10}/> 重开 (Reopen)</button>
                          }
                       </div>
                   </div>
                )}

                {/* Create Modal */}
                {showCreateBag && (
                   <div className="absolute inset-0 z-20 bg-white/95 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                      <h3 className="font-bold text-lg mb-4 text-slate-800">新建集包袋 (New Bag)</h3>
                      <div className="flex gap-4 mb-6">
                         <button onClick={() => setNewBagSize('LARGE')} className={`p-4 border-2 rounded-xl transition-all ${newBagSize === 'LARGE' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200'}`}>
                            <div className="text-lg font-black">L</div>
                            <div className="text-xs">0.5 CBM</div>
                         </button>
                         <button onClick={() => setNewBagSize('SMALL')} className={`p-4 border-2 rounded-xl transition-all ${newBagSize === 'SMALL' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200'}`}>
                            <div className="text-lg font-black">S</div>
                            <div className="text-xs">0.2 CBM</div>
                         </button>
                      </div>
                      <div className="flex gap-2 w-full max-w-xs">
                         <button onClick={handleCreateBag} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">创建</button>
                         <button onClick={() => setShowCreateBag(false)} className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-lg font-bold">取消</button>
                      </div>
                   </div>
                )}

                {/* Bag Content List */}
                {activeBag ? (
                   <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
                      {parcelsInActiveBag.length > 0 ? parcelsInActiveBag.map(p => (
                         <div key={p.id} onClick={() => setSelectedItem({ type: 'PARCEL', data: p })} className="flex justify-between items-center p-3 border border-indigo-100 rounded-lg bg-white shadow-sm cursor-pointer hover:border-indigo-300 group">
                            <div>
                               <div className="font-bold text-sm text-slate-800">{p.description}</div>
                               <div className="text-xs text-slate-500 flex gap-2">
                                  <span className="font-mono text-indigo-600">{getCustomerName(p.customerId)}</span>
                                  <span>{p.weight}kg</span>
                               </div>
                            </div>
                            {activeBag.status === BagStatus.OPEN && (
                               <button onClick={(e) => handleRemoveFromBag(p, e)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><MinusCircle size={18}/></button>
                            )}
                         </div>
                      )) : (
                         <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <ShoppingBag size={32} className="mb-2 opacity-20"/>
                            <p className="text-sm">空包袋 (Empty)</p>
                         </div>
                      )}
                   </div>
                ) : (
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                      <ArrowLeftCircle size={32} className="mb-2 opacity-20"/>
                      <p>请在上方选择包袋</p>
                   </div>
                )}
            </div>

            {/* RIGHT COLUMN: Pending Parcels (Unbagged) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
               <div className="p-3 border-b bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                  <span>待处理包裹 (Pending)</span>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{unbaggedParcels.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {unbaggedParcels.map(p => (
                     <div key={p.id} onClick={() => setSelectedItem({ type: 'PARCEL', data: p })} className="p-3 border rounded-lg hover:border-indigo-400 bg-white group flex justify-between items-center shadow-sm cursor-pointer transition-all">
                        <div>
                           <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded">{getCustomerName(p.customerId)}</span>
                              <span className="text-sm font-medium text-slate-800">{p.description}</span>
                           </div>
                           <div className="text-[10px] text-slate-400 mt-1 font-mono">{p.trackingNumber} • {p.weight}kg</div>
                        </div>
                        {activeBag && activeBag.status === BagStatus.OPEN && (
                           <button onClick={(e) => handleAddToBag(p, e)} className="bg-indigo-50 text-indigo-600 p-2 rounded-full hover:bg-indigo-600 hover:text-white transition-all transform active:scale-90">
                              <ArrowLeft size={16}/>
                           </button>
                        )}
                     </div>
                  ))}
                  {unbaggedParcels.length === 0 && (
                     <div className="p-8 text-center text-slate-300">
                        <Check size={32} className="mx-auto mb-2 opacity-20"/>
                        暂无待处理包裹
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* --- TAB 2: CARGO STOCK --- */}
      {activeTab === 'CARGO' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
           <div className="overflow-y-auto flex-1">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs sticky top-0">
                  <tr>
                     <th className="px-6 py-4">入仓号 (Entry No)</th>
                     <th className="px-6 py-4">客户</th>
                     <th className="px-6 py-4">品名</th>
                     <th className="px-6 py-4">体积 / 重量</th>
                     <th className="px-6 py-4">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 cursor-pointer">
                  {stockCargo.map(c => (
                     <tr key={c.id} onClick={() => setSelectedItem({ type: 'CARGO', data: c })} className="hover:bg-blue-50">
                        <td className="px-6 py-4 font-bold text-slate-800">{c.trackingNumber}</td>
                        <td className="px-6 py-4 text-blue-600 font-bold">{getCustomerName(c.customerId)}</td>
                        <td className="px-6 py-4">{c.commodity}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{c.volume} cbm | {c.weight} kg</td>
                        <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">{c.status}</span></td>
                     </tr>
                  ))}
               </tbody>
             </table>
             {stockCargo.length === 0 && <div className="p-8 text-center text-slate-400">暂无散货库存</div>}
           </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
