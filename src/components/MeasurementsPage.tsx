import React, { useState } from 'react';
import {
  CheckCircle2,
  Home,
  Lock,
  Plus,
  Ruler,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { MeasurementProfile, PageRoute } from '../types';

interface MeasurementsPageProps {
  profiles: MeasurementProfile[];
  onAddProfile: (profile: MeasurementProfile) => void;
  onDeleteProfile: (id: string) => void;
  onToggleConsent: (id: string) => void;
  onNavigate: (page: PageRoute) => void;
  onNotifyToast: (msg: string) => void;
}

export const MeasurementsPage: React.FC<MeasurementsPageProps> = ({
  profiles,
  onAddProfile,
  onDeleteProfile,
  onToggleConsent,
  onNavigate,
  onNotifyToast,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [label, setLabel] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [garmentType, setGarmentType] = useState<MeasurementProfile['garmentType']>('Blouse');
  const [chestBust, setChestBust] = useState('36.0 in');
  const [waist, setWaist] = useState('30.0 in');
  const [lengthVal, setLengthVal] = useState('14.5 in');
  const [shoulder, setShoulder] = useState('14.5 in');
  const [consentChecked, setConsentChecked] = useState(true);

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !ownerName.trim()) {
      onNotifyToast('Please enter a profile name and wearer name.');
      return;
    }

    const newProfile: MeasurementProfile = {
      id: `meas-${Date.now()}`,
      label: label.trim(),
      garmentType,
      ownerName: ownerName.trim(),
      updatedAt: '21 Nov 2026',
      consentSaved: consentChecked,
      measuredBy: 'Self-Entered (Verify at Next Visit)',
      values: {
        'Chest / Bust': chestBust,
        Waist: waist,
        Length: lengthVal,
        Shoulder: shoulder,
      },
    };

    onAddProfile(newProfile);
    setShowAddForm(false);
    setLabel('');
    setOwnerName('');
    onNotifyToast('Measurement profile securely saved!');
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
            <Ruler className="w-3.5 h-3.5" />
            TAILERING DIGITAL FIT VAULT
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#0B1F3A] font-serif-accent">
            Saved Measurements
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Reuse verified tailor measurements for faster repeat orders — private and shared only
            with your assigned tailor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 bg-white border border-[#CBD5E1] hover:border-[#0B7285] text-[#0B1F3A] text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 text-[#0B7285]" />
            Add Measurement Profile
          </button>
          <button
            type="button"
            onClick={() => onNavigate('custom-stitching')}
            className="inline-flex items-center gap-1.5 bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4 text-[#5EEAD4]" />
            Book Free Home Measurement
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-[#F0F9FA] border border-[#CBE7EC] rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#0B7285] shrink-0 mt-0.5" />
        <div className="text-xs text-[#334155] leading-relaxed">
          <strong className="text-[#0B1F3A]">Privacy-First Measurement Access:</strong> Your body
          measurements are stored strictly with your explicit consent and remain invisible to
          unassigned tailors. You can revoke consent or delete any profile anytime.
        </div>
      </div>

      {/* Add Measurement Inline Form */}
      {showAddForm && (
        <form
          onSubmit={handleSaveNew}
          className="bg-white rounded-2xl border border-[#0B7285]/40 p-5 sm:p-6 shadow-sm space-y-4"
        >
          <h2 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
            New Measurement Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Profile Label (e.g. Festive Silk Blouse)"
              className="bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
            />
            <input
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Wearer Full Name"
              className="bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
            />
            <select
              value={garmentType}
              onChange={(e) =>
                setGarmentType(e.target.value as MeasurementProfile['garmentType'])
              }
              className="bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
            >
              <option value="Blouse">Blouse</option>
              <option value="Kurti / Salwar">Kurti / Salwar</option>
              <option value="Men Shirt / Kurta">Men Shirt / Kurta</option>
              <option value="Trousers / Bottom">Trousers / Bottom</option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Chest / Bust
              </label>
              <input
                type="text"
                value={chestBust}
                onChange={(e) => setChestBust(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Waist
              </label>
              <input
                type="text"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Garment Length
              </label>
              <input
                type="text"
                value={lengthVal}
                onChange={(e) => setLengthVal(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Shoulder
              </label>
              <input
                type="text"
                value={shoulder}
                onChange={(e) => setShoulder(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#334155]">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="accent-[#0B7285]"
            />
            I consent to securely save this measurement profile for repeat Tailering bookings.
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
            >
              Save Profile
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0B1F3A] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Saved Profiles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {profiles.map((prof) => (
          <div
            key={prof.id}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0B7285]">
                  {prof.garmentType}
                </span>
                <h3 className="text-base font-bold text-[#0B1F3A] mt-0.5 font-serif-accent">
                  {prof.label}
                </h3>
                <p className="text-xs text-[#64748B] inline-flex items-center gap-1.5 mt-1">
                  <User className="w-3.5 h-3.5" />
                  {prof.ownerName} · Updated {prof.updatedAt}
                </p>
              </div>

              <button
                type="button"
                aria-label="Delete profile"
                onClick={() => onDeleteProfile(prof.id)}
                className="p-2 rounded-lg text-[#94A3B8] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(prof.values).map(([k, v]) => (
                <div key={k} className="bg-[#F8FAFC] rounded-xl p-2.5 border border-[#E2E8F0]">
                  <p className="text-[10px] font-semibold text-[#64748B] truncate">{k}</p>
                  <p className="text-xs font-extrabold text-[#0B1F3A] mt-0.5 tabular-nums">{v}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[#475569]">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                {prof.measuredBy}
              </span>

              <button
                type="button"
                onClick={() => onToggleConsent(prof.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  prof.consentSaved
                    ? 'bg-[#ECFDF5] text-[#059669]'
                    : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {prof.consentSaved ? 'Reuse Enabled' : 'Reuse Paused'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
