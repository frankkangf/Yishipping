
import React, { useState } from 'react';
import { Customer, SalesRepresentative, Staff } from '../types';
import { Search, UserPlus, Phone, MapPin, Edit2, Trash2, User, Save, X, Briefcase, Plus } from 'lucide-react';

interface CustomerRegistryProps {
  customers: Customer[];
  staff: Staff[];
  salesReps: SalesRepresentative[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onAddSalesRep: (rep: SalesRepresentative) => void;
  onDeleteSalesRep: (id: string) => void;
  currentUser: Staff;
}

const CustomerRegistry: React.FC<CustomerRegistryProps> = ({ 
  customers, staff, salesReps, onAddCustomer, onUpdateCustomer, onDeleteCustomer, onAddSalesRep, onDeleteSalesRep, currentUser 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showRepSettings, setShowRepSettings] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Customer Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    address: '',
    salesRepId: ''
  });

  // Rep Form State
  const [newRepName, setNewRepName] = useState('');
  const [newRepPrefix, setNewRepPrefix] = useState('');

  const generateCustomerId = (repId: string): string => {
    const rep = salesReps.find(r => r.id === repId);
    if (!rep) return 'TEMP000';
    
    const prefix = rep.prefix;
    const existingIds = customers
      .filter(c => c.id.startsWith(prefix))
      .map(c => parseInt(c.id.replace(prefix, ''), 10) || 0);
    
    const maxSeq = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Update Mode
      const existing = customers.find(c => c.id === editingId);
      if (existing) {
        onUpdateCustomer({
          ...existing,
          name: formData.name || existing.name,
          phone: formData.phone || existing.phone,
          address: formData.address || existing.address,
          // salesRepId typically doesn't change to preserve ID integrity, but we allow it if needed, logic might need to be stricter
          salesRepId: formData.salesRepId || existing.salesRepId,
        });
      }
    } else {
      // Create Mode
      if (!formData.salesRepId) return;
      const newId = generateCustomerId(formData.salesRepId);
      
      const newCustomer: Customer = {
        id: newId,
        name: formData.name!,
        phone: formData.phone!,
        address: formData.address || '',
        salesRepId: formData.salesRepId,
        totalParcels: 0,
      };
      onAddCustomer(newCustomer);
    }

    resetCustomerForm();
  };

  const handleAddRep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepName || !newRepPrefix) return;
    const newRep: SalesRepresentative = {
      id: `REP-${Date.now()}`,
      name: newRepName,
      prefix: newRepPrefix.toUpperCase()
    };
    onAddSalesRep(newRep);
    setNewRepName('');
    setNewRepPrefix('');
  };

  const handleEdit = (c: Customer) => {
    setEditingId(c.id);
    setFormData({
      name: c.name,
      phone: c.phone,
      address: c.address,
      salesRepId: c.salesRepId
    });
    setShowCustomerForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('您确定要删除这位客户吗?')) {
      onDeleteCustomer(id);
    }
  };

  const resetCustomerForm = () => {
    setShowCustomerForm(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', address: '', salesRepId: '' });
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800">客户管理 (Customer Management)</h2>
          <div className="flex gap-2">
            <button 
               onClick={() => setShowRepSettings(!showRepSettings)}
               className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-2"
            >
              <Briefcase size={16} /> 销售代表设置
            </button>
            <button 
              onClick={() => { resetCustomerForm(); setShowCustomerForm(true); }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              <UserPlus size={16} /> 新建客户
            </button>
          </div>
        </div>

        {/* Sales Rep Settings Panel */}
        {showRepSettings && (
          <div className="bg-slate-50 border-b border-slate-200 p-6 animate-fade-in">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase size={18}/> 管理销售代表 (Sales Representatives)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">添加新代表</h4>
                   <form onSubmit={handleAddRep} className="flex gap-2 items-end">
                      <div>
                         <label className="block text-xs mb-1">姓名</label>
                         <input required value={newRepName} onChange={e => setNewRepName(e.target.value)} className="p-2 border rounded text-sm w-32" placeholder="Alex"/>
                      </div>
                      <div>
                         <label className="block text-xs mb-1">ID 前缀 (3字)</label>
                         <input required maxLength={3} value={newRepPrefix} onChange={e => setNewRepPrefix(e.target.value)} className="p-2 border rounded text-sm w-20 uppercase font-mono" placeholder="YAL"/>
                      </div>
                      <button type="submit" className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"><Plus size={16}/></button>
                   </form>
                </div>
                <div>
                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">现有代表列表</h4>
                   <div className="flex flex-wrap gap-2">
                      {salesReps.map(rep => (
                        <div key={rep.id} className="bg-white border border-slate-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                           <span className="font-bold text-indigo-700">{rep.prefix}</span>
                           <span>{rep.name}</span>
                           <button onClick={() => onDeleteSalesRep(rep.id)} className="text-slate-400 hover:text-red-500 ml-1"><X size={12}/></button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Customer Creation/Edit Form */}
        {showCustomerForm && (
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-indigo-900">{editingId ? '编辑客户' : '注册新客户'}</h3>
              <button onClick={resetCustomerForm}><X size={20} className="text-indigo-400 hover:text-indigo-700"/></button>
            </div>
            <form onSubmit={handleSubmitCustomer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-indigo-900 mb-1">销售代表 (Sales Rep)</label>
                <select 
                  required 
                  value={formData.salesRepId} 
                  onChange={e => setFormData({...formData, salesRepId: e.target.value})} 
                  className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                  disabled={!!editingId} // Prevent changing rep on edit to keep ID consistent
                >
                  <option value="">-- 选择代表 --</option>
                  {salesReps.map(rep => (
                    <option key={rep.id} value={rep.id}>{rep.name} ({rep.prefix})</option>
                  ))}
                </select>
              </div>
              <div>
                 <label className="block text-xs font-semibold text-indigo-900 mb-1">全名</label>
                 <input 
                   required 
                   value={formData.name} 
                   onChange={e => setFormData({...formData, name: e.target.value})} 
                   className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500" 
                   placeholder="例如: 张三"
                 />
              </div>
              <div>
                 <label className="block text-xs font-semibold text-indigo-900 mb-1">电话</label>
                 <input 
                   required 
                   value={formData.phone} 
                   onChange={e => setFormData({...formData, phone: e.target.value})} 
                   className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                   placeholder="例如: 13800000000"
                 />
              </div>
              <div>
                 <label className="block text-xs font-semibold text-indigo-900 mb-1">地址</label>
                 <input 
                   value={formData.address} 
                   onChange={e => setFormData({...formData, address: e.target.value})} 
                   className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                   placeholder="城市, 区域"
                 />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded shadow-sm hover:bg-indigo-700 text-sm font-medium flex items-center justify-center gap-2">
                  <Save size={14}/> 保存
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        <div className="overflow-x-auto">
          <div className="px-4 py-2">
             <div className="relative w-64">
                <input 
                  type="text" 
                  placeholder="搜索客户..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-full"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
             </div>
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">客户 ID</th>
                <th className="px-6 py-4">姓名</th>
                <th className="px-6 py-4">联系方式</th>
                <th className="px-6 py-4">销售代表</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const rep = salesReps.find(r => r.id === c.salesRepId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-mono font-medium text-indigo-600">{c.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-slate-400"/>
                        {c.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1"><Phone size={12}/> {c.phone}</span>
                        {c.address && <span className="flex items-center gap-1 text-slate-400 text-xs"><MapPin size={12}/> {c.address}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {rep ? `${rep.name} (${rep.prefix})` : '未知'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(c)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="编辑">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerRegistry;
