import React, { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { TAILOR_PARTNERS } from '../data/catalogData';
import { OrderLifecycleStage, OrderRecord } from '../types';
import { getNextValidStage, validateOrderTransition } from '../utils/matchingRules';

interface PartnerPortalPageProps {
  orders: OrderRecord[];
  onAdvanceOrderStage: (orderId: string, nextStage: OrderLifecycleStage) => void;
  onNotifyToast: (msg: string) => void;
}

export const PartnerPortalPage: React.FC<PartnerPortalPageProps> = ({
  orders,
  onAdvanceOrderStage,
  onNotifyToast,
}) => {
  const [tab, setTab] = useState<'tailor' | 'register' | 'admin'>('tailor');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('Alkapur Township, Manikonda');
  const [specialty, setSpecialty] = useState("Women's Blouses & Maggam Work");
  const [registered, setRegistered] = useState(false);

  const handlePartnerRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || !phone.trim()) {
      onNotifyToast('Please complete shop name, master tailor name, and phone.');
      return;
    }
    setRegistered(true);
    onNotifyToast(`Partner application for ${shopName} submitted! Free pilot onboarding activated.`);
  };

  const getNextStage = (current: OrderLifecycleStage): OrderLifecycleStage | null =>
    getNextValidStage(current);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-7">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
            <Briefcase className="w-3.5 h-3.5" />
            TAILERING PARTNER &amp; OPERATIONS HUB
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#0B1F3A] font-serif-accent">
            Tailor Partner &amp; Marketplace Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Manage Hyderabad locality bookings, quotation approvals, weekly payouts, and pilot KPIs.
          </p>
        </div>

        <div className="inline-flex items-center bg-[#F1F5F9] border border-[#E2E8F0] p-1 rounded-xl self-start">
          {(
            [
              { id: 'tailor', label: 'Tailor Orders' },
              { id: 'register', label: 'Partner Registration' },
              { id: 'admin', label: 'Admin KPIs' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-[#0B1F3A] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0B1F3A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'tailor' && (
        <div className="space-y-6">
          {/* Tailor KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Active Orders
              </p>
              <p className="text-2xl font-extrabold text-[#0B1F3A] mt-1 tabular-nums">
                {orders.filter((o) => o.stage !== 'Delivered').length}
              </p>
              <p className="text-[11px] text-[#0B7285] font-semibold mt-0.5">
                Alkapur–Manikonda Zone
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Weekly Settlement
              </p>
              <p className="text-2xl font-extrabold text-[#0B7285] mt-1 tabular-nums">₹18,450</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">Direct bank payout every Friday</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Acceptance Rate
              </p>
              <p className="text-2xl font-extrabold text-[#0B1F3A] mt-1 tabular-nums">92%</p>
              <p className="text-[11px] text-[#059669] font-semibold mt-0.5">Pilot Target: &gt;70%</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Verified Rating
              </p>
              <p className="text-2xl font-extrabold text-[#0B1F3A] mt-1 tabular-nums flex items-center gap-1">
                4.9 <Star className="w-5 h-5 fill-[#C8922A] text-[#C8922A]" />
              </p>
              <p className="text-[11px] text-[#64748B] mt-0.5">418 completed garments</p>
            </div>
          </div>

          {/* Live Order Lifecycle Manager */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
              <h2 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
                Order Workflow &amp; Status Transitions
              </h2>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Stitching unlocks only after customer quote approval
              </span>
            </div>

            <div className="space-y-3">
              {orders.map((ord) => {
                const next = getNextStage(ord.stage);
                const ruleCheck = next ? validateOrderTransition(ord, next) : null;
                const blockedByQuote = ruleCheck !== null && !ruleCheck.allowed;
                return (
                  <div
                    key={ord.id}
                    className="rounded-xl border border-[#E2E8F0] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F8FAFC]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-extrabold text-[#0B7285] tabular-nums">{ord.id}</span>
                        <span className="text-[#CBD5E1]">·</span>
                        <span className="text-[11px] font-bold bg-[#F0F9FA] border border-[#CBE7EC] text-[#0B7285] px-2 py-0.5 rounded-md">
                          {ord.stage}
                        </span>
                        <span className="text-[11px] text-[#64748B]">Due {ord.deliveryDate}</span>
                      </div>
                      <p className="text-sm font-bold text-[#0B1F3A] mt-1">{ord.serviceTitle}</p>
                      <p className="text-xs text-[#475569]">{ord.itemsSummary}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-extrabold text-[#0B1F3A] tabular-nums">
                        ₹{ord.amount.toLocaleString('en-IN')}
                      </span>
                      {next ? (
                        <button
                          type="button"
                          disabled={blockedByQuote}
                          onClick={() => onAdvanceOrderStage(ord.id, next)}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
                            blockedByQuote
                              ? 'bg-[#E2E8F0] text-[#64748B] cursor-not-allowed'
                              : 'bg-[#0B1F3A] hover:bg-[#15325B] text-white cursor-pointer'
                          }`}
                        >
                          {blockedByQuote ? 'Awaiting Customer Quote Approval' : `Move to: ${next}`}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#059669]">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'register' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-sm">
          {registered ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] text-[#059669] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[#0B1F3A] font-serif-accent">
                Welcome to the Tailering Partner Network
              </h2>
              <p className="text-sm text-[#475569]">
                Our Hyderabad onboarding executive will visit{' '}
                <strong className="text-[#0B1F3A]">{shopName}</strong> in{' '}
                <strong className="text-[#0B1F3A]">{zone}</strong> within 24 hours for KYC
                verification &amp; portfolio photography.
              </p>
              <button
                type="button"
                onClick={() => setTab('tailor')}
                className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Open Tailor Order Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handlePartnerRegister} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#0B1F3A] font-serif-accent">
                  Register Your Boutique or Tailoring Atelier
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Complimentary registration during the Hyderabad pilot · Accept only the orders
                  that fit your capacity.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Boutique / Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Sri Sai Designer Boutique"
                    className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Master Tailor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    WhatsApp / Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                    className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                    Hyderabad Locality
                  </label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                  Primary Specialty
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                >
                  <option>Women&apos;s Blouses &amp; Maggam Work</option>
                  <option>Kurtis, Salwar &amp; Lehengas</option>
                  <option>Men&apos;s Suits, Shirts &amp; Sherwanis</option>
                  <option>Express Alterations &amp; Saree Finishing</option>
                  <option>Institutional &amp; School Uniforms</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Submit Partner Application (Free Pilot)
              </button>
            </form>
          )}
        </div>
      )}

      {tab === 'admin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Verified Tailors
                </span>
                <Users className="w-4 h-4 text-[#0B7285]" />
              </div>
              <p className="text-2xl font-extrabold text-[#0B1F3A] mt-1 tabular-nums">29 / 30</p>
              <p className="text-[11px] text-[#059669] font-semibold">Pilot Target: 20 Active</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  On-Time Delivery
                </span>
                <TrendingUp className="w-4 h-4 text-[#059669]" />
              </div>
              <p className="text-2xl font-extrabold text-[#0B1F3A] mt-1 tabular-nums">91.4%</p>
              <p className="text-[11px] text-[#64748B]">Target Gate: &gt;85%</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Commission Tier
                </span>
                <Wallet className="w-4 h-4 text-[#C8922A]" />
              </div>
              <p className="text-2xl font-extrabold text-[#0B1F3A] mt-1 tabular-nums">14.0%</p>
              <p className="text-[11px] text-[#64748B]">Range: 12–15% completed value</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pilot Zone</span>
                <MapPin className="w-4 h-4 text-[#0B7285]" />
              </div>
              <p className="text-lg font-extrabold text-[#0B1F3A] mt-1">Manikonda 5km</p>
              <p className="text-[11px] text-[#059669] font-semibold">Alkapur Pilot Active</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs">
            <h2 className="text-base font-bold text-[#0B1F3A] font-serif-accent mb-4">
              Verified Hyderabad Tailor Network
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10.5px] tracking-wider">
                    <th className="py-2.5 pr-4">Boutique / Partner</th>
                    <th className="py-2.5 pr-4">Locality</th>
                    <th className="py-2.5 pr-4">Completed</th>
                    <th className="py-2.5 pr-4">Rating</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {TAILOR_PARTNERS.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-[#0B1F3A]">{p.shopName}</p>
                        <p className="text-[11px] text-[#64748B]">{p.masterTailor}</p>
                      </td>
                      <td className="py-3 pr-4 text-[#475569]">{p.locality}</td>
                      <td className="py-3 pr-4 font-bold text-[#0B1F3A] tabular-nums">
                        {p.completedOrders}
                      </td>
                      <td className="py-3 pr-4 font-bold text-[#A67418] tabular-nums">
                        {p.rating} ★
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
