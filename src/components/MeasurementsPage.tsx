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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#EA580C] bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1 rounded-full">
            <Ruler className="w-3.5 h-3.5" />
            DIGITAL FIT VAULT
          </span>
          <h1 className="mt-2.5 text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
            Saved Measurements
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Reuse verified tailor measurements for faster repeat orders — private and shared only
            with your assigned tailor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 bg-white border border-[#E7DDD2] hover:border-[#EA580C] text-[#1C1917] text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#EA580C]" />
            Add Measurement Profile
          </button>
          <button
            type="button"
            onClick={() => onNavigate('custom-stitching')}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Book Free Home Measurement
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner (Business Plan Section 10.1) */}
      <div className="bg-[#FFF9F2] border border-[#F3E5D8] rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
        <div className="text-xs text-[#57534E] leading-relaxed">
          <strong className="text-[#1C1917]">Privacy-First Measurement Access:</strong> Your body
          measurements are stored strictly with your explicit consent and remain invisible to
          unassigned tailors. You can revoke consent or delete any profile anytime.
        </div>
      </div>

      {/* Add Measurement Modal/Inline Form */}
      {showAddForm && (
        <form
          onSubmit={handleSaveNew}
          className="bg-white rounded-2xl border border-[#FED7AA] p-5 sm:p-6 shadow-sm space-y-4"
        >
          <h2 className="text-base font-extrabold text-[#1C1917]">New Measurement Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Profile Label (e.g. Festive Silk Blouse)"
              className="bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#EA580C]"
            />
            <input
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Wearer Full Name"
              className="bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#EA580C]"
            />
            <select
              value={garmentType}
              onChange={(e) =>
                setGarmentType(e.target.value as MeasurementProfile['garmentType'])
              }
              className="bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#EA580C]"
            >
              <option value="Blouse">Blouse</option>
              <option value="Kurti / Salwar">Kurti / Salwar</option>
              <option value="Men Shirt / Kurta">Men Shirt / Kurta</option>
              <option value="Trousers / Bottom">Trousers / Bottom</option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10.5px] font-bold uppercase text-[#78716C] block mb-1">
                Chest / Bust
              </label>
              <input
                type="text"
                value={chestBust}
                onChange={(e) => setChestBust(e.target.value)}
                className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase text-[#78716C] block mb-1">
                Waist
              </label>
              <input
                type="text"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase text-[#78716C] block mb-1">
                Garment Length
              </label>
              <input
                type="text"
                value={lengthVal}
                onChange={(e) => setLengthVal(e.target.value)}
                className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase text-[#78716C] block mb-1">
                Shoulder
              </label>
              <input
                type="text"
                value={shoulder}
                onChange={(e) => setShoulder(e.target.value)}
                className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#44403C]">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="accent-[#EA580C]"
            />
            I consent to securely save this measurement profile for repeat StitchMate bookings.
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-[#EA580C] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
            >
              Save Profile
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold text-[#78716C] hover:text-[#1C1917] cursor-pointer"
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
            className="bg-white rounded-2xl border border-[#EFE6DC] p-5 sm:p-6 space-y-4 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#EA580C]">
                  {prof.garmentType}
                </span>
                <h3 className="text-base font-extrabold text-[#1C1917] mt-0.5">{prof.label}</h3>
                <p className="text-xs text-[#78716C] inline-flex items-center gap-1.5 mt-1">
                  <User className="w-3.5 h-3.5" />
                  {prof.ownerName} · Updated {prof.updatedAt}
                </p>
              </div>

              <button
                type="button"
                aria-label="Delete profile"
                onClick={() => onDeleteProfile(prof.id)}
                className="p-2 rounded-lg text-[#A8A29E] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(prof.values).map(([k, v]) => (
                <div key={k} className="bg-[#FAF7F5] rounded-xl p-2.5 border border-[#F2EAE2]">
                  <p className="text-[10px] font-semibold text-[#78716C] truncate">{k}</p>
                  <p className="text-xs font-extrabold text-[#1C1917] mt-0.5 tabular-nums">{v}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#F5EFE8] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[#57534E]">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                {prof.measuredBy}
              </span>

              <button
                type="button"
                onClick={() => onToggleConsent(prof.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                  prof.consentSaved
                    ? 'bg-[#ECFDF5] text-[#059669]'
                    : 'bg-[#F5F5F4] text-[#78716C]'
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
