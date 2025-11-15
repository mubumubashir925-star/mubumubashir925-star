// Updated import React, { useState, useEffect, useMemo } from 'react';
import { Book, Users, ClipboardList, Plus, X, Search, BookOpen, Download, Upload, Home } from 'lucide-react';

interface Book { id: string; bookName: string; author: string; price: number; isAvailable: boolean; }
interface Member { id: string; name: string; admissionNumber: string; }
interface Loan { id: string; bookId: string; memberId: string; bookTitle: string; memberName: string; loanDate: string; returnDate?: string; }

const useLocalStorage = <T,>(key: string, initial: T): [T, (v: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initial;
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
};

export default function App() {
  const [books, setBooks] = useLocalStorage<Book[]>('books', []);
  const [members, setMembers] = useLocalStorage<Member[]>('members', []);
  const [loans, setLoans] = useLocalStorage<Loan[]>('loans', []);
  const [view, setView] = useState('dashboard');
  const [modals, setModals] = useState({ addBook: false, addMember: false, issue: false, ret: false, impExp: false });
  const [search, setSearch] = useState('');

  const activeLoans = useMemo(() => loans.filter(l => !l.returnDate), [loans]);
  const availableBooks = useMemo(() => books.filter(b => b.isAvailable), [books]);

  const addBook = (data: Omit<Book, 'id' | 'isAvailable'>) => {
    setBooks(prev => [...prev, { ...data, id: Date.now().toString(), isAvailable: true }]);
  };

  const addMember = (data: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...data, id: Date.now().toString() }]);
  };

  const issueBook = (bookId: string, memberId: string) => {
    const book = books.find(b => b.id === bookId);
    const member = members.find(m => m.id === memberId);
    if (!book || !member) return;
    const loan: Loan = {
      id: Date.now().toString(),
      bookId, memberId,
      bookTitle: book.bookName,
      memberName: member.name,
      loanDate: new Date().toISOString()
    };
    setLoans(prev => [...prev, loan]);
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, isAvailable: false } : b));
  };

  const returnBook = (loanId: string, bookId: string) => {
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, returnDate: new Date().toISOString() } : l));
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, isAvailable: true } : b));
  };

  const exportData = () => {
    const data = { books, members, loans };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.books) setBooks(data.books);
        if (data.members) setMembers(data.members);
        if (data.loans) setLoans(data.loans);
        alert('Data imported!');
      } catch { alert('Invalid file'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold">Salsabeel Library</h1>
          <nav className="flex gap-1 text-sm">
            {['dashboard', 'books', 'members', 'loans'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg ${view === v ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                {v === 'dashboard' ? 'Home' : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {view === 'dashboard' && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat title="Books" value={books.length} icon={Book} color="border-blue-600" />
            <Stat title="Available" value={availableBooks.length} icon={BookOpen} color="border-green-600" />
            <Stat title="On Loan" value={activeLoans.length} icon={ClipboardList} color="border-orange-600" />
            <Stat title="Members" value={members.length} icon={Users} color="border-teal-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setView('books')} className="p-3 bg-blue-600 text-white rounded-lg text-sm">Manage Books</button>
            <button onClick={() => setModals({ ...modals, impExp: true })} className="p-3 bg-purple-600 text-white rounded-lg text-sm">Import/Export</button>
          </div>
        </div>
      )}

      {view === 'books' && <BooksView books={books} search={search} setSearch={setSearch} onAdd={() => setModals({ ...modals, addBook: true })} />}
      {view === 'members' && <MembersView members={members} onAdd={() => setModals({ ...modals, addMember: true })} />}
      {view === 'loans' && <LoansView loans={loans} books={books} members={members} activeLoans={activeLoans} onIssue={() => setModals({ ...modals, issue: true })} onReturn={() => setModals({ ...modals, ret: true })} />}

      <AddBookModal isOpen={modals.addBook} onClose={() => setModals({ ...modals, addBook: false })} addBook={addBook} />
      <AddMemberModal isOpen={modals.addMember} onClose={() => setModals({ ...modals, addMember: false })} addMember={addMember} />
      <IssueModal isOpen={modals.issue} onClose={() => setModals({ ...modals, issue: false })} books={availableBooks} members={members} issueBook={issueBook} />
      <ReturnModal isOpen={modals.ret} onClose={() => setModals({ ...modals, ret: false })} loans={activeLoans} returnBook={returnBook} />
      <ImportExportModal isOpen={modals.impExp} onClose={() => setModals({ ...modals, impExp: false })} exportData={exportData} importData={importData} />
    </div>
  );
}

const Stat = ({ title, value, icon: Icon, color }: any) => (
  <div className={`bg-white p-3 rounded-lg shadow border-t-4 ${color} text-center`}>
    <Icon className="w-6 h-6 mx-auto mb-1 text-gray-700" />
    <p className="text-xs text-gray-600">{title}</p>
    <p className="text-lg font-bold">{value}</p>
  </div>
);

const BooksView = ({ books, search, setSearch, onAdd }: any) => {
  const filtered = books.filter((b: Book) => b.bookName.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <input type="text" placeholder="Search books..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
        <button onClick={onAdd} className="bg-blue-600 text-white p-2 rounded-lg"><Plus className="w-5 h-5" /></button>
      </div>
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Author</th><th className="p-2 text-left">Price</th><th className="p-2 text-left">Status</th></tr>
          </thead>
          <tbody>
            {filtered.map((b: Book) => (
              <tr key={b.id}>
                <td className="p-2">{b.bookName}</td>
                <td className="p-2">{b.author}</td>
                <td className="p-2">₹{b.price}</td>
                <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${b.isAvailable ? 'bg-green-100' : 'bg-red-100'}`}>{b.isAvailable ? 'Available' : 'On Loan'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-2">
        {filtered.map((b: Book) => (
          <div key={b.id} className="p-3 bg-white border rounded-lg">
            <h3 className="font-bold text-sm">{b.bookName}</h3>
            <p className="text-xs text-gray-600">{b.author} • ₹{b.price}</p>
            <span className={`text-xs px-2 py-1 rounded ${b.isAvailable ? 'bg-green-100' : 'bg-red-100'}`}>{b.isAvailable ? 'Available' : 'On Loan'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Add MembersView, LoansView, Modals (minimal versions below)

const AddBookModal = ({ isOpen, onClose, addBook }: any) => {
  const [data, setData] = useState({ bookName: '', author: '', price: '' });
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-4 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-3">Add Book</h2>
        <input placeholder="Name" value={data.bookName} onChange={e => setData({ ...data, bookName: e.target.value })} className="w-full p-2 border mb-2 rounded" />
        <input placeholder="Author" value={data.author} onChange={e => setData({ ...data, author: e.target.value })} className="w-full p-2 border mb-2 rounded" />
        <input type="number" placeholder="Price" value={data.price} onChange={e => setData({ ...data, price: e.target.value })} className="w-full p-2 border mb-3 rounded" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-gray-300 py-2 rounded">Cancel</button>
          <button onClick={() => { addBook(data); onClose(); }} className="flex-1 bg-blue-600 text-white py-2 rounded">Add</button>
        </div>
      </div>
    </div>
  );
};

// Add other modals similarly (AddMemberModal, IssueModal, ReturnModal, ImportExportModal)
