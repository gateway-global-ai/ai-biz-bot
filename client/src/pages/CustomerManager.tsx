import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Pencil, Trash2, RefreshCw, Search, Mail, Phone, Building, MapPin, Calendar, StickyNote } from 'lucide-react';
import type { Customer } from '@shared/schema';

export default function CustomerManager() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Customer>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    city: '',
    state: '',
    country: '',
    source: '',
    status: 'new',
    notes: '',
  });

  const { data: customers = [], isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newCustomer) => apiRequest('POST', '/api/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsCreateOpen(false);
      setNewCustomer({ name: '', email: '', phone: '', company: '', city: '', state: '', country: '', source: '', status: 'new', notes: '' });
      toast({ title: 'Customer added successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => 
      apiRequest('PATCH', `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setEditingId(null);
      setNotesDialogOpen(false);
      toast({ title: 'Customer updated successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({ title: 'Customer deleted successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const startEditing = (customer: Customer) => {
    setEditingId(customer.id);
    setEditData({ ...customer });
  };

  const saveEdit = () => {
    if (editingId && editData) {
      updateMutation.mutate({ id: editingId, data: editData });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const openNotes = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNotesDialogOpen(true);
  };

  const saveNotes = (notes: string) => {
    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data: { notes } });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">New</Badge>;
      case 'contacted': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Contacted</Badge>;
      case 'qualified': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Qualified</Badge>;
      case 'converted': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Converted</Badge>;
      case 'lost': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Lost</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Customer Manager</h1>
              <p className="text-slate-400">Lead capture, notes, and follow-up tracking</p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-600 hover:bg-cyan-500" data-testid="button-add-customer">
                <Plus className="w-4 h-4 mr-2" /> Add New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Customer/Lead</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Name *</label>
                  <Input 
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Full name"
                    className="bg-slate-800 border-slate-600"
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Email</label>
                  <Input 
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="email@example.com"
                    type="email"
                    className="bg-slate-800 border-slate-600"
                    data-testid="input-customer-email"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Phone</label>
                  <Input 
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="bg-slate-800 border-slate-600"
                    data-testid="input-customer-phone"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Company</label>
                  <Input 
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    placeholder="Company name"
                    className="bg-slate-800 border-slate-600"
                    data-testid="input-customer-company"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">City</label>
                  <Input 
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    placeholder="City"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">State/Region</label>
                  <Input 
                    value={newCustomer.state}
                    onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                    placeholder="State"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Country</label>
                  <Input 
                    value={newCustomer.country}
                    onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })}
                    placeholder="Country"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Lead Source</label>
                  <Input 
                    value={newCustomer.source}
                    onChange={(e) => setNewCustomer({ ...newCustomer, source: e.target.value })}
                    placeholder="e.g., Website, Referral"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Status</label>
                  <Select value={newCustomer.status} onValueChange={(value) => setNewCustomer({ ...newCustomer, status: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-customer-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-slate-400 mb-1 block">Notes</label>
                  <Textarea 
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                    placeholder="Add notes about this lead..."
                    className="bg-slate-800 border-slate-600"
                    rows={3}
                    data-testid="input-customer-notes"
                  />
                </div>
                <div className="col-span-2">
                  <Button 
                    onClick={() => createMutation.mutate(newCustomer)} 
                    disabled={!newCustomer.name || createMutation.isPending}
                    className="w-full bg-cyan-600 hover:bg-cyan-500"
                    data-testid="button-create-customer"
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Customer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers..."
                  className="pl-10 bg-slate-800 border-slate-600"
                  data-testid="input-search-customers"
                />
              </div>
              <Button variant="outline" onClick={() => refetch()} className="border-slate-600" data-testid="button-refresh-customers">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No customers found. Add your first lead to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Name</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Contact</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Company</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Location</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Source</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-t border-slate-800 hover:bg-slate-800/30" data-testid={`row-customer-${customer.id}`}>
                        <td className="p-4">
                          {editingId === customer.id ? (
                            <Input 
                              value={editData.name || ''} 
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="bg-slate-800 border-slate-600 h-8"
                            />
                          ) : (
                            <span className="text-white font-medium">{customer.name}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === customer.id ? (
                            <div className="space-y-1">
                              <Input 
                                value={editData.email || ''} 
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                className="bg-slate-800 border-slate-600 h-8"
                                placeholder="Email"
                              />
                              <Input 
                                value={editData.phone || ''} 
                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                className="bg-slate-800 border-slate-600 h-8"
                                placeholder="Phone"
                              />
                            </div>
                          ) : (
                            <div className="text-sm space-y-1">
                              {customer.email && (
                                <div className="flex items-center gap-1 text-slate-300">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-slate-300">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === customer.id ? (
                            <Input 
                              value={editData.company || ''} 
                              onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                              className="bg-slate-800 border-slate-600 h-8"
                            />
                          ) : (
                            customer.company && (
                              <div className="flex items-center gap-1 text-slate-300">
                                <Building className="w-3 h-3 text-slate-500" />
                                {customer.company}
                              </div>
                            )
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === customer.id ? (
                            <div className="flex gap-1">
                              <Input 
                                value={editData.city || ''} 
                                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                                className="bg-slate-800 border-slate-600 h-8 w-20"
                                placeholder="City"
                              />
                              <Input 
                                value={editData.country || ''} 
                                onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                                className="bg-slate-800 border-slate-600 h-8 w-20"
                                placeholder="Country"
                              />
                            </div>
                          ) : (
                            (customer.city || customer.country) && (
                              <div className="flex items-center gap-1 text-slate-400 text-sm">
                                <MapPin className="w-3 h-3" />
                                {[customer.city, customer.state, customer.country].filter(Boolean).join(', ')}
                              </div>
                            )
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === customer.id ? (
                            <Select 
                              value={editData.status || customer.status} 
                              onValueChange={(value) => setEditData({ ...editData, status: value })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 h-8 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="converted">Converted</SelectItem>
                                <SelectItem value="lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getStatusBadge(customer.status)
                          )}
                        </td>
                        <td className="p-4 text-slate-400 text-sm">
                          {customer.source || '-'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            {editingId === customer.id ? (
                              <>
                                <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500">
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit} className="border-slate-600">
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => openNotes(customer)}
                                  className="border-slate-600"
                                  data-testid={`button-notes-customer-${customer.id}`}
                                >
                                  <StickyNote className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => startEditing(customer)}
                                  className="border-slate-600"
                                  data-testid={`button-edit-customer-${customer.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => deleteMutation.mutate(customer.id)}
                                  className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                                  data-testid={`button-delete-customer-${customer.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-400" />
                Notes for {selectedCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Textarea 
                defaultValue={selectedCustomer?.notes || ''}
                placeholder="Add notes about this customer..."
                className="bg-slate-800 border-slate-600 min-h-[200px]"
                id="customer-notes"
                data-testid="textarea-customer-notes"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    const textarea = document.getElementById('customer-notes') as HTMLTextAreaElement;
                    saveNotes(textarea.value);
                  }}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                  data-testid="button-save-notes"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setNotesDialogOpen(false)}
                  className="border-slate-600"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
