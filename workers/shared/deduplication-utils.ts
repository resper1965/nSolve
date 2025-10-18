/**
 * n.Solve - Deduplication Utilities
 * Cross-Tool Deduplication inspirado no DefectDojo
 */

import { Severity } from './types';

/**
 * Generate Cross-Tool Hash (SHA-256)
 * Inspirado no DefectDojo para deduplicação entre ferramentas
 * 
 * @param title - Título normalizado da vulnerabilidade
 * @param severity - Severidade normalizada (CRITICAL, HIGH, MEDIUM, LOW)
 * @param assetId - ID do ativo
 * @returns Hash SHA-256 para deduplicação cross-tool
 */
export async function generateCrossToolHash(
  title: string,
  severity: Severity | string,
  assetId: string
): Promise<string> {
  // Normalizar inputs
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedSeverity = severity.toUpperCase();
  const normalizedAssetId = assetId.toLowerCase().trim();
  
  // Concatenar valores normalizados
  const data = `${normalizedTitle}|${normalizedSeverity}|${normalizedAssetId}`;
  
  // Calcular SHA-256
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Converter para hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Generate Correlation Key (SHA-256)
 * Para deduplicação tradicional (location-based)
 * 
 * @param vulnerabilityType - Tipo da vulnerabilidade
 * @param url - URL ou localização
 * @param parameter - Parâmetro afetado
 * @returns Hash SHA-256 para correlation_key
 */
export async function generateCorrelationKey(
  vulnerabilityType: string,
  url: string,
  parameter: string
): Promise<string> {
  const data = `${vulnerabilityType}|${url}|${parameter}`.toLowerCase();
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize Severity
 * Converte diferentes formatos de severidade para o padrão n.Solve
 * 
 * @param severity - Severidade no formato da ferramenta
 * @returns Severidade normalizada
 */
export function normalizeSeverity(severity: string): Severity {
  const normalized = severity.toLowerCase().trim();
  
  switch (normalized) {
    case 'critical':
    case 'very high':
    case '5':
    case 'p1':
      return 'CRITICAL';
    
    case 'high':
    case '4':
    case 'p2':
      return 'HIGH';
    
    case 'medium':
    case 'moderate':
    case '3':
    case 'p3':
      return 'MEDIUM';
    
    case 'low':
    case '2':
    case 'p4':
      return 'LOW';
    
    case 'info':
    case 'informational':
    case '1':
    case 'p5':
      return 'INFO';
    
    default:
      return 'MEDIUM'; // Default fallback
  }
}

/**
 * Normalize Title
 * Remove caracteres especiais e normaliza espaços
 * 
 * @param title - Título original
 * @returns Título normalizado
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '');
}

/**
 * Extract Source Tool ID
 * Extrai o ID original da ferramenta do payload
 * 
 * @param payload - Payload da ferramenta
 * @param toolName - Nome da ferramenta
 * @returns ID original ou null
 */
export function extractSourceToolId(payload: any, toolName: string): string | null {
  switch (toolName.toLowerCase()) {
    case 'wazuh':
      return payload.alert_id || payload.id || null;
    
    case 'defectdojo':
      return payload.finding_id || payload.id || null;
    
    case 'nessus':
      return payload.plugin_id || payload.id || null;
    
    case 'pentest-tools':
    case 'zap':
    case 'owasp-zap':
      return payload.id || payload.finding_id || null;
    
    default:
      return payload.id || null;
  }
}

/**
 * Deduplication Strategy
 * Define a estratégia de deduplicação baseada na ferramenta
 */
export enum DeduplicationStrategy {
  SOURCE_TOOL_ID = 'SOURCE_TOOL_ID',     // Busca por ID da ferramenta
  CROSS_TOOL_HASH = 'CROSS_TOOL_HASH',   // Busca por hash cross-tool
  CORRELATION_KEY = 'CORRELATION_KEY',   // Busca por correlation_key (location)
  HYBRID = 'HYBRID',                     // Combinação de estratégias
}

/**
 * Get Deduplication Strategy
 * Determina a estratégia ideal baseada na ferramenta
 * 
 * @param toolName - Nome da ferramenta
 * @returns Estratégia de deduplicação
 */
export function getDeduplicationStrategy(toolName: string): DeduplicationStrategy {
  const tool = toolName.toLowerCase();
  
  // Ferramentas com IDs estáveis usam SOURCE_TOOL_ID
  if (['wazuh', 'defectdojo', 'nessus'].includes(tool)) {
    return DeduplicationStrategy.SOURCE_TOOL_ID;
  }
  
  // Ferramentas DAST usam CORRELATION_KEY (location-based)
  if (['zap', 'owasp-zap', 'burp', 'arachni'].includes(tool)) {
    return DeduplicationStrategy.CORRELATION_KEY;
  }
  
  // Ferramentas genéricas usam CROSS_TOOL_HASH
  if (['pentest-tools', 'generic', 'manual'].includes(tool)) {
    return DeduplicationStrategy.CROSS_TOOL_HASH;
  }
  
  // Default: HYBRID (tenta todas as estratégias)
  return DeduplicationStrategy.HYBRID;
}

