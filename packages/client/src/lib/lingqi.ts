const lingqiNumberFormatter = new Intl.NumberFormat('zh-CN');

export function formatLingqiAmount(value: number): string {
  return lingqiNumberFormatter.format(value);
}
