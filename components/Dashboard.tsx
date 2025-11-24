
import React, { useEffect, useState } from 'react';
import { Parcel, Bag, ParcelStatus, Cargo, Container } from '../types';
import { generateSmartReport } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, Package, Truck, Warehouse, Ship, Clock, Box } from 'lucide-react';

interface DashboardProps {
  parcels: Parcel[];
  bags: Bag[];
  cargo: Cargo[];
  containers: Container[];
}

const Dashboard: React.FC<DashboardProps> = ({ parcels, bags, cargo, containers }) => {
  const [aiReport, setAiReport] = useState<string>("正在分析每日运营数据...");
  const [loadingReport, setLoadingReport] = useState(false);

  // --- STATS CALCULATIONS ---

  // 1. Warehouse Stock Overview (Received but NOT Shipped)
  // Logic: Items physically in warehouse.
  const isItemInStock = (status: string, containerId?: string) => {
      if (!containerId) return true;
      const container = containers.find(c => c.id === containerId);
      if (container && (container.status === 'PLANNING' || container.status === 'UNLOADED')) return true;
      return false;
  };

  const stockParcels = parcels.filter(p => (p.status === ParcelStatus.RECEIVED || p.status === ParcelStatus.BAGGED) && isItemInStock(p.status, bags.find(b => b.id === p.bagId)?.containerId));
  const stockCargo = cargo.filter(c => (c.status === 'RECEIVED' || c.status === 'LOADED') && isItemInStock(c.status, c.containerId));
  const stockBags = bags.filter(b => (b.status === 'CLOSED' || b.status === 'LOADED') && isItemInStock(b.status, b.containerId));

  // Calculate Totals
  const totalStockWeight = stockParcels.reduce((sum, p) => sum + p.weight, 0) + stockCargo.reduce((sum, c) => sum + c.weight, 0);
  
  // Volume Logic
  const cargoVolume = stockCargo.reduce((sum, c) => sum + c.volume, 0);
  const bagsVolume = stockBags.reduce((sum, b) => sum + (b.volume || 0), 0);
  const unbaggedParcels = stockParcels.filter(p => !p.bagId);
  const parcelsVolume = unbaggedParcels.reduce((sum, p) => sum + (p.volume || 0), 0);
  const totalStockVolume = cargoVolume + bagsVolume + parcelsVolume;

  // 2. Incoming Shipments (In Transit) -> Renamed to Containers and Sorted by ETA nearest to furthest
  const sortedContainers = [...containers]
    .sort((a, b) => {
       if (!a.eta) return 1; // Put empty dates last
       if (!b.eta) return -1;
       return new Date(a.eta).getTime() - new Date(b.eta).getTime();
    });

  // 3. Intake Split Stats (Pending/Received only)
  const courierPendingCount = parcels.filter(p => p.status === ParcelStatus.RECEIVED).length;
  const cargoPendingCount = cargo.filter(c => c.status === 'RECEIVED').length;

  const dataIntake = [
    { name: '快递小件 (Courier)', value: courierPendingCount, fill: '#6366f1' },
    { name: '散货 (Cargo)', value: cargoPendingCount, fill: '#3b82f6' },
  ];

  useEffect(() => {
    let mounted = true;
    const fetchReport = async () => {
      setLoadingReport(true);
      const stats = { 
        totalStockVolume: totalStockVolume.toFixed(2), 
        courierPending: courierPendingCount, 
        cargoPending: cargoPendingCount, 
        containers: sortedContainers.length 
      };
      const report = await generateSmartReport(stats);
      if (mounted) {
        setAiReport(report);
        setLoadingReport(false);
      }
    };
    fetchReport();
    return () => { mounted = false; };
  }, [totalStockVolume, courierPendingCount, cargoPendingCount, sortedContainers.length]);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-20 md:pb-0">
      
      {/* Widget 1: Warehouse Stock Overview */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
          <Warehouse className="text-indigo-400" />
          <h2 className="text-xl font-bold">仓库实时库存 (Stock)</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          <div>
            <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-1">总库存体积 (Total Volume)</p>
            <p className="text-2xl md:text-4xl font-black text-indigo-300 truncate">{totalStockVolume.toFixed(2)} <span className="text-sm md:text-lg text-slate-500">CBM</span></p>
          </div>
          <div>
            <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-1">总库存重量 (Total Weight)</p>
            <p className="text-2xl md:text-4xl font-black text-green-300 truncate">{totalStockWeight.toFixed(2)} <span className="text-sm md:text-lg text-slate-500">KG</span></p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
           <span>{stockCargo.length} 票散货</span>
           <span>•</span>
           <span>{stockBags.length} 个集包袋</span>
           <span>•</span>
           <span>{unbaggedParcels.length} 个待包小件</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Widget 2: Containers (Sorted by ETA) */}
         <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden order-2 md:order-1">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Ship className="text-blue-600" size={18}/> 货柜 (Containers)
              </h3>
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-bold">{sortedContainers.length} Active</span>
            </div>
            <div className="p-0 overflow-x-auto max-h-64 overflow-y-auto">
              {sortedContainers.length > 0 ? (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">货柜号</th>
                      <th className="px-4 py-3">ETA (到港)</th>
                      <th className="px-4 py-3">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedContainers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                         <td className="px-4 py-3">
                            <div className="font-bold text-slate-700">{c.containerNumber || '(Unassigned)'}</div>
                            {c.sequenceNumber && <div className="text-xs text-slate-400">Seq: {c.sequenceNumber}</div>}
                         </td>
                         <td className="px-4 py-3 font-mono text-orange-600">
                           {c.eta ? (
                             <div className="flex items-center gap-1"><Clock size={14}/> {c.eta}</div>
                           ) : <span className="text-slate-300">-</span>}
                         </td>
                         <td className="px-4 py-3">
                           <span className={`px-2 py-1 rounded text-xs font-bold ${
                             c.status === 'PLANNING' ? 'bg-yellow-100 text-yellow-700' :
                             c.status === 'IN_TRANSIT' ? 'bg-indigo-100 text-indigo-700' :
                             'bg-green-100 text-green-700'
                           }`}>{c.status}</span>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400">暂无货柜记录</div>
              )}
            </div>
         </div>

         {/* Stats Cards Small - Split by Type */}
         <div className="grid grid-cols-2 md:grid-cols-1 gap-4 order-1 md:order-2">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-2 text-slate-500 mb-1">
                <Package size={18} className="text-indigo-500" />
                <span className="text-xs md:text-sm font-medium">待包快递 (Courier)</span>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{courierPendingCount}</p>
              <p className="text-xs text-slate-400">Pending Bags</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-2 text-slate-500 mb-1">
                <Box size={18} className="text-blue-500" />
                <span className="text-xs md:text-sm font-medium">待装散货 (Cargo)</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{cargoPendingCount}</p>
              <p className="text-xs text-slate-400">Warehouse Floor</p>
            </div>
         </div>
      </div>

      {/* AI Insight Card */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={100} />
        </div>
        <div className="flex items-start space-x-3 relative z-10">
          <div className="bg-white p-2 rounded-full shadow-sm">
            <Sparkles className="text-indigo-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-indigo-900">Gemini 每日洞察</h3>
            <p className="text-indigo-700 mt-1 text-sm leading-relaxed">
              {loadingReport ? (
                <span className="animate-pulse">正在分析物流数据...</span>
              ) : (
                aiReport
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Chart: Intake Comparison */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">揽收数据观察 (Intake Split)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataIntake}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 12}} />
            <YAxis tick={{fontSize: 12}} />
            <Tooltip 
              cursor={{fill: 'transparent'}} 
              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
