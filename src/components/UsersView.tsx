import React, { useState } from 'react';
import { Users, Search, Smartphone, Mail, MessageSquare } from 'lucide-react';
import { User, Subscription } from '../types';

interface UsersViewProps {
  users: User[];
  subscriptions: Subscription[];
}

export const UsersView: React.FC<UsersViewProps> = ({ users, subscriptions }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.telegram_id && u.telegram_id.includes(q)) ||
      (u.bale_id && u.bale_id.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            مدیریت مشتریان و کاربران
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            لیست کاربران ثبت‌نامی از تلگرام و بله به همراه سابقه خرید و اطلاعات تماس
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجوی نام، تلفن، ایمیل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">شناسه</th>
                <th className="p-3.5">نام و نام خانوادگی</th>
                <th className="p-3.5">شماره موبایل</th>
                <th className="p-3.5">ایمیل گوگل / مکاتبه</th>
                <th className="p-3.5">شناسه پیام‌رسان‌ها</th>
                <th className="p-3.5">تعداد اشتراک</th>
                <th className="p-3.5">تاریخ عضویت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((user) => {
                const userSubs = subscriptions.filter((s) => s.user_id === user.id);
                return (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">#{user.id}</td>
                    <td className="p-3.5 font-semibold text-white">{user.name || 'کاربر'}</td>
                    <td className="p-3.5 text-slate-300">
                      {user.phone ? (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Smartphone className="w-3 h-3 text-slate-500" />
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {user.email ? (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {user.email}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {user.telegram_id && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            تلگرام: {user.telegram_id}
                          </span>
                        )}
                        {user.bale_id && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            بله: {user.bale_id}
                          </span>
                        )}
                        {!user.telegram_id && !user.bale_id && (
                          <span className="text-slate-600">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-bold text-[11px]">
                        {userSubs.length} اشتراک
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      {new Date(user.created_at).toLocaleDateString('fa-IR')}
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
