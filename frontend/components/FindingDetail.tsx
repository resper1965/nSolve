/**
 * ness. VLM Tracker - Finding Detail Component
 * Cloudflare Pages Edition
 * 
 * Componente React/TypeScript para exibir vulnerabilidades
 * Otimizado para edge computing
 */

'use client';

import { useState } from 'react';
import { useTranslation } from 'next-i18next';

// Heroicons (importados do CDN ou instalados)
const ShieldExclamationIcon = (props: any) => (
  <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const GlobeAltIcon = (props: any) => (
  <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const CodeBracketIcon = (props: any) => (
  <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);

const ClockIcon = (props: any) => (
  <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ServerIcon = (props: any) => (
  <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
  </svg>
);

const DocumentTextIcon = (props: any) => (
  <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

interface Finding {
  id: string;
  correlation_key: string;
  vulnerability_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  url_target: string;
  affected_param: string;
  description: string;
  description_translated?: string;
  recommendation: string;
  recommendation_translated?: string;
  translation_language?: string;
  tool_source: string;
  scan_timestamp: string;
  asset_name: string;
  jira_ticket_key?: string;
  status: string;
}

interface FindingDetailProps {
  finding: Finding;
}

const FindingDetail: React.FC<FindingDetailProps> = ({ finding }) => {
  const { t, i18n } = useTranslation('common');
  const [showOriginalDescription, setShowOriginalDescription] = useState(false);
  const [showOriginalRecommendation, setShowOriginalRecommendation] = useState(false);
  
  const currentLanguage = i18n.language;
  const isTranslated = !!finding.description_translated || !!finding.recommendation_translated;
  
  const getSeverityClass = (severity: string): string => {
    const map: Record<string, string> = {
      CRITICAL: 'bg-red-900/20 text-red-400 border-red-800',
      HIGH: 'bg-orange-900/20 text-orange-400 border-orange-800',
      MEDIUM: 'bg-yellow-900/20 text-yellow-400 border-yellow-800',
      LOW: 'bg-blue-900/20 text-blue-400 border-blue-800',
      INFORMATIONAL: 'bg-gray-700/20 text-gray-400 border-gray-700',
    };
    return map[severity] || map.INFORMATIONAL;
  };
  
  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(currentLanguage, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-[#111317] rounded-lg border border-[#1B2030] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getSeverityClass(finding.severity)}`}>
              <ShieldExclamationIcon className="w-5 h-5" />
              {t(`severity.${finding.severity.toLowerCase()}`)}
            </span>
            
            {finding.jira_ticket_key && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-[#00ADE8]/10 text-[#00ADE8] border border-[#00ADE8]/30">
                <DocumentTextIcon className="w-4 h-4" />
                {finding.jira_ticket_key}
              </span>
            )}
          </div>
          
          <h2 className="text-2xl font-semibold text-[#EEF1F6] mb-1 font-montserrat">
            {finding.vulnerability_type}
          </h2>
          
          <p className="text-[#9CA3AF] text-sm">{finding.asset_name}</p>
        </div>
        
        {isTranslated && (
          <div className="flex items-center gap-2 text-sm text-[#00ADE8]">
            <GlobeAltIcon className="w-5 h-5" />
            <span>{t('translated_content')}</span>
          </div>
        )}
      </div>
      
      {/* Informações Técnicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0B0C0E] rounded-lg p-4 border border-[#151820]">
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-1">
            <CodeBracketIcon className="w-4 h-4" />
            {t('url_target')}
          </div>
          <p className="text-[#EEF1F6] break-all font-mono text-sm">{finding.url_target}</p>
        </div>
        
        <div className="bg-[#0B0C0E] rounded-lg p-4 border border-[#151820]">
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-1">
            <CodeBracketIcon className="w-4 h-4" />
            {t('affected_parameter')}
          </div>
          <p className="text-[#EEF1F6] font-mono text-sm">{finding.affected_param}</p>
        </div>
        
        <div className="bg-[#0B0C0E] rounded-lg p-4 border border-[#151820]">
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-1">
            <ServerIcon className="w-4 h-4" />
            {t('tool_source')}
          </div>
          <p className="text-[#EEF1F6] text-sm">{finding.tool_source}</p>
        </div>
        
        <div className="bg-[#0B0C0E] rounded-lg p-4 border border-[#151820]">
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-1">
            <ClockIcon className="w-4 h-4" />
            {t('scan_date')}
          </div>
          <p className="text-[#EEF1F6] text-sm">{formatDate(finding.scan_timestamp)}</p>
        </div>
      </div>
      
      {/* Recomendação */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#EEF1F6] font-montserrat">{t('recommendation')}</h3>
          
          {finding.recommendation_translated && (
            <button
              onClick={() => setShowOriginalRecommendation(!showOriginalRecommendation)}
              className="text-sm text-[#00ADE8] hover:text-[#0096CC] transition-colors duration-120 flex items-center gap-1"
            >
              <GlobeAltIcon className="w-4 h-4" />
              {showOriginalRecommendation ? t('show_translated') : t('show_original')}
            </button>
          )}
        </div>
        
        <div className="bg-[#0B0C0E] rounded-lg p-4 border border-[#151820]">
          <p className="text-[#EEF1F6] leading-relaxed whitespace-pre-wrap">
            {showOriginalRecommendation || !finding.recommendation_translated
              ? finding.recommendation
              : finding.recommendation_translated}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FindingDetail;
