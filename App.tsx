
import React, { useState, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import UnifiedIntake from './components/ParcelIntake';
import Loading from './components/Loading'; // New Component
import Inventory from './components/Inventory';
import CustomerRegistry from './components/CustomerRegistry';
import { Customer, Parcel, Staff, Bag, UserRole, Cargo, Container, SalesRepresentative } from './types';
import { LayoutDashboard, PackagePlus, Ship, Users, Settings, LogOut, Box, Search, Layers, ClipboardList, Warehouse, Eye } from 'lucide-react';

// --- MOCK DATA ---
const MOCK_STAFF: Staff[] = [
  { id: 'S1', name: '管理员用户', role: UserRole.ADMIN, prefixCode: 'HQ' },
];

const INITIAL_SALES_REPS: SalesRepresentative[] = [
  { id: 'R1', name: 'Admin', prefix: 'YAK' },
  { id: 'R2', name: 'Ale', prefix: 'YAL' },
  { id: 'R3', name: 'Josephine', prefix: 'YAJ' },
  { id: 'R4', name: 'Hayford', prefix: 'YAH' },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'YAL001', name: 'John Doe', phone: '555-0123', salesRepId: 'R2', totalParcels: 5 },
  { id: 'YAJ001', name: 'Jane Smith', phone: '555-0987', salesRepId: 'R3', totalParcels: 2 },
  { id: 'YAK001', name: '企业账户', phone: '555-9999', salesRepId: 'R1', totalParcels: 100 },
];

