import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { convertCurrency, ASSET_TYPE_LABELS, formatCurrencyFull } from "@/lib/currencies";
import { ChevronRight } from "lucide-react";

const COLORS = [
  'hsl(160, 84%, 39%)', 'hsl(217, 91%, 60%)', 'hsl(47, 96%, 53%)',
  'hsl(280, 65%, 60%)', 'hsl(12, 76%, 61%)', 'hsl(340, 75%, 55%)', 'hsl(190, 70%, 50%)'
];

const DIM_OPACITY = 0.15;

export default function AllocationChartCard({ investments, displayCurrency, groupBy, title, hidden }) {
  const [valueMode, setValueMode] = useState('current');
  const [selected, setSelected] = useState(null); // key of selected segment

  const labels = groupBy === "asset_type"
    ? ASSET_TYPE_LABELS
    : { india: 'India 🇮🇳', us: 'US 🇺🇸', uae: 'UAE 🇦🇪' };

  const grouped = investments.reduce((acc, inv) => {
    const key = groupBy === "asset_type" ? inv.asset_type : inv.market;
    const val = valueMode === 'current'
      ? convertCurrency(inv.current_value || 0, inv.original_currency, displayCurrency)
      : convertCurrency(inv.invested_amount || 0, inv.original_currency, displayCurrency);
    if (!acc[key]) acc[key] = { value: 0, key };
    acc[key].value += val;
    return acc;
  }, {});

  const data = Object.entries(grouped)
    .map(([key, d]) => ({ key, name: labels[key] || key, value: d.value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);
  const selectedItem = selected ? data.find(d => d.key === selected) : null;

  const handleSegmentClick = (entry) => {
    setSelected(prev => prev === entry.key ? null : entry.key);
  };

  if (data.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-36 text-muted-foreground text-sm">
            No investments to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
          <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
            <Button
              variant={valueMode === 'current' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setValueMode('current')}
              className="h-6 px-2 text-xs rounded-md"
            >
              Current
            </Button>
            <Button
              variant={valueMode === 'invested' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setValueMode('invested')}
              className="h-6 px-2 text-xs rounded-md"
            >
              Invested
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Pie Chart — no tooltip, click to select */}
          <div className="w-36 h-36 flex-shrink-0 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  onClick={(entry) => handleSegmentClick(entry)}
                >
                  {data.map((item, i) => (
                    <Cell
                      key={item.key}
                      fill={COLORS[i % COLORS.length]}
                      opacity={selected && selected !== item.key ? DIM_OPACITY : 1}
                      style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1.5">
            {selected && selectedItem ? (
            // Selected state — show just the selected item with value + back arrow
            <div>
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground mb-2 hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              All
            </button>
            {data.map((item, i) => {
              const isActive = item.key === selected;
              return (
                <div
                  key={item.key}
                  onClick={() => handleSegmentClick(item)}
                  className={`flex items-center justify-between text-sm cursor-pointer rounded-lg px-2 py-1 transition-colors ${isActive ? 'bg-muted/60' : 'opacity-30'}`}
                >
                  <div className="flex items-center gap-2">
                    {isActive && <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />}
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{item.name}</span>
                  </div>
                  {isActive && (
                    <div className="text-right">
                      <div className="font-semibold text-xs text-foreground">{hidden ? '••••' : formatCurrencyFull(item.value, displayCurrency)}</div>
                      <div className="text-xs text-muted-foreground">{hidden ? '••%' : `${total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%`}</div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
            ) : (
            // Default — all items with percentage
            data.map((item, i) => (
            <div
              key={item.key}
              onClick={() => handleSegmentClick(item)}
              className="flex items-center justify-between text-sm cursor-pointer rounded-lg px-2 py-0.5 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground text-xs">{item.name}</span>
              </div>
              <span className="font-medium text-xs">{hidden ? '•••' : `${total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%`}</span>
            </div>
            ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
