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

interface PartnerPortalPageProps {
  orders: OrderRecord[];
  onAdvanceOrderStage: (orderId: string, nextStage: OrderLifecycleStage) => void;
  onNotifyToast: (msg: string) => void;
}

const STAGE_SEQUENCE: OrderLifecycleStage[] = [
  'Booking Created',
  'Tailor Accepted',
  'Visit Scheduled',
  'Measurements Completed',
  'Quotation Submitted',
  'Customer Approved',
  'Stitching Started',
  'Quality Check',
  'Ready for Delivery',
  'Delivered',
];

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

  const getNextStage = (current: OrderLifecycleStage): OrderLifecycleStage | null => {
    const idx = STAGE_SEQUENCE.indexOf(current);
    if (idx === -1 || idx >= STAGE_SEQUENCE.length - 1) return null;
    return STAGE_SEQUENCE[idx + 1];
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-7">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#EA580C] bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1 rounded-full">
            <Briefcase className="w-3.5 h-3.5" />
            STITCHMATE PARTNER &amp; OPERATIONS HUB
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
            Tailor Partner &amp; Marketplace Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
            Manage Hyderabad locality bookings, quotation approvals, weekly payouts, and pilot KPIs.
          </p>
        </div>

        <div className="inline-flex items-center bg-[#F5EFE8] p-1 rounded-xl self-start">
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
                  ? 'bg-white text-[#EA580C] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
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
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4">
              <p className="text-[11px] font-bold text-[#78716C] uppercase">Active Orders</p>
              <p className="text-2xl font-extrabold text-[#1C1917] mt-1 tabular-nums">
                {orders.filter((o) => o.stage !== 'Delivered').length}
              </p>
              <p className="text-[11px] text-[#059669] font-semibold mt-0.5">Alkapur–Manikonda Zone</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4">
              <p className="text-[11px] font-bold text-[#78716C] uppercase">Weekly Settlement</p>
              <p className="text-2xl font-extrabold text-[#EA580C] mt-1 tabular-nums">₹18,450</p>
              <p className="text-[11px] text-[#78716C] mt-0.5">Direct bank payout every Friday</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4">
              <p className="text-[11px] font-bold text-[#78716C] uppercase">Acceptance Rate</p>
              <p className="text-2xl font-extrabold text-[#1C1917] mt-1 tabular-nums">92%</p>
              <p className="text-[11px] text-[#059669] font-semibold mt-0.5">Pilot Target: &gt;70%</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4">
              <p className="text-[11px] font-bold text-[#78716C] uppercase">Verified Rating</p>
              <p className="text-2xl font-extrabold text-[#1C1917] mt-1 tabular-nums flex items-center gap-1">
                4.9 <Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
              </p>
              <p className="text-[11px] text-[#78716C] mt-0.5">418 completed garments</p>
            </div>
          </div>

          {/* Live Order Lifecycle Manager */}
          <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#1C1917]">
                Order Workflow &amp; Status Transitions
              </h2>
              <span className="text-[11px] font-semibold text-[#78716C]">
                Stitching unlocks only after customer quote approval
              </span>
            </div>

            <div className="space-y-3">
              {orders.map((ord) => {
                const next = getNextStage(ord.stage);
                const blockedByQuote =
                  ord.stage === 'Quotation Submitted' && !ord.quoteApproved;
                return (
                  <div
                    key={ord.id}
                    className="rounded-xl border border-[#EFE6DC] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FDFBF9]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold text-[#EA580C] tabular-nums">
                          {ord.id}
                        </span>
                        <span className="text-[10.5px] font-bold bg-[#FFF7ED] text-[#9A3412] px-2.5 py-0.5 rounded-full">
                          {ord.stage}
                        </span>
                        <span className="text-[11px] text-[#78716C]">Due {ord.deliveryDate}</span>
                      </div>
                      <p className="text-sm font-bold text-[#1C1917] mt-1">{ord.serviceTitle}</p>
                      <p className="text-xs text-[#57534E]">{ord.itemsSummary}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-extrabold text-[#1C1917] tabular-nums">
                        ₹{ord.amount.toLocaleString('en-IN')}
                      </span>
                      {next ? (
                        <button
                          type="button"
                          disabled={blockedByQuote}
                          onClick={() => onAdvanceOrderStage(ord.id, next)}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
                            blockedByQuote
                              ? 'bg-[#F5F5F4] text-[#A8A29E] cursor-not-allowed'
                              : 'bg-[#EA580C] hover:bg-[#C2410C] text-white cursor-pointer'
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
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#EFE6DC] p-6 sm:p-8 shadow-sm">
          {registered ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-14 h-14 rounded-full bg-[#ECFDF5] text-[#16A34A] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-[#1C1917]">
                Welcome to StitchMate Partner Network!
              </h2>
              <p className="text-sm text-[#57534E]">
                Our Hyderabad onboarding executive will visit <strong>{shopName}</strong> in{' '}
                <strong>{zone}</strong> within 24 hours for KYC verification &amp; portfolio photography.
              </p>
              <button
                type="button"
                onClick={() => setTab('tailor')}
                className="bg-[#EA580C] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
              >
                Open Tailor Order Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handlePartnerRegister} className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#1C1917]">
                  Register Your Boutique or Tailoring Shop
                </h2>
                <p className="text-xs text-[#78716C] mt-1">
                  Free registration during Hyderabad pilot · Accept only the orders that fit your
                  capacity.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                    Boutique / Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Sri Sai Designer Boutique"
                    className="w-full border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                    Master Tailor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                    WhatsApp / Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                    className="w-full border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                    Hyderabad Locality
                  </label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                  Primary Specialty
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#EA580C]"
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
                className="w-full bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm cursor-pointer"
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
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4">
              <div className="flex items-center justify-between text-[#78716C]">
                <span className="text-[11px] font-bold uppercase">Verified Tailors</span>
                <Users className="w-4 h-4 text-[#EA580C]" />
              </div>
              <p className="text-2xl font-extrabold text-[#1C1917] mt-1 tabular-nums">29 / 30</p>
              <p className="text-[11px] text-[#059669] font-semibold">Pilot Target: 20 Active</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4">
              <div className="flex items-center justify-between text-[#78716C]">
                <span className="text-[11px] font-bold uppercase">On-Time Delivery</span>
                <TrendingUp className="w-4 h-4 text-[#059669]" />
              </div>
              <p className="text-2xl font-extrabold text-[#1C1917] mt-1 tabular-nums">91.4%</p>
              <p className="text-[11px] text-[#78716C]">Target Gate: &gt;85%</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4">
              <div className="flex items-center justify-between text-[#78716C]">
                <span className="text-[11px] font-bold uppercase">Commission Tier</span>
                <Wallet className="w-4 h-4 text-[#7C3AED]" />
              </div>
              <p className="text-2xl font-extrabold text-[#1C1917] mt-1 tabular-nums">14.0%</p>
              <p className="text-[11px] text-[#78716C]">Range: 12–15% completed value</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4">
              <div className="flex items-center justify-between text-[#78716C]">
                <span className="text-[11px] font-bold uppercase">Pilot Zone</span>
                <MapPin className="w-4 h-4 text-[#EA580C]" />
              </div>
              <p className="text-lg font-extrabold text-[#1C1917] mt-1">Manikonda 5km</p>
              <p className="text-[11px] text-[#059669] font-semibold">Alkapur Pilot Active</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-[#1C1917] mb-4">
              Verified Hyderabad Tailor Network
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE6DC] text-[#78716C] uppercase text-[10.5px]">
                    <th className="py-2.5 pr-4">Boutique / Partner</th>
                    <th className="py-2.5 pr-4">Locality</th>
                    <th className="py-2.5 pr-4">Completed</th>
                    <th className="py-2.5 pr-4">Rating</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE8]">
                  {TAILOR_PARTNERS.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-[#1C1917]">{p.shopName}</p>
                        <p className="text-[11px] text-[#78716C]">{p.masterTailor}</p>
                      </td>
                      <td className="py-3 pr-4 text-[#57534E]">{p.locality}</td>
                      <td className="py-3 pr-4 font-bold tabular-nums">{p.completedOrders}</td>
                      <td className="py-3 pr-4 font-bold tabular-nums">{p.rating} ★</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full">
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