const App: React.FC = () => {
  // Navigation State: 'consolidation' replaced by 'loading'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'intake' | 'inventory' | 'loading' | 'customers' | 'settings'>('dashboard');
  const [currentUser] = useState<Staff>(MOCK_STAFF[0]);

  // Central State
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [salesReps, setSalesReps] = useState<SalesRepresentative[]>(INITIAL_SALES_REPS);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [cargo, setCargo] = useState<Cargo[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Inventory Navigation State
  const [inventoryInitItem, setInventoryInitItem] = useState<{ type: 'PARCEL' | 'CARGO', data: any } | null>(null);

  // State Modifiers
  const addParcel = (p: Parcel) => {
    setParcels(prev => [p, ...prev]);
    setCustomers(prev => prev.map(c => c.id === p.customerId ? { ...c, totalParcels: c.totalParcels + 1 } : c));
  };
  const updateParcel = (p: Parcel) => setParcels(prev => prev.map(prevP => prevP.id === p.id ? p : prevP));

  const addBag = (b: Bag) => setBags(prev => [b, ...prev]);
  const updateBag = (b: Bag) => setBags(prev => prev.map(prevB => prevB.id === b.id ? b : prevB));

  const addCustomer = (c: Customer) => setCustomers(prev => [...prev, c]);
  const updateCustomer = (c: Customer) => setCustomers(prev => prev.map(x => x.id === c.id ? c : x));
  const deleteCustomer = (id: string) => setCustomers(prev => prev.filter(x => x.id !== id));

  const addSalesRep = (r: SalesRepresentative) => setSalesReps(prev => [...prev, r]);
  const deleteSalesRep = (id: string) => setSalesReps(prev => prev.filter(r => r.id !== id));

  const addContainer = (c: Container) => setContainers(prev => [c, ...prev]);
  const updateContainer = (c: Container) => setContainers(prev => prev.map(x => x.id === c.id ? c : x));
  
  const addCargo = (c: Cargo) => setCargo(prev => [c, ...prev]);
  const updateCargo = (c: Cargo) => setCargo(prev => prev.map(x => x.id === c.id ? c : x));

  // --- SEARCH LOGIC ---
  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const lowerQ = searchQuery.toLowerCase();
    
    // Find customers matching ID or Name
    const matchedCustomers = customers.filter(c => c.id.toLowerCase().includes(lowerQ) || c.name.toLowerCase().includes(lowerQ));
    const customerIds = matchedCustomers.map(c => c.id);

    // Find items belonging to those customers OR matching query directly
    const foundParcels = parcels.filter(p => customerIds.includes(p.customerId) || p.trackingNumber.toLowerCase().includes(lowerQ));
    const foundCargo = cargo.filter(c => customerIds.includes(c.customerId) || c.id.toLowerCase().includes(lowerQ) || c.commodity.toLowerCase().includes(lowerQ));
    const foundBags = bags.filter(b => b.bagNumber.toLowerCase().includes(lowerQ) || b.id.toLowerCase().includes(lowerQ));
    const foundContainers = containers.filter(c => c.containerNumber?.toLowerCase().includes(lowerQ));

    return { matchedCustomers, foundParcels, foundCargo, foundBags, foundContainers };
  }, [searchQuery, customers, parcels, cargo, bags, containers]);

  const handleViewItem = (item: any, type: 'PARCEL' | 'CARGO') => {
      setSearchQuery(''); // Close search
      setActiveTab('inventory');
      setInventoryInitItem({ type, data: item });
  };

  // Nav Item Component
  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => { setActiveTab(id); setSearchQuery(''); }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 w-full ${
        activeTab === id 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium hidden md:block">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <aside className="bg-slate-900 text-white w-full md:w-64 flex-shrink-0 flex flex-col h-auto md:h-screen sticky top-0 z-50">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="bg-indigo-500 p-2 rounded-lg">
            <Box size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">LogiSmart AI</h1>
            <p className="text-xs text-slate-400">物流操作系统</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavItem id="dashboard" icon={LayoutDashboard} label="仪表盘 (Overview)" />
          <NavItem id="intake" icon={ClipboardList} label="入库揽收 (Intake)" />
          <NavItem id="inventory" icon={Warehouse} label="库存管理 (Inventory)" />
          <NavItem id="loading" icon={Ship} label="装柜管理 (Loading)" />
          <NavItem id="customers" icon={Users} label="客户管理 (Customers)" />
          <div className="pt-6 mt-6 border-t border-slate-800">
            <NavItem id="settings" icon={Settings} label="设置" />
          </div>
        </nav>

        <div className="p-4 bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
            </div>
            <button className="ml-auto text-slate-400 hover:text-white"><LogOut size={18}/></button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 bg-slate-50">
        <div className="max-w-7xl mx-auto h-full">
          <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-black text-slate-800 capitalize w-full md:w-auto tracking-tight">
              {activeTab === 'dashboard' ? '仪表盘 Overview' : 
               activeTab === 'intake' ? '统一揽收 Intake' :
               activeTab === 'inventory' ? '库存与合并 Inventory' :
               activeTab === 'loading' ? '装柜管理 Loading' :
               activeTab === 'customers' ? '客户管理 Customers' : '设置 Settings'}
            </h2>

            {/* Global Search Bar */}
            <div className="relative w-full md:w-96">
               <input
                 type="text"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search ID, Name, Container..."
                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow hover:shadow-md"
               />
               <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
               {searchQuery && (
                 <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold">Clear</button>
               )}
            </div>
          </header>

          <div className="animate-fade-in-up">
            {searchQuery && searchResults ? (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-700">搜索结果 "{searchQuery}"</h3>
                
                {/* Customers */}
                {searchResults.matchedCustomers.length > 0 && (
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-indigo-900 mb-3 uppercase text-xs">Customers</h4>
                    {searchResults.matchedCustomers.map(c => (
                      <div key={c.id} className="flex justify-between p-2 border-b border-slate-100 last:border-0">
                        <div>
                          <span className="font-bold text-indigo-600">{c.id}</span>
                          <span className="ml-2 font-medium">{c.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Parcels */}
                {searchResults.foundParcels.length > 0 && (
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-indigo-900 mb-3 uppercase text-xs">Parcels</h4>
                     {searchResults.foundParcels.map(p => (
                       <button 
                         key={p.id} 
                         onClick={() => handleViewItem(p, 'PARCEL')}
                         className="w-full flex justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-left"
                       >
                         <div>
                           <span className="font-mono text-xs bg-slate-100 px-1 rounded">{p.trackingNumber}</span>
                           <span className="ml-2 text-sm font-medium">{p.description}</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded">{p.status}</span>
                             <Eye size={16} className="text-indigo-400"/>
                         </div>
                       </button>
                     ))}
                  </div>
                )}

                {/* Cargo */}
                {searchResults.foundCargo.length > 0 && (
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-indigo-900 mb-3 uppercase text-xs">General Cargo</h4>
                     {searchResults.foundCargo.map(c => (
                       <button
                         key={c.id}
                         onClick={() => handleViewItem(c, 'CARGO')}
                         className="w-full flex justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-left"
                       >
                         <div>
                           <span className="font-medium text-sm">{c.commodity}</span>
                           <div className="text-xs text-slate-500">{c.pieces} pcs • {c.volume} CBM</div>
                         </div>
                         <div className="text-right flex items-center gap-2">
                           <span className="text-xs font-bold block">{c.status}</span>
                           <Eye size={16} className="text-indigo-400"/>
                         </div>
                       </button>
                     ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && <Dashboard parcels={parcels} bags={bags} cargo={cargo} containers={containers} />}
                
                {activeTab === 'intake' && (
                  <UnifiedIntake 
                    customers={customers} 
                    parcels={parcels}
                    cargo={cargo}
                    salesReps={salesReps}
                    onAddParcel={addParcel}
                    onAddCargo={addCargo}
                  />
                )}
                
                {activeTab === 'inventory' && (
                   <Inventory 
                     parcels={parcels}
                     cargo={cargo}
                     bags={bags}
                     customers={customers}
                     onUpdateParcel={updateParcel}
                     onUpdateCargo={updateCargo}
                     onCreateBag={addBag}
                     onUpdateBag={updateBag}
                     initialSelectedItem={inventoryInitItem}
                   />
                )}
                
                {activeTab === 'loading' && (
                  <Loading 
                    bags={bags}
                    cargo={cargo}
                    containers={containers}
                    customers={customers}
                    onAddContainer={addContainer}
                    onUpdateContainer={updateContainer}
                    onUpdateBag={updateBag}
                    onUpdateCargo={updateCargo}
                  />
                )}
                
                {activeTab === 'customers' && (
                  <CustomerRegistry 
                    customers={customers}
                    staff={MOCK_STAFF}
                    salesReps={salesReps}
                    onAddCustomer={addCustomer}
                    onUpdateCustomer={updateCustomer}
                    onDeleteCustomer={deleteCustomer}
                    onAddSalesRep={addSalesRep}
                    onDeleteSalesRep={deleteSalesRep}
                    currentUser={currentUser}
                  />
                )}
                
                {activeTab === 'settings' && (
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500">
                    <Settings size={48} className="mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-slate-800">设置 (Settings)</h3>
                    <p>System Version 3.2 - Intelligent Logistics</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
