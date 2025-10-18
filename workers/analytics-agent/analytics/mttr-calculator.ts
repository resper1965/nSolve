/**
 * MTTR Calculator
 * Calcula métricas de tempo de resolução de vulnerabilidades
 */

/**
 * Calcula diferença em dias entre duas datas
 */
export function calculateDaysBetween(firstSeenTimestamp: string, fixedTimestamp: string): number {
  try {
    const firstDate = new Date(firstSeenTimestamp);
    const fixedDate = new Date(fixedTimestamp);

    // Validar datas
    if (isNaN(firstDate.getTime()) || isNaN(fixedDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Verificar se fixed_date é posterior
    if (fixedDate < firstDate) {
      throw new Error('Fixed date must be after first seen date');
    }

    // Calcular diferença em milissegundos e converter para dias
    const diffInMs = fixedDate.getTime() - firstDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    return diffInDays;
  } catch (error) {
    console.error('Error calculating days between dates:', error);
    return 0;
  }
}

/**
 * Calcula diferença em horas entre duas datas
 */
export function calculateHoursBetween(firstSeenTimestamp: string, fixedTimestamp: string): number {
  try {
    const firstDate = new Date(firstSeenTimestamp);
    const fixedDate = new Date(fixedTimestamp);

    if (isNaN(firstDate.getTime()) || isNaN(fixedDate.getTime())) {
      throw new Error('Invalid date format');
    }

    if (fixedDate < firstDate) {
      throw new Error('Fixed date must be after first seen date');
    }

    const diffInMs = fixedDate.getTime() - firstDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    return diffInHours;
  } catch (error) {
    console.error('Error calculating hours between dates:', error);
    return 0;
  }
}

/**
 * Interface para resultado de achado
 */
export interface Finding {
  id: string;
  severity: string;
  created_at: string;
  updated_at: string;
  status: string;
}

/**
 * Interface para métricas MTTR
 */
export interface MTTRMetrics {
  severity: string;
  total_findings: number;
  avg_days: number;
  avg_hours: number;
  min_days: number;
  max_days: number;
}

/**
 * Calcula MTTR por severidade
 */
export function calculateMTTRBySeverity(findings: Finding[]): MTTRMetrics[] {
  const bySeverity = new Map<string, number[]>();

  // Agrupar por severidade
  for (const finding of findings) {
    if (!bySeverity.has(finding.severity)) {
      bySeverity.set(finding.severity, []);
    }
    
    const days = calculateDaysBetween(finding.created_at, finding.updated_at);
    bySeverity.get(finding.severity)!.push(days);
  }

  // Calcular métricas por severidade
  const metrics: MTTRMetrics[] = [];

  for (const [severity, days] of bySeverity.entries()) {
    if (days.length === 0) continue;

    const sum = days.reduce((a, b) => a + b, 0);
    const avg = sum / days.length;

    metrics.push({
      severity,
      total_findings: days.length,
      avg_days: Math.round(avg * 100) / 100,
      avg_hours: Math.round(avg * 24 * 100) / 100,
      min_days: Math.min(...days),
      max_days: Math.max(...days),
    });
  }

  return metrics.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.severity as keyof typeof order] || 999) - (order[b.severity as keyof typeof order] || 999);
  });
}

