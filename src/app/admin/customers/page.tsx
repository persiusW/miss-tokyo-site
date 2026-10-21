"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { toast } from "@/lib/toast";
import { X, Search, Plus, Download, Filter, Trash2, Upload, FileUp } from "lucide-react";
import Papa from "papaparse";



// The real columns of public.contacts. This page used to read and write
// first_name, email_subscribed and others that the table doesn't have, so
// every add and import failed.
type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  source: string;
  subscribed_status: boolean;
  created_at: string;
};

const joinParts = (...parts: (string | null)[]) => parts.map(p => (p ?? "").trim()).filter(Boolean).join(" ");

/** Which of these emails (lower-cased) are already contacts. contacts has no unique email index. */
async function existingEmails(supabase: ReturnType<typeof createClient>, emails: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data, error } = await supabase.from("contacts").select("email").in("email", emails.slice(i, i + 200));
    if (error) throw error;
    for (const r of data ?? []) found.add(String(r.email).toLowerCase());
  }
  return found;
}



export default function AdminCustomers() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
      setSelected(new Set());
    } catch (err: any) {
      console.error("[admin/customers] load failed", err);
      toast.error("Couldn't load customers. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = contacts.filter(c =>
    (c.name?.toLowerCase().includes(search.toLowerCase()) || false) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => {
    if (selected.size === filteredContacts.length && filteredContacts.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const savePromise = async () => {
        const email = addForm.email.trim().toLowerCase();
        if ((await existingEmails(supabase, [email])).has(email)) return false;
        // Added by hand: nobody has agreed to marketing email yet.
        const { error } = await supabase.from("contacts").insert([{
            name: joinParts(addForm.firstName, addForm.lastName),
            email,
            phone: addForm.phone.trim() || null,
            source: "manual",
            subscribed_status: false,
        }]);
        if (error) throw error;
        return true;
    };

    savePromise().then((added) => {
      if (!added) { toast.error("That email is already in your customers."); return; }
      toast.success('Client added to atelier files.');
      setShowAddModal(false);
      setAddForm({ firstName: "", lastName: "", email: "", phone: "" });
      fetchContacts();
    }).catch((err) => {
      console.error("[admin/customers] save failed", err);
      toast.error("That didn't save. Please try again.");
    }).finally(() => {
      setSaving(false);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        importCustomerCSV(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const importCustomerCSV = (file: File) => {
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        
        const mapped = rows.map(row => {
          const findVal = (keys: string[]) => {
              const matchedKey = Object.keys(row).find(k => 
                keys.some(search => k.toLowerCase().trim() === search.toLowerCase())
              );
              const val = matchedKey ? row[matchedKey] : null;
              // Rule 2: Strict Nulls
              if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return null;
              return val;
          };

          const parseBool = (keys: string[]) => {
              const val = findVal(keys);
              if (!val) return false;
              const s = String(val).toLowerCase();
              return ["true", "subscribed", "yes", "1", "y"].includes(s);
          };

          const email = findVal(["Email", "email", "e-mail"]);
          if (!email || !String(email).includes("@")) return null;

          // Same headers as before, mapped onto the columns contacts really has.
          const str = (keys: string[]) => { const v = findVal(keys); return v == null ? null : String(v); };
          return {
            email: String(email).toLowerCase().trim(),
            name: str(["Name", "Full Name", "name"]) ?? joinParts(str(["First Name", "first_name"]), str(["Last Name", "last_name"])),
            phone: str(["Phone", "phone_number", "Mobile"]),
            address: joinParts(str(["Address 1", "Street"]), str(["Address 2"]), str(["Region", "State"]), str(["Country", "country_code"])) || null,
            subscribed_status: parseBool(["Email Subscription", "email_subscribed", "Subscribed"]),
            source: "imported",
          };
        }).filter((r): r is NonNullable<typeof r> => r !== null);

        if (mapped.length === 0) {
          toast.error("No valid customer records found. Ensure the 'Email' header is present.");
          setImporting(false);
          return;
        }

        // One row per email: skip repeats in the file and people already here.
        const importPromise = async () => {
            const seen = new Set<string>();
            const unique = mapped.filter(r => !seen.has(r.email) && seen.add(r.email));
            const already = await existingEmails(supabase, unique.map(r => r.email));
            const fresh = unique.filter(r => !already.has(r.email));
            for (let i = 0; i < fresh.length; i += 500) {
                const { error } = await supabase.from("contacts").insert(fresh.slice(i, i + 500));
                if (error) throw error;
            }
            return { added: fresh.length, skipped: mapped.length - fresh.length };
        };

        importPromise().then(({ added, skipped }) => {
          toast.success(skipped ? `Added ${added} customers. ${skipped} were already here or repeated.` : `Added ${added} customers.`);
          setShowImportModal(false);
          fetchContacts();
        }).catch((err) => {
          console.error("[admin/customers] import failed", err);
          toast.error("The import didn't save. Please try again.");
        }).finally(() => {
          setImporting(false);
        });
      },
      error: (err) => {
        console.error("[admin/customers] CSV parse failed", err);
        toast.error("That file couldn't be read. Check it's a CSV with an Email column.");
        setImporting(false);
      }
    });
  };

  const downloadCSV = () => {
    const rows = filteredContacts.filter(c => selected.size === 0 || selected.has(c.id));
    const headers = ["Name", "Email", "Phone", "Address", "Email Subscription", "Source", "Date Joined"];
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csvContent = [
      headers.join(","),
      ...rows.map(c => [
        q(c.name || ""),
        q(c.email),
        q(c.phone || ""),
        q(c.address || ""),
        q(c.subscribed_status ? "yes" : "no"),
        q(c.source || "manual"),
        `"${new Date(c.created_at).toLocaleDateString("en-GB")}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `miss-tokyo-clients-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Customers</h1>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>Unified CRM & Clientele</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowImportModal(true)} disabled={importing} className="flex items-center gap-2 border border-black text-black text-[10px] uppercase tracking-widest px-4 py-2 hover:bg-black hover:text-white transition-colors" style={{ fontFamily: "Arial, sans-serif" }}>
            <FileUp size={13} /> {importing ? "Processing..." : "Import Contacts"}
          </button>
          <button onClick={downloadCSV} className="flex items-center gap-2 border border-gray-200 text-gray-500 text-[10px] uppercase tracking-widest px-4 py-2 hover:border-black hover:text-black transition-colors" style={{ fontFamily: "Arial, sans-serif" }}>
            <Download size={13} /> Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-widest px-5 py-2.5 hover:bg-gray-900 transition-colors" style={{ fontFamily: "Arial, sans-serif" }}>
            <Plus size={13} strokeWidth={2} /> Add Contact
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-4">
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search clientele…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-100 pl-8 pr-3 py-2 text-xs outline-none focus:border-black transition-colors"
              style={{ fontFamily: "Arial, sans-serif" }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">{filteredContacts.length} found</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="pl-5 pr-3 py-3 w-10 text-left">
                  <input type="checkbox" checked={filteredContacts.length > 0 && selected.size === filteredContacts.length} onChange={toggleAll} className="cursor-pointer accent-black" />
                </th>
                {["Client", "Location", "Subscriptions", "Source", "Date Joined"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-20 text-xs text-gray-400 italic">Compiling aggregated records...</td></tr>
              ) : filteredContacts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-xs text-gray-400 italic">No records found.</td></tr>
              ) : (
                filteredContacts.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${selected.has(c.id) ? "bg-gray-50" : ""}`}>
                    <td className="pl-5 pr-3 py-4">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="cursor-pointer accent-black" />
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>
                        {c.name || ""}
                      </p>
                      <p className="text-[10px] text-gray-500">{c.email}</p>
                      {c.phone && <p className="text-[9px] text-gray-400">{c.phone}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-gray-600">{c.address || "—"}</p>
                    </td>
                    <td className="px-4 py-4">
                        <div className="flex gap-2">
                            <span className={`text-[8px] uppercase tracking-widest px-1.5 py-0.5 border ${c.subscribed_status ? 'border-black text-black' : 'border-gray-100 text-gray-300'}`}>Email</span>
                        </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-gray-100 text-gray-600" style={{ fontFamily: "Arial, sans-serif" }}>
                        {c.source || "manual"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>
                      {new Date(c.created_at).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !importing && setShowImportModal(false)} />
          <div className="relative bg-white w-full max-w-lg border border-gray-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Import Customer CSV</h2>
                    <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">Bulk synchronization with the archive</p>
                </div>
              <button onClick={() => !importing && setShowImportModal(false)} className="text-gray-400 hover:text-black transition-colors"><X size={18} /></button>
            </div>
            
            <div className="p-8 space-y-8">
                <div className="space-y-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest leading-relaxed">
                        To ensure a seamless import, please ensure your CSV file contains the following exact column headers. 
                        If you exported from Wix, update the top row of your spreadsheet to match these:
                    </p>
                    
                    <div className="border border-gray-100 rounded-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Header</th>
                                    <th className="px-4 py-2 text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Requirement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <tr>
                                    <td className="px-4 py-3 text-[11px] font-mono text-black">Email</td>
                                    <td className="px-4 py-3 text-[10px] text-gray-400 uppercase tracking-widest">Client Email (Required)</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-[11px] font-mono text-black">First Name</td>
                                    <td className="px-4 py-3 text-[10px] text-gray-400 uppercase tracking-widest">Primary Name</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-[11px] font-mono text-black">Last Name</td>
                                    <td className="px-4 py-3 text-[10px] text-gray-400 uppercase tracking-widest">Surname</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-[11px] font-mono text-black">Address 1</td>
                                    <td className="px-4 py-3 text-[10px] text-gray-400 uppercase tracking-widest">Region / State</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-[11px] font-mono text-black">Country</td>
                                    <td className="px-4 py-3 text-[10px] text-gray-400 uppercase tracking-widest">Country Code</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-[11px] font-mono text-black">Subscribed</td>
                                    <td className="px-4 py-3 text-[10px] text-gray-400 uppercase tracking-widest">"True" or "Yes" if opted-in</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="block">
                        <span className="sr-only">Choose profile file</span>
                        <div className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 hover:border-black transition-all cursor-pointer">
                            <input 
                                type="file" 
                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                accept=".csv"
                                disabled={importing}
                                onChange={handleFileUpload}
                            />
                            <div className="flex flex-col items-center space-y-2">
                                <Upload size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                                <div className="text-center">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-black">Select CSV Spreadsheet</p>
                                    <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">Click to browse or drag and drop</p>
                                </div>
                            </div>
                        </div>
                    </label>
                </div>
            </div>
            
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                    onClick={() => setShowImportModal(false)}
                    className="px-6 py-2.5 text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                >
                    Cancel
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-md border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>New Client Entry</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-black transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">First Name</label>
                    <input type="text" required value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border-b border-gray-200 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors" />
                </div>
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">Last Name</label>
                    <input type="text" required value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border-b border-gray-200 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">Email</label>
                <input type="email" required value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border-b border-gray-200 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">Phone (Optional)</label>
                <input type="tel" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border-b border-gray-200 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-black text-white text-[10px] uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors disabled:opacity-50"
                style={{ fontFamily: "Arial, sans-serif" }}>
                {saving ? "Storing Record..." : "Add to Clientele"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
