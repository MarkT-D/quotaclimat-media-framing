"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  CartesianGrid, Legend, Cell,
} from "recharts";
import { getOutletStats, FRAMES, STAGES } from "@/lib/mockData";

const OUTLET_PALETTE = [
  "#C8392B", "#2D6A4F", "#52B788", "#F09595", "#7C3AED",
  "#D4A017", "#0ea5e9", "#1B4332", "#791F1F", "#84cc16",
  "#e11d48", "#0284c7", "#EF9F27", "#7c3aed", "#059669",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 shadow text-xs" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
      <p className="font-medium mb-1" style={{ color: "var(--t1)" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function NewspapersPage() {
  const allStats = getOutletStats().filter((o) => o.articleCount > 0);
  const [selected, setSelected] = useState<string[]>(allStats.slice(0, 5).map((o) => o.id));

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const filtered = allStats.filter((o) => selected.includes(o.id));

  // Data for grouped bar — articles + misinfo per outlet
  const volumeData = filtered.map((o) => ({
    name: o.name,
    Articles: o.articleCount,
    "Misinfo %": Math.round(o.avgMisinfoScore * 100),
    "Solution Rate": o.solutionRate,
  }));

  // Frame distribution comparison
  const frameCompData = FRAMES.map((frame) => {
    const entry: Record<string, string | number> = { frame: frame.split(" ")[0] };
    filtered.forEach((o) => {
      entry[o.name] = o.frameDist[frame] ?? 0;
    });
    return entry;
  });

  // Stage distribution comparison
  const stageCompData = STAGES.map((stage) => {
    const entry: Record<string, string | number> = { stage };
    filtered.forEach((o) => {
      entry[o.name] = o.stageDist[stage] ?? 0;
    });
    return entry;
  });

  // Radar data: each outlet has a radar profile
  const radarData = STAGES.map((s) => {
    const entry: Record<string, string | number> = { axis: s };
    filtered.forEach((o) => {
      entry[o.name] = o.stageDist[s] ?? 0;
    });
    return entry;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Newspapers</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Compare outlet-level coverage patterns, framing, and misinformation risk
        </p>
      </div>

      {/* Outlet selector */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-700 mb-3">Select Outlets to Compare</h2>
        <div className="flex flex-wrap gap-2">
          {allStats.map((o, i) => (
            <button
              key={o.id}
              onClick={() => toggle(o.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selected.includes(o.id)
                  ? "border-transparent text-white"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
              }`}
              style={selected.includes(o.id) ? { background: OUTLET_PALETTE[i % OUTLET_PALETTE.length] } : {}}
            >
              {o.name}
              <span className="ml-1.5 opacity-70">{o.articleCount}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-neutral-400 text-center py-12">Select at least one outlet above.</p>
      )}

      {filtered.length > 0 && (
        <>
          {/* Summary table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-700">Outlet Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-400 bg-neutral-50">
                    <th className="text-left px-5 py-2.5 font-medium">Outlet</th>
                    <th className="text-left px-4 py-2.5 font-medium">Country</th>
                    <th className="text-left px-4 py-2.5 font-medium">Type</th>
                    <th className="text-right px-4 py-2.5 font-medium">Articles</th>
                    <th className="text-right px-4 py-2.5 font-medium">Avg Misinfo</th>
                    <th className="text-right px-5 py-2.5 font-medium">Solution Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filtered.map((o, i) => (
                    <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-neutral-800 flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: OUTLET_PALETTE[allStats.indexOf(o) % OUTLET_PALETTE.length] }}
                        />
                        {o.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{o.country}</td>
                      <td className="px-4 py-3 text-neutral-500">{o.type}</td>
                      <td className="px-4 py-3 text-right text-neutral-700">{o.articleCount}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${
                            o.avgMisinfoScore < 0.2
                              ? "text-emerald-600"
                              : o.avgMisinfoScore < 0.4
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {Math.round(o.avgMisinfoScore * 100)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-neutral-700">{o.solutionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Volume + Misinfo bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <h2 className="text-sm font-semibold text-neutral-700 mb-1">Article Volume</h2>
              <p className="text-xs text-neutral-400 mb-4">Total articles per outlet, 2024</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={volumeData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Articles" radius={[3, 3, 0, 0]}>
                    {filtered.map((o) => {
                      const idx = allStats.indexOf(o);
                      return <Cell key={o.id} fill={OUTLET_PALETTE[idx % OUTLET_PALETTE.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <h2 className="text-sm font-semibold text-neutral-700 mb-1">Misinformation Risk &amp; Solution Rate</h2>
              <p className="text-xs text-neutral-400 mb-4">Avg misinformation score (%) vs. solution coverage rate (%)</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={volumeData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Misinfo %" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Solution Rate" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Frame comparison */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h2 className="text-sm font-semibold text-neutral-700 mb-1">Frame Distribution by Outlet</h2>
            <p className="text-xs text-neutral-400 mb-4">
              Number of articles per Semetko &amp; Valkenburg frame, per selected outlet
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={frameCompData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="frame" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {filtered.map((o, i) => {
                  const idx = allStats.indexOf(o);
                  return (
                    <Bar
                      key={o.id}
                      dataKey={o.name}
                      fill={OUTLET_PALETTE[idx % OUTLET_PALETTE.length]}
                      radius={[2, 2, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar: stage profile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <h2 className="text-sm font-semibold text-neutral-700 mb-1">Outlet Stage Profile</h2>
              <p className="text-xs text-neutral-400 mb-4">
                Radar shows coverage balance across Entman's causal-chain stages
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  {filtered.map((o, i) => {
                    const idx = allStats.indexOf(o);
                    return (
                      <Radar
                        key={o.id}
                        name={o.name}
                        dataKey={o.name}
                        stroke={OUTLET_PALETTE[idx % OUTLET_PALETTE.length]}
                        fill={OUTLET_PALETTE[idx % OUTLET_PALETTE.length]}
                        fillOpacity={0.15}
                      />
                    );
                  })}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <h2 className="text-sm font-semibold text-neutral-700 mb-1">Stage Breakdown</h2>
              <p className="text-xs text-neutral-400 mb-4">
                Stacked bar: how each outlet distributes coverage across causal-chain stages
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stageCompData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {filtered.map((o, i) => {
                    const idx = allStats.indexOf(o);
                    return (
                      <Bar
                        key={o.id}
                        dataKey={o.name}
                        stackId="a"
                        fill={OUTLET_PALETTE[idx % OUTLET_PALETTE.length]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
